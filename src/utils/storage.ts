import { PortfolioData, PortfolioPosition, Transaction, BistStock, NotesMap, StockNote, WatchItem } from '../types';

const STORAGE_KEY = 'bist_portfolio_tracker_v1';
const WATCHLIST_KEY = 'bist_watchlist_v1';
const NOTES_KEY = 'bist_stock_notes_v1';

// İzleme listesi: portföyde olmayıp takip edilenler (sembol + eklenme tarihi).
// Eski format (string[]) otomatik göçerilir; göçenlere göç anı yazılır.
export function getStoredWatchlist(): WatchItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    const out: WatchItem[] = [];
    for (const e of parsed) {
      if (typeof e === 'string' && e) out.push({ symbol: e, addedAt: now });
      else if (e && typeof e.symbol === 'string' && e.symbol) {
        out.push({ symbol: e.symbol, addedAt: typeof e.addedAt === 'number' ? e.addedAt : now });
      }
    }
    return out;
  } catch (err) {
    console.error('Error reading watchlist:', err);
    return [];
  }
}

export function saveStoredWatchlist(items: WatchItem[]): void {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving watchlist:', err);
  }
}

// Hisse notları: PC'de saklanır (sembol -> not)
export function getStoredNotes(): NotesMap {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: NotesMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof (v as StockNote).text === 'string') {
        out[k] = { text: (v as StockNote).text, updatedAt: String((v as StockNote).updatedAt || '') };
      }
    }
    return out;
  } catch (err) {
    console.error('Error reading notes:', err);
    return {};
  }
}

export function saveStoredNotes(notes: NotesMap): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Error saving notes:', err);
  }
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    symbol: 'THYAO',
    type: 'BUY',
    shares: 100,
    price: 275.50,
    totalAmount: 27550,
    date: '2026-03-15',
    note: 'Uzun vadeli büyüme pozisyonu',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 180,
  },
  {
    id: 'tx-2',
    symbol: 'ASELS',
    type: 'BUY',
    shares: 250,
    price: 64.20,
    totalAmount: 16050,
    date: '2026-04-10',
    note: 'Savunma sanayii yatırımı',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 150,
  },
  {
    id: 'tx-3',
    symbol: 'TUPRS',
    type: 'BUY',
    shares: 80,
    price: 155.00,
    totalAmount: 12400,
    date: '2026-05-20',
    note: 'Temettü verimi portföyü',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 110,
  },
  {
    id: 'tx-4',
    symbol: 'KCHOL',
    type: 'BUY',
    shares: 60,
    price: 210.00,
    totalAmount: 12600,
    date: '2026-06-01',
    note: 'Holding çeşitlendirmesi',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
  },
];

export function getStoredPortfolio(): PortfolioData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: PortfolioData = {
        cash: 15000,
        transactions: INITIAL_TRANSACTIONS,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return {
      cash: 15000,
      transactions: INITIAL_TRANSACTIONS,
      updatedAt: new Date().toISOString(),
    };
  }
}

export function saveStoredPortfolio(data: PortfolioData): void {
  try {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving localStorage:', err);
  }
}

/**
 * Calculates current holdings/positions from raw transaction log and stock prices.
 * Handles partial sales, weighted average costs, and realized/unrealized profit.
 */
export function calculatePositions(
  transactions: Transaction[],
  stocksMap: Record<string, BistStock>
): PortfolioPosition[] {
  const grouped: Record<string, Transaction[]> = {};

  // Sort chronological for accurate FIFO / weighted average cost
  const sorted = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.createdAt - b.createdAt;
  });

  for (const tx of sorted) {
    if (!grouped[tx.symbol]) {
      grouped[tx.symbol] = [];
    }
    grouped[tx.symbol].push(tx);
  }

  const positions: PortfolioPosition[] = [];

  for (const [symbol, txs] of Object.entries(grouped)) {
    let remainingShares = 0;
    let totalCostBasis = 0;
    let realizedPnL = 0;

    for (const tx of txs) {
      if (tx.type === 'BUY') {
        remainingShares += tx.shares;
        totalCostBasis += tx.shares * tx.price;
      } else if (tx.type === 'SELL') {
        const avgCostBeforeSell = remainingShares > 0 ? totalCostBasis / remainingShares : 0;
        const sellShares = Math.min(tx.shares, remainingShares);
        const profit = sellShares * (tx.price - avgCostBeforeSell);
        realizedPnL += profit;

        remainingShares -= sellShares;
        totalCostBasis -= sellShares * avgCostBeforeSell;
        if (remainingShares <= 0) {
          remainingShares = 0;
          totalCostBasis = 0;
        }
      }
    }

    if (remainingShares > 0) {
      const stock = stocksMap[symbol];
      const currentPrice = stock?.close || (totalCostBasis / remainingShares);
      const avgCost = remainingShares > 0 ? totalCostBasis / remainingShares : 0;
      const currentValue = remainingShares * currentPrice;
      const unrealizedPnL = currentValue - totalCostBasis;
      const unrealizedPnLPercent = totalCostBasis > 0 ? (unrealizedPnL / totalCostBasis) * 100 : 0;

      // Daily change amount: currentPrice * (changePercent / 100) * shares approx
      const changePct = stock?.change || 0;
      const prevClose = stock?.open || (currentPrice / (1 + changePct / 100));
      const dailyChangeAmount = (currentPrice - prevClose) * remainingShares;

      positions.push({
        symbol,
        totalShares: remainingShares,
        averageCost: avgCost,
        totalCost: totalCostBasis,
        currentPrice,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        dailyChangePercent: changePct,
        dailyChangeAmount,
        portfolioWeight: 0, // calculated below
        stockData: stock,
        transactions: txs,
        realizedPnL,
      });
    }
  }

  // Calculate total portfolio value to get weights
  const totalHoldingsValue = positions.reduce((sum, p) => sum + p.currentValue, 0);

  positions.forEach((p) => {
    p.portfolioWeight = totalHoldingsValue > 0 ? (p.currentValue / totalHoldingsValue) * 100 : 0;
  });

  // Sort by current value descending by default
  return positions.sort((a, b) => b.currentValue - a.currentValue);
}
