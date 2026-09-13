// Trend-dönüş taraması: RSI uyumsuzluğu + MACD + Supertrend + EMA + hacim + yapı kırılımı.
// Veriler Yahoo günlük mumlarından (ücretsiz). "3'lü teyit" mantığıyla puanlama:
// tek sinyal değil, momentum+hacim+fiyat yapısının BİRLİKTE teyidi aranır.
// Sihirli indikatör yoktur — bu motor olasılıksal sinyal listeler, garanti vermez.

import { getHistory, ema, sma, HistoryCandle } from './marketHistory.js';

export type ReversalDirection = 'bull' | 'bear' | 'both';

export interface ReversalSignal {
  key: string;
  label: string;
  detail: string;
  points: number;
}

export interface ReversalResult {
  symbol: string;
  close: number;
  lastTime: number;
  bullScore: number;
  bearScore: number;
  grade: 'GUCLU' | 'ORTA' | 'ZAYIF';
  direction: 'bull' | 'bear';
  score: number;
  signals: ReversalSignal[];
  volumeSurge: boolean;
  rsi14: number | null;
}

interface ScanCache {
  ts: number;
  results: ReversalResult[];
  scanned: number;
  skipped: number;
  ms: number;
}
const cache = new Map<string, ScanCache>();
const CACHE_TTL_MS = 60 * 60 * 1000;

// ---- Seri indikatörleri ----

function wilderRsiSeries(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let g = 0;
  let l = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) g += d;
    else l -= d;
  }
  g /= period;
  l /= period;
  out[period] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    g = (g * (period - 1) + Math.max(d, 0)) / period;
    l = (l * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

function atrSeries(candles: HistoryCandle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(
      Math.max(
        candles[i].h - candles[i].l,
        Math.abs(candles[i].h - candles[i - 1].c),
        Math.abs(candles[i].l - candles[i - 1].c)
      )
    );
  }
  let a = trs.slice(0, period).reduce((x, y) => x + y, 0) / period;
  out[period] = a;
  for (let i = period + 1; i < candles.length; i++) {
    a = (a * (period - 1) + trs[i - 1]) / period;
    out[i] = a;
  }
  return out;
}

function macdArrays(closes: number[]): { line: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const line = closes.map((_, i) =>
    e12[i] !== null && e26[i] !== null ? (e12[i] as number) - (e26[i] as number) : null
  );
  const vals: number[] = [];
  const idx: number[] = [];
  line.forEach((v, i) => {
    if (v !== null) {
      vals.push(v);
      idx.push(i);
    }
  });
  const sig = ema(vals, 9);
  const signal: (number | null)[] = new Array(closes.length).fill(null);
  idx.forEach((ci, k) => {
    signal[ci] = sig[k];
  });
  const hist = closes.map((_, i) =>
    line[i] !== null && signal[i] !== null ? (line[i] as number) - (signal[i] as number) : null
  );
  return { line, signal, hist };
}

function supertrendDir(candles: HistoryCandle[], period = 10, mult = 3): (1 | -1 | null)[] {
  const out: (1 | -1 | null)[] = new Array(candles.length).fill(null);
  const atr = atrSeries(candles, period);
  let prevUpper = 0;
  let prevLower = 0;
  let dir: 1 | -1 = -1;
  let started = false;
  for (let i = 0; i < candles.length; i++) {
    if (atr[i] === null) {
      out[i] = null;
      continue;
    }
    const hl2 = (candles[i].h + candles[i].l) / 2;
    const a = atr[i] as number;
    let upper = hl2 + mult * a;
    let lower = hl2 - mult * a;
    if (started) {
      if (upper > prevUpper && candles[i - 1].c > prevUpper) upper = prevUpper;
      if (lower < prevLower && candles[i - 1].c < prevLower) lower = prevLower;
    }
    if (!started) {
      dir = candles[i].c >= hl2 ? 1 : -1;
      started = true;
    } else if (dir === 1 && candles[i].c < lower) {
      dir = -1;
    } else if (dir === -1 && candles[i].c > upper) {
      dir = 1;
    }
    prevUpper = upper;
    prevLower = lower;
    out[i] = dir;
  }
  return out;
}

function stochSeries(candles: HistoryCandle[], period = 14): { k: (number | null)[]; d: (number | null)[] } {
  const k: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const hh = Math.max(...slice.map((x) => x.h));
    const ll = Math.min(...slice.map((x) => x.l));
    k[i] = hh === ll ? 50 : ((candles[i].c - ll) / (hh - ll)) * 100;
  }
  const kvals: number[] = [];
  const kidx: number[] = [];
  k.forEach((v, i) => {
    if (v !== null) {
      kvals.push(v);
      kidx.push(i);
    }
  });
  const dvals = sma(kvals, 3);
  const d: (number | null)[] = new Array(candles.length).fill(null);
  kidx.forEach((ci, n) => {
    d[ci] = dvals[n];
  });
  return { k, d };
}

