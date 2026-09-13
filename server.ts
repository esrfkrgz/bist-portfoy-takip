import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { getEvaluatedEconomyNews, getEconomyNewsForStock } from './server/economyNewsService.js';
import { scanNewsForStock } from './server/stockNewsScanner.js';
import { getHistory } from './server/marketHistory.js';
import { getStockAnalysis } from './server/stockAnalysis.js';
import { scanReversals } from './server/reversalScan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for BIST stock scan data
interface CachedData {
  timestamp: number;
  stocks: any[];
}

let stockCache: CachedData | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

const TV_SCAN_COLUMNS = [
  'name',
  'close',
  'change',
  'volume',
  'Value.Traded',
  'high',
  'low',
  'open',
  'price_52_week_high',
  'price_52_week_low',
  'market_cap_basic',
  'price_earnings_ttm',
  'price_book_ratio',
  'Recommend.All',
  'Recommend.Other',
  'Recommend.MA',
  'RSI',
  'description',
  'sector',
  'dividend_yield_recent',
  // price_book_fq: PD/DD'nin FQ (son çeyrek) bazlı karşılığı.
  // price_book_ratio bazı hisselerde (örn. PAPIL) null dönerken fq dolu oluyor (veya tersi),
  // bu yüzden ikisini de çekip dolu olanı kullanıyoruz.
  'price_book_fq',
  // ---- Temel analiz (gelir tablosu TTM, bilanço FQ, oranlar) ----
  // TradingView bu alanları bilmeyen/negatif/kayıp veride null döner; frontend "—" gösterir.
  'total_revenue_ttm',              // 21: Satışlar (TTM, TL)
  'gross_profit_ttm',               // 22: Brüt kâr (TTM)
  'oper_income_ttm',                // 23: Esas faaliyet kârı (TTM)
  'net_income_ttm',                 // 24: Net kâr (TTM)
  'ebitda_ttm',                     // 25: FAVÖK (TTM)
  'earnings_per_share_diluted_ttm', // 26: HBK (seyreltilmiş, TTM)
  'revenue_per_share_ttm',          // 27: Pay başına satış (TTM)
  'total_assets_fq',                // 28: Toplam varlıklar (son çeyrek)
  'total_liabilities_fq',           // 29: Toplam yükümlülükler
  'total_equity_fq',                // 30: Özkaynaklar
  'total_debt_fq',                  // 31: Toplam borç
  'net_debt_fq',                    // 32: Net borç
  'current_ratio_fq',               // 33: Cari oran
  'quick_ratio_fq',                 // 34: Likidite (asit-test) oranı
  'return_on_equity_fq',            // 35: ROE (%, FQ)
  'enterprise_value_fq',            // 36: Firma değeri (FD)
  'price_sales_current',            // 37: Fiyat/Satışlar
  'price_cash_flow_current',        // 38: Fiyat/Nakit Akışı
  'price_free_cash_flow_current',   // 39: Fiyat/Serbest Nakit Akışı
  'free_cash_flow_ttm',             // 40: Serbest nakit akışı (TTM)
  'beta_1_year',                    // 41: Beta (1 yıl)
  'float_shares_outstanding',       // 42: Fiili dolaşımdaki pay (adet)
  'total_shares_outstanding_fundamental', // 43: Toplam pay adedi
  'number_of_employees',            // 44: Çalışan sayısı
  'earnings_release_next_date',     // 45: Sonraki beklenen bilanço tarihi (unix sn)
  'earnings_release_date',          // 46: Son bilanço tarihi (unix sn)
  'dividend_ex_date_recent',        // 47: Son temettü tarihi (unix sn)
  'total_revenue_fq',               // 48: Son çeyrek satışlar
  'net_income_fq',                  // 49: Son çeyrek net kâr
  'ebitda_fq',                      // 50: Son çeyrek FAVÖK
  'dividends_yield_current',        // 51: Temettü verimi (cari, %; recent boşsa fallback)
];

