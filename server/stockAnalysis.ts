// Hisse AI Analizi: bir hissenin TÜM program verisini (fiyat, temel, teknik, haberler)
// toplayıp Gemini'ye bütüncül rapor hazırlatır. Yön + hedef seviyeler + riskler.
// Yatırım tavsiyesi DEĞİLDİR; raporun dilinde de bu belirtilir.

import { getGenAIClient } from './economyNewsAnalyzer.js';
import { getHistory } from './marketHistory.js';
import { getEconomyNewsForStock } from './economyNewsService.js';

const MODEL = 'gemini-3.1-flash-lite';

export interface StockAnalysisReport {
  symbol: string;
  verdict: 'YUKSELIS' | 'DUSUS' | 'NOTR';
  confidence: number; // 0-100
  score: number; // -100 (güçlü düşüş) .. +100 (güçlü yükseliş)
  summary: string;
  horizon: string;
  upside: { price: number | null; pct: number | null; reason: string };
  downside: { price: number | null; pct: number | null; reason: string };
  supports: number[];
  resistances: number[];
  trend: string;
  fundamental: string;
  technical: string;
  news: string;
  risks: string[];
  sources: string[];
  generatedAt: string;
  aiPowered: boolean;
}

interface CacheEntry {
  ts: number;
  report: StockAnalysisReport;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchTvNews(symbol: string): Promise<{ title: string; source: string; published: number }[]> {
  try {
    const url = `https://news-headlines.tradingview.com/v2/headlines?symbol=BIST:${encodeURIComponent(
      symbol.toUpperCase()
    )}&client=web&lang=tr`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const json: any = await res.json();
    return ((json.items || []) as any[]).slice(0, 10).map((n) => ({
      title: String(n.title || ''),
      source: String(n.source || n.provider || ''),
      published: Number(n.published || 0),
    }));
  } catch {
    return [];
  }
}

const n = (v: any): number | null => (typeof v === 'number' && !isNaN(v) ? v : null);
const f2 = (v: any): string => (n(v) === null ? 'yok' : (v as number).toFixed(2));
const money = (v: any): string => {
  if (n(v) === null) return 'yok';
  const x = v as number;
  const a = Math.abs(x);
  if (a >= 1e9) return (x / 1e9).toFixed(2) + ' Mr TL';
  if (a >= 1e6) return (x / 1e6).toFixed(2) + ' M TL';
  return String(Math.round(x));
};

function ruleBasedReport(stock: any, hist: any): StockAnalysisReport {
  // AI yoksa: göstergelerden basit puanlama (şeffaf, iddiasız)
  let score = 0;
  const notes: string[] = [];
  const close = Number(stock.close || 0);
  const ind = hist?.indicators;
  if (ind?.rsi14 != null) {
    if (ind.rsi14 < 30) { score += 15; notes.push('RSI aşırı satımda'); }
    else if (ind.rsi14 > 70) { score -= 15; notes.push('RSI aşırı alımda'); }
  }
  if (ind?.aboveSma50 === true) score += 10;
  if (ind?.aboveSma50 === false) score -= 10;
  if (ind?.aboveSma200 === true) score += 10;
  if (ind?.aboveSma200 === false) score -= 10;
  if (ind?.macdHist != null) score += ind.macdHist >= 0 ? 10 : -10;
  if (n(stock.netMarginTtm) != null) score += (stock.netMarginTtm as number) > 0 ? 10 : -15;
  if (n(stock.peRatio) != null && (stock.peRatio as number) > 0 && (stock.peRatio as number) < 10) score += 5;
  if (Number(stock.change || 0) > 0) score += 5; else score -= 5;
  score = Math.max(-100, Math.min(100, Math.round(score)));
  const verdict = score >= 15 ? 'YUKSELIS' : score <= -15 ? 'DUSUS' : 'NOTR';
  const r = (p: number | null, base: number): number | null =>
    p !== null && base > 0 ? base * (1 + p / 100) : null;
  return {
    symbol: stock.symbol,
    verdict,
    confidence: 40,
    score,
    summary: `Kural tabanlı ön analiz (AI kapalı): ${notes.join('; ') || 'nötr sinyaller'}. Skor ${score}/100.`,
    horizon: 'kısa vade (1-4 hafta)',
    upside: { price: r(5, close), pct: 5, reason: 'Yakın direnç bandı (basit tahmin)' },
    downside: { price: r(-5, close), pct: -5, reason: 'Yakın destek bandı (basit tahmin)' },
    supports: ind?.bbLower != null ? [ind.bbLower] : [],
    resistances: ind?.bbUpper != null ? [ind.bbUpper] : [],
    trend: ind ? `Fiyat SMA50 ${ind.aboveSma50 ? 'üstünde' : 'altında'}, SMA200 ${ind.aboveSma200 ? 'üstünde' : 'altında'}.` : 'Veri yok.',
    fundamental: stock.netIncomeTtm != null ? `Net kâr (TTM): ${money(stock.netIncomeTtm)}.` : 'Temel veri eksik.',
    technical: `RSI: ${ind?.rsi14 != null ? ind.rsi14.toFixed(1) : 'yok'}.`,
    news: 'AI kapalı olduğu için haber duyarlılığı işlenemedi.',
    risks: ['Bu basitleştirilmiş bir ön analizdir; AI kapalıyken derinlik sınırlıdır.'],
    sources: ['TradingView', 'Yahoo Finance'],
    generatedAt: new Date().toISOString(),
    aiPowered: false,
  };
}

function buildPrompt(stock: any, hist: any, tvNews: any[], ecoNews: any[]): string {
  const ind = hist?.indicators || {};
  const ret = hist?.returns || {};
  const triple = (t: any) =>
    t ? `hisse %${f2(t.stock)} / XU100 %${f2(t.bench)}` : 'yok';
  const newsLines = tvNews.map((x) => `- [TV] ${x.title} (${x.source})`).join('\n') || '(TV haberi yok)';
  const ecoLines =
    ecoNews
      .slice(0, 6)
      .map((x: any) => `- [Makro] ${x.title} | ${(x.impacts || []).map((i: any) => `${i.sector}:${i.sentiment}`).join(', ')}`)
      .join('\n') || '(ilgili makro haber yok)';
  return `Sen Borsa İstanbul hisse analistisin. Aşağıdaki GERÇEK verilerle ${stock.symbol} için bütüncül analiz yap.
FİYAT: kapanış ${f2(stock.close)} TL, günlük %${f2(stock.change)}, 52 hafta ${f2(stock.week52Low)}-${f2(stock.week52High)}, hacim ${money(stock.valueTraded)}
TEKNİK: SMA50 ${f2(ind.sma50)} (fiyat ${ind.aboveSma50 ? 'üstünde' : 'altında'}), SMA200 ${f2(ind.sma200)} (fiyat ${ind.aboveSma200 ? 'üstünde' : 'altında'}), golden-cross ${ind.goldenCross ? 'evet' : 'hayır'}, RSI(14) ${f2(ind.rsi14)}, MACD ${f2(ind.macd)}/${f2(ind.macdSignal)}, Stochastic %K ${f2(ind.stochK)}/%D ${f2(ind.stochD)}, Bollinger üst ${f2(ind.bbUpper)} orta ${f2(ind.bbMid)} alt ${f2(ind.bbLower)}, ATR ${f2(ind.atr14)}, Beta ${f2(ind.beta1y)}
GETİRİLER (hisse/XU100): 1H ${triple(ret.w1)}, 1A ${triple(ret.m1)}, 3A ${triple(ret.m3)}, 6A ${triple(ret.m6)}, YTD ${triple(ret.ytd)}, 1Y ${triple(ret.y1)}
TEMEL (TTM/FQ): satış ${money(stock.revenueTtm)}, net kâr ${money(stock.netIncomeTtm)}, net marj %${f2(stock.netMarginTtm)}, FAVÖK ${money(stock.ebitdaTtm)} (marj %${f2(stock.ebitdaMarginTtm)}), HBK ${f2(stock.epsDilutedTtm)}, özkaynak ${money(stock.totalEquityFq)}, net borç ${money(stock.netDebtFq)}, cari oran ${f2(stock.currentRatioFq)}, ROE %${f2(stock.roeFq)}, ROA %${f2(stock.roaTtm)}
ÇARPANLAR: F/K ${f2(stock.peRatio)} (yoksa şirket zarardadır), PD/DD ${f2(stock.pbRatio)}, FD/FAVÖK ${f2(stock.evEbitda)}, F/Satış ${f2(stock.priceSales)}, temettü %${f2(stock.dividendYield)}
HABERLER:
${newsLines}
${ecoLines}
SADECE şu JSON'u döndür (başka metin yok):
{"verdict":"YUKSELIS|DUSUS|NOTR","confidence":0-100,"score":-100..100,"summary":"2-3 cümle genel hüküm","horizon":"örn. kısa vade (1-4 hafta)","upside":{"price":sayı|null,"pct":sayı|null,"reason":"neden"},"downside":{"price":sayı|null,"pct":sayı|null,"reason":"neden"},"supports":[sayılar],"resistances":[sayılar],"trend":"trend cümlesi","fundamental":"2-3 cümle","technical":"2-3 cümle","news":"haberlerin yönü 2 cümle","risks":["en az 2 risk"]}
Kurallar: hedef fiyatları BB/SMA/destek-dirence dayandır, uydurma hassasiyet verme (kapanışın ±%3-15 bandında kal); veri yoksa "veri yok" de; zarar eden şirkette F/K yokluğunu normal karşıla; "kesin yükselir" dili YASAK — olasılık dili kullan ("veriler ... yönüne işaret ediyor"); son cümle hissi verme, sadece analiz.`;
}

function parseReport(raw: string, symbol: string): any | null {
  const t = (raw || '').trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try {
    const j = JSON.parse(t.slice(s, e + 1));
    if (!j || typeof j !== 'object') return null;
    return j;
  } catch {
    return null;
  }
}

export async function getStockAnalysis(stock: any, forceRefresh = false): Promise<StockAnalysisReport> {
  const key = String(stock.symbol || '').toUpperCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (!forceRefresh && hit && now - hit.ts < CACHE_TTL_MS) return hit.report;

  const [hist, tvNews, ecoNews] = await Promise.all([
    getHistory(key).catch(() => null),
    fetchTvNews(key),
    getEconomyNewsForStock(key).catch(() => []),
  ]);

  const ai = getGenAIClient();
  if (!ai) {
    const rep = ruleBasedReport(stock, hist);
    cache.set(key, { ts: now, report: rep });
    return rep;
  }

  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(stock, hist, tvNews, ecoNews as any[]),
      config: { responseMimeType: 'application/json' },
    });
    const j = parseReport(res.text || '', key);
    if (!j || !['YUKSELIS', 'DUSUS', 'NOTR'].includes(j.verdict)) throw new Error('parse');
    const numArr = (a: any): number[] =>
      Array.isArray(a) ? a.filter((x) => typeof x === 'number').slice(0, 5) : [];
    const report: StockAnalysisReport = {
      symbol: key,
      verdict: j.verdict,
      confidence: Math.max(0, Math.min(100, Number(j.confidence) || 50)),
      score: Math.max(-100, Math.min(100, Number(j.score) || 0)),
      summary: String(j.summary || ''),
      horizon: String(j.horizon || 'kısa vade'),
      upside: {
        price: n(j.upside?.price),
        pct: n(j.upside?.pct),
        reason: String(j.upside?.reason || ''),
      },
      downside: {
        price: n(j.downside?.price),
        pct: n(j.downside?.pct),
        reason: String(j.downside?.reason || ''),
      },
      supports: numArr(j.supports),
      resistances: numArr(j.resistances),
      trend: String(j.trend || ''),
      fundamental: String(j.fundamental || ''),
      technical: String(j.technical || ''),
      news: String(j.news || ''),
      risks: Array.isArray(j.risks) ? j.risks.map(String).slice(0, 6) : [],
      sources: ['TradingView (fiyat+temel+haber)', 'Yahoo Finance (teknik)', 'AI makro haberler'],
      generatedAt: new Date().toISOString(),
      aiPowered: true,
    };
    cache.set(key, { ts: now, report });
    return report;
  } catch {
    const rep = ruleBasedReport(stock, hist);
    cache.set(key, { ts: now, report: rep });
    return rep;
  }
}