// Fraktal salınımlar: k bar sağda+solda en uç
function pivots(candles: HistoryCandle[], k = 3): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = k; i < candles.length - k; i++) {
    let isH = true;
    let isL = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (candles[j].h >= candles[i].h) isH = false;
      if (candles[j].l <= candles[i].l) isL = false;
    }
    if (isH) highs.push(i);
    if (isL) lows.push(i);
  }
  return { highs, lows };
}

function avgVol(vols: number[], i: number, n = 20): number | null {
  if (i < n) return null;
  let s = 0;
  for (let j = i - n; j < i; j++) s += vols[j];
  return s / n;
}

function crossedUp(a: (number | null)[], b: (number | null)[], i: number, lookback: number): boolean {
  for (let j = i; j > Math.max(0, i - lookback); j--) {
    if (j < 1) break;
    if (a[j] !== null && b[j] !== null && a[j - 1] !== null && b[j - 1] !== null) {
      if ((a[j - 1] as number) <= (b[j - 1] as number) && (a[j] as number) > (b[j] as number)) return true;
    }
  }
  return false;
}

function crossedDown(a: (number | null)[], b: (number | null)[], i: number, lookback: number): boolean {
  for (let j = i; j > Math.max(0, i - lookback); j--) {
    if (j < 1) break;
    if (a[j] !== null && b[j] !== null && a[j - 1] !== null && b[j - 1] !== null) {
      if ((a[j - 1] as number) >= (b[j - 1] as number) && (a[j] as number) < (b[j] as number)) return true;
    }
  }
  return false;
}

// ---- Tek hisse analizi ----