async function fetchBistStocksFromTradingView() {
  const url = 'https://scanner.tradingview.com/turkey/scan';
  const payload = {
    filter: [],
    options: { lang: 'tr' },
    symbols: { query: { types: [] }, tickers: [] },
    columns: TV_SCAN_COLUMNS,
    sort: { sortBy: 'Value.Traded', sortOrder: 'desc' },
    range: [0, 800],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`TradingView scanner responded with status: ${response.status}`);
  }

  const json = await response.json();
  const data = json.data || [];

  return data.map((item: any) => {
    const d = item.d || [];
    const symbol = item.s ? item.s.replace('BIST:', '') : d[0] || '';
    const num = (i: number): number | null => (typeof d[i] === 'number' ? d[i] : null);
    const close = num(1) ?? 0;

    const revenueTtm = num(21);
    const grossProfitTtm = num(22);
    const operatingIncomeTtm = num(23);
    const netIncomeTtm = num(24);
    const ebitdaTtm = num(25);
    const epsDilutedTtm = num(26);
    const totalAssetsFq = num(28);
    const totalLiabilitiesFq = num(29);
    const totalEquityFq = num(30);
    const enterpriseValueFq = num(36);
    const floatShares = num(42);
    const totalShares = num(43);
    const dividendYield = num(19) ?? num(51);

    const pct = (part: number | null, whole: number | null): number | null =>
      part !== null && whole !== null && whole !== 0 ? (part / whole) * 100 : null;

    return {
      symbol: symbol,
      ticker: symbol,
      fullSymbol: item.s || `BIST:${symbol}`,
      name: d[0] || symbol,
      close: close,
      change: typeof d[2] === 'number' ? d[2] : 0,
      volume: typeof d[3] === 'number' ? d[3] : 0,
      valueTraded: typeof d[4] === 'number' ? d[4] : 0,
      high: typeof d[5] === 'number' ? d[5] : 0,
      low: typeof d[6] === 'number' ? d[6] : 0,
      open: typeof d[7] === 'number' ? d[7] : 0,
      week52High: typeof d[8] === 'number' ? d[8] : 0,
      week52Low: typeof d[9] === 'number' ? d[9] : 0,
      marketCap: typeof d[10] === 'number' ? d[10] : 0,
      peRatio: typeof d[11] === 'number' ? d[11] : null,
      // PD/DD: önce price_book_fq (d[20]), yoksa price_book_ratio (d[12]).
      // TradingView negatif/eksik defter değerinde iki alandan birini null bırakabiliyor.
      pbRatio:
        typeof d[20] === 'number'
          ? d[20]
          : typeof d[12] === 'number'
            ? d[12]
            : null,
      technicalRating: typeof d[13] === 'number' ? d[13] : 0, // > 0.5 Strong Buy, > 0.1 Buy, etc.
      oscillatorRating: typeof d[14] === 'number' ? d[14] : 0,
      maRating: typeof d[15] === 'number' ? d[15] : 0,
      rsi: typeof d[16] === 'number' ? d[16] : null,
      description: d[17] || symbol,
      sector: d[18] || 'Diğer',
      dividendYield: dividendYield,
      // ---- Temel analiz: gelir tablosu (TTM) ----
      revenueTtm: revenueTtm,
      grossProfitTtm: grossProfitTtm,
      operatingIncomeTtm: operatingIncomeTtm,
      netIncomeTtm: netIncomeTtm,
      ebitdaTtm: ebitdaTtm,
      epsDilutedTtm: epsDilutedTtm,
      revenuePerShareTtm: num(27),
      // ---- Temel analiz: son çeyrek snapshot ----
      revenueFq: num(48),
      netIncomeFq: num(49),
      ebitdaFq: num(50),
      // ---- Temel analiz: bilanço (FQ) ----
      totalAssetsFq: totalAssetsFq,
      totalLiabilitiesFq: totalLiabilitiesFq,
      totalEquityFq: totalEquityFq,
      totalDebtFq: num(31),
      netDebtFq: num(32),
      currentRatioFq: num(33),
      quickRatioFq: num(34),
      roeFq: num(35),
      // ---- Hesaplanan marjlar / oranlar (%, null-güvenli) ----
      grossMarginTtm: pct(grossProfitTtm, revenueTtm),
      operatingMarginTtm: pct(operatingIncomeTtm, revenueTtm),
      netMarginTtm: pct(netIncomeTtm, revenueTtm),
      ebitdaMarginTtm: pct(ebitdaTtm, revenueTtm),
      roaTtm: pct(netIncomeTtm, totalAssetsFq),
      debtToEquityFq: totalLiabilitiesFq !== null && totalEquityFq ? totalLiabilitiesFq / totalEquityFq : null,
      // ---- Değerleme ----
      enterpriseValueFq: enterpriseValueFq,
      evEbitda: enterpriseValueFq !== null && ebitdaTtm ? enterpriseValueFq / ebitdaTtm : null,
      evSales: enterpriseValueFq !== null && revenueTtm ? enterpriseValueFq / revenueTtm : null,
      priceSales: num(37),
      priceCashFlow: num(38),
      priceFreeCashFlow: num(39),
      freeCashFlowTtm: num(40),
      // Temettü dağıtım oranı ≈ (verim% × fiyat) / HBK — üçü de varsa hesaplanır
      payoutRatio:
        dividendYield !== null && epsDilutedTtm
          ? ((dividendYield / 100) * close) / epsDilutedTtm * 100
          : null,
      // ---- Piyasa yapısı ----
      beta1y: num(41),
      floatShares: floatShares,
      totalSharesOut: totalShares,
      freeFloatPct: pct(floatShares, totalShares),
      // Ödenmiş sermaye ≈ pay adedi × 1₺ nominal değer (BIST payları 1₺ nominaldir)
      paidCapital: totalShares !== null ? totalShares * 1 : null,
      employees: num(44),
      // ---- Takvim (unix saniye; frontend formatDate ile gösterir) ----
      nextEarningsDate: num(45),
      lastEarningsDate: num(46),
      lastDividendDate: num(47),
    };
  });
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get all BIST stocks with TradingView data
app.get('/api/stocks', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();

  if (!forceRefresh && stockCache && now - stockCache.timestamp < CACHE_TTL_MS) {
    return res.json({
      success: true,
      cached: true,
      lastUpdated: new Date(stockCache.timestamp).toISOString(),
      count: stockCache.stocks.length,
      data: stockCache.stocks,
    });
  }

  try {
    const stocks = await fetchBistStocksFromTradingView();
    stockCache = {
      timestamp: now,
      stocks: stocks,
    };

    return res.json({
      success: true,
      cached: false,
      lastUpdated: new Date(now).toISOString(),
      count: stocks.length,
      data: stocks,
    });
  } catch (error: any) {
    console.error('Error fetching TradingView data:', error);
    if (stockCache) {
      return res.json({
        success: true,
        cached: true,
        stale: true,
        lastUpdated: new Date(stockCache.timestamp).toISOString(),
        count: stockCache.stocks.length,
        data: stockCache.stocks,
        warning: 'TradingView canlı verisi alınamadı, önbellek kullanılıyor.',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'TradingView verisi çekilemedi',
      details: error.message,
    });
  }
});

