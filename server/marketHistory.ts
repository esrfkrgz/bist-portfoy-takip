// Yahoo Finance (ücretsiz, anahtarsız) üzerinden BIST fiyat geçmişi + teknik indikatörler.
// Kaynak: https://query1.finance.yahoo.com/v8/finance/chart/<SEMBOL>.IS (BIST), XU100.IS (kıyas)
// Hesaplananlar: SMA50/200, MACD, RSI(14), Stochastic, ATR(14), Bollinger(20),
// dönem getirileri, XU100'e göre relatif getiri, beta, 20 günlük ortalama hacim.

export interface HistoryCandle {
  t: number; // unix saniye
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface HistoryResponse {
  symbol: string;
  currency: string;
  lastClose: number;
  lastTime: number;
  count: number;
  candles: HistoryCandle[]; // grafik için son ~260 mum
  sma50: (number | null)[]; // candles ile aynı uzunlukta (baştaki değerler null olabilir)
  sma200: (number | null)[];
  indicators: {
    sma50: number | null;
    sma200: number | null;
    aboveSma50: boolean | null;
    aboveSma200: boolean | null;
    goldenCross: boolean | null; // SMA50 > SMA200
    macd: number | null;
    macdSignal: number | null;
    macdHist: number | null;
    rsi14: number | null;
    stochK: number | null;
    stochD: number | null;
    atr14: number | null;
    bbUpper: number | null;
    bbMid: number | null;
    bbLower: number | null;
    avgVolume20: number | null;
    beta1y: number | null;
  };
  returns: {
    // % değişim: hisse, endeks (XU100), fark (relatif)
    w1: { stock: number | null; bench: number | null; rel: number | null };
    m1: { stock: number | null; bench: number | null; rel: number | null };
    m3: { stock: number | null; bench: number | null; rel: number | null };
    m6: { stock: number | null; bench: number | null; rel: number | null };
    ytd: { stock: number | null; bench: number | null; rel: number | null };
    y1: { stock: number | null; bench: number | null; rel: number | null };
  };
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface RawSeries {
  t: number[];
  c: number[];
  v: number[];
}

async function fetchYahooSeries(yahooSymbol: string, range = '2y'): Promise<RawSeries | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?range=${range}&interval=1d&events=div`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json: any = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;
  const ts: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const adj = result.indicators?.adjclose?.[0]?.adjclose;
  const t: number[] = [];
  const c: number[] = [];
  const v: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = Array.isArray(adj) && typeof adj[i] === 'number' ? adj[i] : quote.close?.[i];
    const vol = quote.volume?.[i];
    if (typeof close !== 'number' || isNaN(close)) continue;
    t.push(ts[i]);
    c.push(close);
    v.push(typeof vol === 'number' ? vol : 0);
  }
  if (c.length < 10) return null;
  return { t, c, v };
}

export async function fetchYahooCandles(yahooSymbol: string, range = '2y'): Promise<HistoryCandle[] | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?range=${range}&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json: any = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;
  const ts: number[] = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const adj: (number | null)[] | undefined = result.indicators?.adjclose?.[0]?.adjclose;
  // Düzeltilmiş kapanışa göre geriye dönük uyarlama faktörü (temettü/bölünme için)
  const out: HistoryCandle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (typeof close !== 'number' || isNaN(close)) continue;
    const a = Array.isArray(adj) ? adj[i] : null;
    const factor = typeof a === 'number' && close !== 0 ? a / close : 1;
    out.push({
      t: ts[i],
      o: typeof q.open?.[i] === 'number' ? q.open[i] * factor : close * factor,
      h: typeof q.high?.[i] === 'number' ? q.high[i] * factor : close * factor,
      l: typeof q.low?.[i] === 'number' ? q.low[i] * factor : close * factor,
      c: close * factor,
      v: typeof q.volume?.[i] === 'number' ? q.volume[i] : 0,
    });
  }
  return out.length >= 10 ? out : null;
}

// ---- İndikatör matematikleri (düzeltilmiş kapanış serisi üzerinden) ----

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

function stochastic(
  candles: HistoryCandle[],
  period = 14
): { k: number | null; d: number | null } {
  if (candles.length < period + 2) return { k: null, d: null };
  const kVals: number[] = [];
  for (let i = candles.length - (period + 2) - 3; i < candles.length; i++) {
    const idx = Math.max(0, i);
    const slice = candles.slice(Math.max(0, idx - period + 1), idx + 1);
    const hh = Math.max(...slice.map((x) => x.h));
    const ll = Math.min(...slice.map((x) => x.l));
    kVals.push(hh === ll ? 50 : ((candles[idx].c - ll) / (hh - ll)) * 100);
  }
  const k = kVals[kVals.length - 1];
  const d = kVals.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, kVals.length);
  return { k, d };
}

function atr(candles: HistoryCandle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].h;
    const l = candles[i].l;
    const pc = candles[i - 1].c;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function bollinger(
  closes: number[],
  period = 20,
  mult = 2
): { upper: number | null; mid: number | null; lower: number | null } {
  if (closes.length < period) return { upper: null, mid: null, lower: null };
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mid) * (b - mid), 0) / period;
  const sd = Math.sqrt(variance);
  return { upper: mid + mult * sd, mid, lower: mid - mult * sd };
}

function periodReturn(closes: number[], daysBack: number): number | null {
  if (closes.length <= daysBack) return null;
  const now = closes[closes.length - 1];
  const then = closes[closes.length - 1 - daysBack];
  if (!then) return null;
  return ((now - then) / then) * 100;
}

// Benchmark getirisi: hisseyle AYNI tarihe denk gelen kapanıştan (tarih hizalı)
function benchReturnOnDate(
  bench: RawSeries,
  targetTime: number,
  lastBenchClose: number
): number | null {
  let base: number | null = null;
  for (let i = bench.t.length - 1; i >= 0; i--) {
    if (bench.t[i] <= targetTime) {
      base = bench.c[i];
      break;
    }
  }
  if (!base) return null;
  return ((lastBenchClose - base) / base) * 100;
}

function ytdReturn(times: number[], closes: number[]): { value: number | null; startTime: number | null } {
  if (!times.length) return { value: null, startTime: null };
  const year = new Date(times[times.length - 1] * 1000).getFullYear();
  let idx = -1;
  for (let i = 0; i < times.length; i++) {
    if (new Date(times[i] * 1000).getFullYear() === year) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return { value: null, startTime: null };
  const base = closes[idx];
  const now = closes[closes.length - 1];
  if (!base) return { value: null, startTime: null };
  return { value: ((now - base) / base) * 100, startTime: times[idx] };
}

// Beta: tarih hizalı eşleşen günler üzerinden (index hizası yanıltır — seriler farklı uzunlukta olabilir)
function beta(
  stockT: number[],
  stockCloses: number[],
  bench: RawSeries,
  lookback = 252
): number | null {
  const benchByTime = new Map<number, number>();
  for (let i = 0; i < bench.t.length; i++) benchByTime.set(bench.t[i], bench.c[i]);
  const pairs: { s: number; b: number }[] = [];
  for (let i = 0; i < stockT.length; i++) {
    const b = benchByTime.get(stockT[i]);
    if (b !== undefined) pairs.push({ s: stockCloses[i], b });
  }
  const n = Math.min(pairs.length, lookback);
  if (n < 30) return null;
  const sl = pairs.slice(-n);
  const rs: number[] = [];
  const rb: number[] = [];
  for (let i = 1; i < sl.length; i++) {
    if (!sl[i - 1].s || !sl[i - 1].b) continue;
    rs.push((sl[i].s - sl[i - 1].s) / sl[i - 1].s);
    rb.push((sl[i].b - sl[i - 1].b) / sl[i - 1].b);
  }
  if (rs.length < 30) return null;
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const ms = mean(rs);
  const mb = mean(rb);
  let cov = 0;
  let vb = 0;
  for (let i = 0; i < rs.length; i++) {
    cov += (rs[i] - ms) * (rb[i] - mb);
    vb += (rb[i] - mb) * (rb[i] - mb);
  }
  if (vb === 0) return null;
  return cov / vb;
}

// ---- Cache ----

interface CacheEntry {
  ts: number;
  data: HistoryResponse;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 dk (günlük veri gün içinde değişmez)

let benchCache: { ts: number; series: RawSeries } | null = null;

async function getBenchSeries(): Promise<RawSeries | null> {
  const now = Date.now();
  if (benchCache && now - benchCache.ts < CACHE_TTL_MS) return benchCache.series;
  const s = await fetchYahooSeries('XU100.IS', '2y');
  if (s) benchCache = { ts: now, series: s };
  return s;
}

const last = <T>(a: (T | null)[]): T | null => (a.length ? a[a.length - 1] : null);

export async function getHistory(symbol: string): Promise<HistoryResponse | null> {
  const key = symbol.toUpperCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < CACHE_TTL_MS) return hit.data;

  const [candles, bench] = await Promise.all([
    fetchYahooCandles(`${key}.IS`, '2y'),
    getBenchSeries(),
  ]);
  if (!candles) return null;

  const closes = candles.map((c) => c.c);
  const vols = candles.map((c) => c.v);

  // Grafik için son 260 mum + hizalı SMA serileri
  const N = 260;
  const sliced = candles.slice(-N);
  const sma50Full = sma(closes, 50);
  const sma200Full = sma(closes, 200);

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => (v !== null && ema26[i] !== null ? v - (ema26[i] as number) : null));
  const macdVals = macdLine.filter((v): v is number => v !== null);
  const signalArr = ema(macdVals, 9);
  const macd = last(macdLine);
  const macdSignal = last(signalArr);
  const macdHist = macd !== null && macdSignal !== null ? macd - macdSignal : null;

  const rsi14 = rsi(closes, 14);
  const stoch = stochastic(candles, 14);
  const atr14 = atr(candles, 14);
  const bb = bollinger(closes, 20, 2);

  const lastClose = closes[closes.length - 1];
  const s50 = last(sma50Full);
  const s200 = last(sma200Full);
  const avgVol =
    vols.length >= 20
      ? vols.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, vols.length)
      : null;

  const candleTimes = candles.map((c) => c.t);
  const lastBenchClose = bench && bench.c.length ? bench.c[bench.c.length - 1] : null;
  const mk = (days: number) => {
    const s = periodReturn(closes, days);
    const targetTime = candleTimes.length > days ? candleTimes[candleTimes.length - 1 - days] : null;
    const b =
      bench && targetTime !== null && lastBenchClose !== null
        ? benchReturnOnDate(bench, targetTime, lastBenchClose)
        : null;
    return {
      stock: s,
      bench: b,
      rel: s !== null && b !== null ? s - b : null,
    };
  };
  const ytdS = ytdReturn(candleTimes, closes);
  const ytdB =
    bench && ytdS.startTime !== null && lastBenchClose !== null
      ? benchReturnOnDate(bench, ytdS.startTime, lastBenchClose)
      : null;

  const data: HistoryResponse = {
    symbol: key,
    currency: 'TRY',
    lastClose,
    lastTime: candles[candles.length - 1].t,
    count: candles.length,
    candles: sliced,
    sma50: sma50Full.slice(-N),
    sma200: sma200Full.slice(-N),
    indicators: {
      sma50: s50,
      sma200: s200,
      aboveSma50: s50 !== null ? lastClose > s50 : null,
      aboveSma200: s200 !== null ? lastClose > s200 : null,
      goldenCross: s50 !== null && s200 !== null ? s50 > s200 : null,
      macd,
      macdSignal,
      macdHist,
      rsi14,
      stochK: stoch.k,
      stochD: stoch.d,
      atr14,
      bbUpper: bb.upper,
      bbMid: bb.mid,
      bbLower: bb.lower,
      avgVolume20: avgVol,
      beta1y: bench ? beta(candleTimes, closes, bench, 252) : null,
    },
    returns: {
      w1: mk(5),
      m1: mk(21),
      m3: mk(63),
      m6: mk(126),
      ytd: { stock: ytdS.value, bench: ytdB, rel: ytdS.value !== null && ytdB !== null ? ytdS.value - ytdB : null },
      y1: mk(252),
    },
  };

  cache.set(key, { ts: now, data });
  return data;
}