function analyzeOne(symbol: string, candles: HistoryCandle[]): ReversalResult | null {
  if (candles.length < 215) return null; // SMA200 + pay bırakır
  const i = candles.length - 1;
  const closes = candles.map((c) => c.c);
  const vols = candles.map((c) => c.v);
  const close = closes[i];

  const rsi = wilderRsiSeries(closes, 14);
  const { line: macdL, signal: macdS, hist: macdH } = macdArrays(closes);
  const st = supertrendDir(candles, 10, 3);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const e200 = ema(closes, 200);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  const { k: stK, d: stD } = stochSeries(candles, 14);
  const { highs, lows } = pivots(candles, 3);
  const { highs: swingH, lows: swingL } = pivots(candles, 5);
  const a20 = avgVol(vols, i, 20);
  const volSurge = a20 !== null && a20 > 0 && vols[i] > a20 * 1.5;

  const bull: ReversalSignal[] = [];
  const bear: ReversalSignal[] = [];

  // 1) RSI uyumsuzluğu (en güçlü tek sinyal, 3 puan)
  const troughs = lows.filter((x) => x > i - 60 && rsi[x] !== null);
  if (troughs.length >= 2) {
    const t1 = troughs[troughs.length - 2];
    const t2 = troughs[troughs.length - 1];
    if (i - t2 <= 10 && closes[t2] < closes[t1] && (rsi[t2] as number) > (rsi[t1] as number) && (rsi[t2] as number) < 50) {
      bull.push({
        key: 'rsi-div',
        label: 'RSI Pozitif Uyumsuzluk',
        detail: `Fiyat dip ${closes[t1].toFixed(2)}→${closes[t2].toFixed(2)} (daha düşük) ama RSI ${(rsi[t1] as number).toFixed(0)}→${(rsi[t2] as number).toFixed(0)} (daha yüksek)`,
        points: 3,
      });
    }
  }
  const peaks = highs.filter((x) => x > i - 60 && rsi[x] !== null);
  if (peaks.length >= 2) {
    const p1 = peaks[peaks.length - 2];
    const p2 = peaks[peaks.length - 1];
    if (i - p2 <= 10 && closes[p2] > closes[p1] && (rsi[p2] as number) < (rsi[p1] as number) && (rsi[p2] as number) > 50) {
      bear.push({
        key: 'rsi-div',
        label: 'RSI Negatif Uyumsuzluk',
        detail: `Fiyat tepe ${closes[p1].toFixed(2)}→${closes[p2].toFixed(2)} (daha yüksek) ama RSI ${(rsi[p1] as number).toFixed(0)}→${(rsi[p2] as number).toFixed(0)} (daha düşük)`,
        points: 3,
      });
    }
  }

  // 2) MACD kesişimi (2 puan)
  if (crossedUp(macdL, macdS, i, 5) && macdH[i] !== null && (macdH[i] as number) > 0) {
    bull.push({ key: 'macd-x', label: 'MACD Yukarı Kesişim', detail: 'MACD sinyal çizgisini yukarı kesti, histogram pozitif', points: 2 });
  }
  if (crossedDown(macdL, macdS, i, 5) && macdH[i] !== null && (macdH[i] as number) < 0) {
    bear.push({ key: 'macd-x', label: 'MACD Aşağı Kesişim', detail: 'MACD sinyal çizgisini aşağı kesti, histogram negatif', points: 2 });
  }

  // 3) Supertrend yön değişimi (2 puan)
  let flipLongAt = -1;
  let flipShortAt = -1;
  for (let j = i; j > Math.max(1, i - 5); j--) {
    if (st[j] !== null && st[j - 1] !== null) {
      if (st[j - 1] === -1 && st[j] === 1) flipLongAt = j;
      if (st[j - 1] === 1 && st[j] === -1) flipShortAt = j;
    }
  }
  if (flipLongAt >= 0) bull.push({ key: 'super', label: 'Supertrend Long’a Döndü', detail: `Son ${i - flipLongAt + 1} bar içinde yön yukarı döndü`, points: 2 });
  if (flipShortAt >= 0) bear.push({ key: 'super', label: 'Supertrend Short’a Döndü', detail: `Son ${i - flipShortAt + 1} bar içinde yön aşağı döndü`, points: 2 });

  // 4) EMA kırılımı + hacim teyidi (2 puan)
  const volOk = a20 !== null && vols[i] > (a20 as number) * 1.3;
  if ((crossedUp(closes.map((c) => c as number | null), e20, i, 3) || crossedUp(closes.map((c) => c as number | null), e50, i, 3)) && volOk) {
    bull.push({ key: 'ema-break', label: 'EMA Kırılımı + Hacim', detail: `Fiyat EMA20/50'yi son 3 barda yukarı kırdı, hacim ortalamanın %${Math.round((vols[i] / (a20 as number)) * 100)}'i`, points: 2 });
  }
  if ((crossedDown(closes.map((c) => c as number | null), e20, i, 3) || crossedDown(closes.map((c) => c as number | null), e50, i, 3)) && volOk) {
    bear.push({ key: 'ema-break', label: 'EMA Kırılımı + Hacim', detail: `Fiyat EMA20/50'yi son 3 barda aşağı kırdı, hacimli`, points: 2 });
  }

  // 5) Yapı kırılımı MSB/BOS (2 puan)
  const recentSwingH = swingH.filter((x) => x < i - 1 && x > i - 40);
  if (recentSwingH.length) {
    const sh = recentSwingH[recentSwingH.length - 1];
    if (close > candles[sh].h && i - sh <= 12) {
      bull.push({ key: 'bos', label: 'Yapı Kırılımı (BOS)', detail: `Son salınım tepesi ${candles[sh].h.toFixed(2)} yukarı kırıldı`, points: 2 });
    }
  }
  const recentSwingL = swingL.filter((x) => x < i - 1 && x > i - 40);
  if (recentSwingL.length) {
    const sl = recentSwingL[recentSwingL.length - 1];
    if (close < candles[sl].l && i - sl <= 12) {
      bear.push({ key: 'bos', label: 'Yapı Kırılımı (BOS)', detail: `Son salınım dibi ${candles[sl].l.toFixed(2)} aşağı kırıldı`, points: 2 });
    }
  }

  // 6) Golden/Death cross (2 puan)
  if (crossedUp(s50, s200, i, 10)) bull.push({ key: 'cross', label: 'Golden Cross', detail: 'SMA50, SMA200’ü son 10 barda yukarı kesti', points: 2 });
  if (crossedDown(s50, s200, i, 10)) bear.push({ key: 'cross', label: 'Death Cross', detail: 'SMA50, SMA200’ü son 10 barda aşağı kesti', points: 2 });

  // 7) Stochastic (1 puan)
  if (crossedUp(stK, stD, i, 3) && stK[i] !== null && (stK[i] as number) < 35) {
    bull.push({ key: 'stoch', label: 'Stochastic Dönüşü', detail: `%K ${(stK[i] as number).toFixed(0)} ile %D'yi dip bölgeden yukarı kesti`, points: 1 });
  }
  if (crossedDown(stK, stD, i, 3) && stK[i] !== null && (stK[i] as number) > 65) {
    bear.push({ key: 'stoch', label: 'Stochastic Dönüşü', detail: `%K ${(stK[i] as number).toFixed(0)} ile %D'yi tepe bölgeden aşağı kesti`, points: 1 });
  }

  // 8) EMA50 üstü/altı (1 puan)
  if (e50[i] !== null && close > (e50[i] as number)) bull.push({ key: 'ema50', label: 'EMA50 Üstünde', detail: `Fiyat ${(((e50[i] as number))).toFixed(2)} üstünde`, points: 1 });
  if (e50[i] !== null && close < (e50[i] as number)) bear.push({ key: 'ema50', label: 'EMA50 Altında', detail: `Fiyat ${(((e50[i] as number))).toFixed(2)} altında`, points: 1 });

  // 9) Hacim patlaması (1 puan)
  if (volSurge) {
    const dirPts = close >= candles[i - 1].c ? bull : bear;
    dirPts.push({ key: 'vol', label: 'Hacim Patlaması', detail: `Son bar hacmi 20 günlük ortalamanın ${((vols[i] / (a20 as number))).toFixed(1)} katı`, points: 1 });
  }

  // 10) RSI aşırı bölge dönüşü (1 puan)
  let minRsi = 100;
  for (let j = Math.max(0, i - 10); j <= i; j++) if (rsi[j] !== null) minRsi = Math.min(minRsi, rsi[j] as number);
  let maxRsi = 0;
  for (let j = Math.max(0, i - 10); j <= i; j++) if (rsi[j] !== null) maxRsi = Math.max(maxRsi, rsi[j] as number);
  if (minRsi < 35 && rsi[i] !== null && (rsi[i] as number) > minRsi + 5) {
    bull.push({ key: 'rsi-b', label: 'RSI Dipten Dönüş', detail: `RSI 10 bar içinde ${(minRsi).toFixed(0)} seviyesine inip ${(rsi[i] as number).toFixed(0)} seviyesine döndü`, points: 1 });
  }
  if (maxRsi > 65 && rsi[i] !== null && (rsi[i] as number) < maxRsi - 5) {
    bear.push({ key: 'rsi-b', label: 'RSI Tepeden Dönüş', detail: `RSI 10 bar içinde ${(maxRsi).toFixed(0)} seviyesine çıkıp ${(rsi[i] as number).toFixed(0)} seviyesine döndü`, points: 1 });
  }

  const bullScore = bull.reduce((s, x) => s + x.points, 0);
  const bearScore = bear.reduce((s, x) => s + x.points, 0);
  const gradeOf = (sc: number): 'GUCLU' | 'ORTA' | 'ZAYIF' => (sc >= 7 ? 'GUCLU' : sc >= 4 ? 'ORTA' : 'ZAYIF');
  const direction = bullScore >= bearScore ? 'bull' : 'bear';
  const score = direction === 'bull' ? bullScore : bearScore;

  return {
    symbol,
    close,
    lastTime: candles[i].t,
    bullScore,
    bearScore,
    grade: gradeOf(score),
    direction,
    score,
    signals: direction === 'bull' ? bull : bear,
    volumeSurge: volSurge,
    rsi14: rsi[i],
  };
}