// Single stock info
app.get('/api/stocks/:symbol', async (req, res) => {
  const target = req.params.symbol.toUpperCase();
  if (!stockCache || Date.now() - stockCache.timestamp >= CACHE_TTL_MS * 5) {
    try {
      const stocks = await fetchBistStocksFromTradingView();
      stockCache = {
        timestamp: Date.now(),
        stocks: stocks,
      };
    } catch (err) {
      // Continue to check existing cache if any
    }
  }

  const stock = stockCache?.stocks.find((s: any) => s.symbol === target);
  if (stock) {
    return res.json({ success: true, data: stock });
  }

  return res.status(404).json({ success: false, error: 'Hisse bulunamadı: ' + target });
});

// BIST & Turkish Economy News evaluated with Market Impact (Sectors & Stocks)
app.get('/api/economy-news', async (req, res) => {
  try {
    const refresh = req.query.refresh === 'true';
    const symbol = req.query.symbol as string | undefined;

    let items;
    if (symbol) {
      items = await getEconomyNewsForStock(symbol);
    } else {
      items = await getEvaluatedEconomyNews(refresh);
    }

    res.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (err: any) {
    console.error('Error in /api/economy-news:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Deep Web & Financial Media Scanner for specific BIST stock
app.get('/api/stock-news-scan', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    const company = req.query.company as string | undefined;
    const range = (req.query.range as string) || '30d';

    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol parameter is required' });
    }

    const items = await scanNewsForStock(symbol, company, range);
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      count: items.length,
      items,
    });
  } catch (err: any) {
    console.error('Error in /api/stock-news-scan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fiyat geçmişi + teknik indikatörler + XU100 kıyas (Yahoo Finance, ücretsiz)
app.get('/api/history/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-ZÇĞİÖŞÜ0-9]{1,8}$/.test(symbol)) {
      return res.status(400).json({ success: false, error: 'Geçersiz sembol: ' + symbol });
    }
    const data = await getHistory(symbol);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Geçmiş veri bulunamadı: ' + symbol });
    }
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Hisse Analizi: tüm veriler + haberlerle bütüncül rapor (yön, hedefler, riskler)
app.get('/api/analysis/:symbol', async (req, res) => {
  try {
    const target = req.params.symbol.toUpperCase();
    const refresh = req.query.refresh === 'true';
    if (!stockCache || Date.now() - stockCache.timestamp >= CACHE_TTL_MS * 5 || refresh) {
      try {
        const stocks = await fetchBistStocksFromTradingView();
        stockCache = { timestamp: Date.now(), stocks };
      } catch {
        /* mevcut önbellekle devam */
      }
    }
    const stock = stockCache?.stocks.find((s: any) => s.symbol === target);
    if (!stock) {
      return res.status(404).json({ success: false, error: 'Hisse bulunamadı: ' + target });
    }
    const report = await getStockAnalysis(stock);
    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('Error in /api/analysis:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trend-dönüş taraması: RSI uyumsuzluğu + MACD + Supertrend + EMA + hacim + yapı kırılımı
// ?direction=bull|bear|both &limit=N (likiditeye göre ilk N) &minScore=N
app.get('/api/reversals', async (req, res) => {
  try {
    const direction = (req.query.direction as string) === 'bull' || (req.query.direction as string) === 'bear'
      ? (req.query.direction as 'bull' | 'bear')
      : 'both';
    const limit = Math.max(10, Math.min(649, Number(req.query.limit) || 200));
    const minScore = Math.max(1, Math.min(12, Number(req.query.minScore) || 3));

    if (!stockCache || Date.now() - stockCache.timestamp >= CACHE_TTL_MS * 5) {
      try {
        const stocks = await fetchBistStocksFromTradingView();
        stockCache = { timestamp: Date.now(), stocks };
      } catch {
        /* mevcut önbellekle devam */
      }
    }
    if (!stockCache) return res.status(500).json({ success: false, error: 'Hisse verisi yok' });

    const universe = stockCache.stocks.slice(0, limit).map((s: any) => s.symbol);
    const scan = await scanReversals(universe, { direction, minScore });
    const map: Record<string, any> = {};
    stockCache.stocks.forEach((s: any) => {
      map[s.symbol] = s;
    });
    const enriched = scan.results.map((r) => {
      const s = map[r.symbol] || {};
      return {
        ...r,
        change: s.change ?? null,
        sector: s.sector ?? null,
        valueTraded: s.valueTraded ?? null,
        peRatio: s.peRatio ?? null,
        pbRatio: s.pbRatio ?? null,
      };
    });
    res.json({ success: true, direction, minScore, universe: universe.length, ...scan, results: enriched });
  } catch (err: any) {
    console.error('Error in /api/reversals:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// İzleme performansı: her hissenin eklenme tarihindeki fiyata göre getirisi.
// Eklenme fiyatı = eklenme anından önceki son kapanış (Yahoo geçmişi, önbellekli).
app.post('/api/watch-performance', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const results = await Promise.all(
      items.slice(0, 100).map(async (it: any) => {
        const symbol = String(it?.symbol || '').toUpperCase();
        const addedAt = Number(it?.addedAt || 0);
        if (!symbol || !addedAt) return { symbol, entryPrice: null, entryDate: null, currentPrice: null, pct: null };
        try {
          const h = await getHistory(symbol);
          if (!h || !h.candles.length) {
            return { symbol, entryPrice: null, entryDate: null, currentPrice: null, pct: null };
          }
          const addedSec = Math.floor(addedAt / 1000);
          let entry = h.candles[0];
          for (const c of h.candles) {
            if (c.t <= addedSec) entry = c;
            else break;
          }
          const current = h.lastClose;
          const pct = entry.c ? ((current - entry.c) / entry.c) * 100 : null;
          return {
            symbol,
            entryPrice: entry.c,
            entryDate: entry.t * 1000,
            currentPrice: current,
            pct,
          };
        } catch {
          return { symbol, entryPrice: null, entryDate: null, currentPrice: null, pct: null };
        }
      })
    );
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// TradingView News for BIST
app.get('/api/news', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    let url = 'https://news-headlines.tradingview.com/v2/headlines?category=stock&client=web&lang=tr';
    if (symbol) {
      url = `https://news-headlines.tradingview.com/v2/headlines?symbol=BIST:${encodeURIComponent(symbol.toUpperCase())}&client=web&lang=tr`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      // Fallback to Turkish general news
      const fallbackRes = await fetch('https://news-headlines.tradingview.com/v2/headlines?category=stock&client=web&lang=tr');
      const json = await fallbackRes.json();
      return res.json({ success: true, items: json.items || [] });
    }

    const json = await response.json();
    res.json({ success: true, items: json.items || [] });
  } catch (err: any) {
    console.error('Error fetching news:', err);
    res.json({ success: true, items: [] });
  }
});

// Vite middleware & SPA setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
