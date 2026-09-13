export interface BistStock {
  symbol: string;
  ticker: string;
  fullSymbol: string;
  name: string;
  close: number;
  change: number;
  volume: number;
  valueTraded: number;
  high: number;
  low: number;
  open: number;
  week52High: number;
  week52Low: number;
  marketCap: number;
  peRatio: number | null;
  pbRatio: number | null;
  technicalRating: number;
  oscillatorRating: number;
  maRating: number;
  rsi: number | null;
  description: string;
  sector: string;
  dividendYield: number | null;
  // ---- Temel analiz: gelir tablosu (TTM, TL) — TradingView, eksikse null ----
  revenueTtm?: number | null;
  grossProfitTtm?: number | null;
  operatingIncomeTtm?: number | null;
  netIncomeTtm?: number | null;
  ebitdaTtm?: number | null;
  epsDilutedTtm?: number | null;
  revenuePerShareTtm?: number | null;
  // ---- Son çeyrek snapshot ----
  revenueFq?: number | null;
  netIncomeFq?: number | null;
  ebitdaFq?: number | null;
  // ---- Bilanço (FQ) ----
  totalAssetsFq?: number | null;
  totalLiabilitiesFq?: number | null;
  totalEquityFq?: number | null;
  totalDebtFq?: number | null;
  netDebtFq?: number | null;
  currentRatioFq?: number | null;
  quickRatioFq?: number | null;
  roeFq?: number | null;
  // ---- Hesaplanan marjlar / oranlar ----
  grossMarginTtm?: number | null; // %
  operatingMarginTtm?: number | null; // %
  netMarginTtm?: number | null; // %
  ebitdaMarginTtm?: number | null; // %
  roaTtm?: number | null; // %
  debtToEquityFq?: number | null; // oran (1,2 = %120 borç/özkaynak)
  // ---- Değerleme ----
  enterpriseValueFq?: number | null;
  evEbitda?: number | null;
  evSales?: number | null;
  priceSales?: number | null;
  priceCashFlow?: number | null;
  priceFreeCashFlow?: number | null;
  freeCashFlowTtm?: number | null;
  payoutRatio?: number | null; // %
  // ---- Piyasa yapısı ----
  beta1y?: number | null;
  floatShares?: number | null;
  totalSharesOut?: number | null;
  freeFloatPct?: number | null; // %
  paidCapital?: number | null; // TL (pay adedi × 1₺ nominal, yaklaşık)
  employees?: number | null;
  // ---- Takvim (unix saniye) ----
  nextEarningsDate?: number | null;
  lastEarningsDate?: number | null;
  lastDividendDate?: number | null;
}

export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
  id: string;
  symbol: string;
  type: TransactionType;
  shares: number; // lot sayısı
  price: number; // hisse başı fiyat TL
  totalAmount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export interface PortfolioPosition {
  symbol: string;
  totalShares: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dailyChangePercent: number;
  dailyChangeAmount: number;
  portfolioWeight: number; // %
  stockData?: BistStock;
  transactions: Transaction[];
  realizedPnL: number;
}

export interface PortfolioData {
  cash: number; // Nakit bakiye TL
  transactions: Transaction[];
  updatedAt: string;
}

// Hisse notu: PC'de (localStorage) saklanır
export interface StockNote {
  text: string;
  updatedAt: string; // ISO
}

export type NotesMap = Record<string, StockNote>;

// İzleme listesi öğesi: sembol + eklenme zamanı (performans hesabı için)
export interface WatchItem {
  symbol: string;
  addedAt: number; // unix ms
}

export interface MarketImpact {
  sector: string; // e.g., 'Bankacılık', 'Enerji', 'Havacılık'
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; // Pozitif, Negatif, Nötr
  affectedStocks: string[]; // e.g. ['THYAO', 'PGSUS']
  impactReason: string; // Açıklama
}

export interface EconomyNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  published: string; // ISO string or formatted date
  url: string;
  category?: string;
  impacts: MarketImpact[];
  keyTakeaway?: string;
}

export interface StockNewsItem {
  id: string;
  title: string;
  source: string;
  published: string;
  url: string;
  snippet?: string;
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface NewsItem {
  id: string;
  title: string;
  provider: string;
  source: string;
  published: number;
  urgency?: number;
  link?: string;
  storyPath?: string;
  relatedSymbols?: Array<{ symbol: string; logoid?: string }>;
}

export interface HistoryCandle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface HistoryTriple {
  stock: number | null;
  bench: number | null;
  rel: number | null;
}

export interface StockHistory {
  symbol: string;
  currency: string;
  lastClose: number;
  lastTime: number;
  count: number;
  candles: HistoryCandle[];
  sma50: (number | null)[];
  sma200: (number | null)[];
  indicators: {
    sma50: number | null;
    sma200: number | null;
    aboveSma50: boolean | null;
    aboveSma200: boolean | null;
    goldenCross: boolean | null;
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
    w1: HistoryTriple;
    m1: HistoryTriple;
    m3: HistoryTriple;
    m6: HistoryTriple;
    ytd: HistoryTriple;
    y1: HistoryTriple;
  };
}