// ---- Havuz + tarama ----

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  const workers = new Array(Math.min(n, items.length)).fill(null).map(async () => {
    while (idx < items.length) {
      const cur = idx++;
      out[cur] = await fn(items[cur]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function scanReversals(
  symbols: string[],
  opts: { direction?: ReversalDirection; minScore?: number; concurrency?: number } = {}
): Promise<{ results: ReversalResult[]; scanned: number; skipped: number; ms: number; cached: boolean }> {
  const direction = opts.direction || 'both';
  const minScore = opts.minScore ?? 3;
  const key = `${direction}|${minScore}|${symbols.length}|${symbols.slice(0, 5).join(',')}`;
  const t0 = Date.now();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return { ...hit, cached: true };
  }

  const analyzed = await pool(symbols, opts.concurrency ?? 12, async (sym) => {
    try {
      const h = await getHistory(sym);
      if (!h || h.candles.length < 215) return null;
      return analyzeOne(sym, h.candles);
    } catch {
      return null;
    }
  });

  const all = analyzed.filter((x): x is ReversalResult => x !== null);
  const results = all
    .filter((r) => {
      if (direction === 'bull') return r.direction === 'bull' && r.bullScore >= minScore;
      if (direction === 'bear') return r.direction === 'bear' && r.bearScore >= minScore;
      return r.score >= minScore;
    })
    .sort((a, b) => b.score - a.score);

  const out = { results, scanned: all.length, skipped: symbols.length - all.length, ms: Date.now() - t0, cached: false };
  cache.set(key, { ts: Date.now(), ...out });
  return out;
}
