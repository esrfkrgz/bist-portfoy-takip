import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BistStock,
  PortfolioData,
  Transaction,
  TransactionType,
  WatchItem
} from './types';
import {
  getStoredPortfolio,
  saveStoredPortfolio,
  calculatePositions,
  getStoredWatchlist,
  saveStoredWatchlist,
  getStoredNotes,
  saveStoredNotes
} from './utils/storage';
import { Header } from './components/Header';
import { PortfolioStats } from './components/PortfolioStats';
import { HoldingsTable } from './components/HoldingsTable';
import { PortfolioAllocation } from './components/PortfolioAllocation';
import { Watchlist } from './components/Watchlist';
import { ReversalScanner } from './components/ReversalScanner';
import { StockDetailModal } from './components/StockDetailModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { BistScreener } from './components/BistScreener';
import { CashModal } from './components/CashModal';
import { NewsFeedModal } from './components/NewsFeedModal';
import { ExportImportModal } from './components/ExportImportModal';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Briefcase
} from 'lucide-react';
import { formatPrice, formatPercent } from './utils/formatters';

export default function App() {
  // 1. All BIST Stocks from TradingView
  const [stocks, setStocks] = useState<BistStock[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 2. User Portfolio Data (stored in localStorage)
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(getStoredPortfolio);

  // 2b. Watchlist: portföyde olmayıp izlenenler (sembol + eklenme tarihi)
  const [watchlist, setWatchlist] = useState<WatchItem[]>(getStoredWatchlist);

  const isWatched = useCallback(
    (symbol: string) => watchlist.some((w) => w.symbol === symbol),
    [watchlist]
  );
  const [mainTab, setMainTab] = useState<'portfolio' | 'watch'>('portfolio');

  // 2c. Hisse notları: PC'de saklanır (sembol -> not)
  const [notes, setNotes] = useState<Record<string, { text: string; updatedAt: string }>>(getStoredNotes);

  // 3. Modals & Drawers State
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialSymbol, setAddModalInitialSymbol] = useState<string>('');
  const [addModalInitialType, setAddModalInitialType] = useState<TransactionType>('BUY');
  const [addModalMaxSell, setAddModalMaxSell] = useState<number>(0);

  const [isScreenerOpen, setIsScreenerOpen] = useState(false);
  const [isReversalOpen, setIsReversalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // 4. Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Map of symbol -> BistStock for O(1) lookups
  const stocksMap = useMemo(() => {
    const map: Record<string, BistStock> = {};
    for (const stock of stocks) {
      map[stock.symbol] = stock;
    }
    return map;
  }, [stocks]);

  // Compute live positions with current TradingView prices
  const positions = useMemo(() => {
    return calculatePositions(portfolioData.transactions, stocksMap);
  }, [portfolioData.transactions, stocksMap]);

  const portfolioSymbols = useMemo(
    () => new Set(positions.map((p) => p.symbol)),
    [positions]
  );

  // İzleme listesi aç/kapa (açarken eklenme tarihi damgalanır)
  const handleToggleWatch = useCallback((symbol: string) => {
    setWatchlist((prev) => {
      const exists = prev.some((w) => w.symbol === symbol);
      const next = exists
        ? prev.filter((w) => w.symbol !== symbol)
        : [...prev, { symbol, addedAt: Date.now() }];
      saveStoredWatchlist(next);
      return next;
    });
    setToastMessage({
      text: watchlist.some((w) => w.symbol === symbol)
        ? `${symbol} izleme listesinden çıkarıldı.`
        : `${symbol} izleme listesine eklendi.`,
      type: 'success',
    });
    setTimeout(() => setToastMessage(null), 3500);
  }, [watchlist]);

  // Find selected stock details for StockDetailModal
  const selectedStock = useMemo(() => {
    if (!selectedStockSymbol) return null;
    return (
      stocksMap[selectedStockSymbol] || {
        symbol: selectedStockSymbol,
        ticker: selectedStockSymbol,
        fullSymbol: `BIST:${selectedStockSymbol}`,
        name: selectedStockSymbol,
        close: 0,
        change: 0,
        volume: 0,
        valueTraded: 0,
        high: 0,
        low: 0,
        open: 0,
        week52High: 0,
        week52Low: 0,
        marketCap: 0,
        peRatio: null,
        pbRatio: null,
        technicalRating: 0,
        oscillatorRating: 0,
        maRating: 0,
        rsi: null,
        description: selectedStockSymbol,
        sector: 'Borsa İstanbul',
        dividendYield: null,
      }
    );
  }, [selectedStockSymbol, stocksMap]);

  const selectedPosition = useMemo(() => {
    if (!selectedStockSymbol) return undefined;
    return positions.find((p) => p.symbol === selectedStockSymbol);
  }, [selectedStockSymbol, positions]);

  // Fetch TradingView data from server API
  const fetchStocksData = useCallback(async (forceRefresh = false) => {
    setIsLoadingStocks(true);
    setFetchError(null);
    try {
      const url = forceRefresh ? '/api/stocks?refresh=true' : '/api/stocks';
      const response = await fetch(url);
      const json = await response.json();

      if (json.success && Array.isArray(json.data)) {
        setStocks(json.data);
        setLastUpdated(json.lastUpdated || new Date().toISOString());
        if (forceRefresh) {
          showToast('TradingView verileri başarıyla güncellendi.');
        }
      } else {
        throw new Error(json.error || 'Veri çekilemedi');
      }
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      setFetchError('TradingView verisi alınırken bir sorun oluştu.');
    } finally {
      setIsLoadingStocks(false);
    }
  }, []);

  // "program açıldığında verileri güncellenen": on mount fetch data
  useEffect(() => {
    fetchStocksData();
  }, [fetchStocksData]);

  // Update portfolio transactions
  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    const updatedTransactions = [...portfolioData.transactions, tx];
    
    // Optional cash adjustment if user wants
    let newCash = portfolioData.cash;
    if (newTx.type === 'BUY') {
      newCash = Math.max(0, newCash - newTx.totalAmount);
    } else if (newTx.type === 'SELL') {
      newCash = newCash + newTx.totalAmount;
    }

    const updatedData: PortfolioData = {
      ...portfolioData,
      cash: newCash,
      transactions: updatedTransactions,
      updatedAt: new Date().toISOString(),
    };

    setPortfolioData(updatedData);
    saveStoredPortfolio(updatedData);
    showToast(
      `${tx.symbol} için ${tx.shares} lot ${tx.type === 'BUY' ? 'alış' : 'satış'} işlemi kaydedildi.`
    );
  };

  // Quick buy action
  const handleQuickBuy = (symbol: string) => {
    setAddModalInitialSymbol(symbol);
    setAddModalInitialType('BUY');
    setAddModalMaxSell(0);
    setIsAddModalOpen(true);
  };

  // Quick sell action
  const handleQuickSell = (symbol: string) => {
    const pos = positions.find((p) => p.symbol === symbol);
    setAddModalInitialSymbol(symbol);
    setAddModalInitialType('SELL');
    setAddModalMaxSell(pos ? pos.totalShares : 0);
    setIsAddModalOpen(true);
  };

  // Delete all transactions for a stock
  const handleDeletePosition = (symbol: string) => {
    if (confirm(`${symbol} hissesine ait tüm alım/satım işlemlerini silmek istediğinize emin misiniz?`)) {
      const updatedTransactions = portfolioData.transactions.filter(
        (tx) => tx.symbol !== symbol
      );
      const updatedData: PortfolioData = {
        ...portfolioData,
        transactions: updatedTransactions,
        updatedAt: new Date().toISOString(),
      };
      setPortfolioData(updatedData);
      saveStoredPortfolio(updatedData);
      showToast(`${symbol} portföyünüzden çıkarıldı.`);
    }
  };

  // Update cash
  const handleUpdateCash = (newCash: number) => {
    const updatedData: PortfolioData = {
      ...portfolioData,
      cash: newCash,
      updatedAt: new Date().toISOString(),
    };
    setPortfolioData(updatedData);
    saveStoredPortfolio(updatedData);
    showToast('Nakit bakiye güncellendi.');
  };

  // Import portfolio data
  const handleImportData = (data: PortfolioData) => {
    setPortfolioData(data);
    saveStoredPortfolio(data);
    showToast('Portföy yedeği başarıyla yüklendi.');
  };

  // Import notes (yedekten)
  const handleImportNotes = (incoming: Record<string, { text: string; updatedAt: string }>) => {
    setNotes(incoming);
    saveStoredNotes(incoming);
  };

  // Hisse notu kaydet/sil (boş metin = sil)
  const handleSaveNote = (symbol: string, text: string) => {
    const trimmed = text.trim();
    setNotes((prev) => {
      const next = { ...prev };
      if (!trimmed) delete next[symbol];
      else next[symbol] = { text: trimmed, updatedAt: new Date().toISOString() };
      saveStoredNotes(next);
      return next;
    });
    showToast(trimmed ? `${symbol} notu kaydedildi (PC'de saklanır).` : `${symbol} notu silindi.`);
  };

  // Reset portfolio
  const handleResetData = () => {
    localStorage.removeItem('bist_portfolio_tracker_v1');
    const initial = getStoredPortfolio();
    setPortfolioData(initial);
    showToast('Portföy varsayılan verilere sıfırlandı.', 'info');
  };

  // Mini top market ticker symbols (popular BIST bellwethers)
  const tickerStocks = useMemo(() => {
    const bellwethers = ['THYAO', 'ASELS', 'GARAN', 'EREGL', 'KCHOL', 'TUPRS', 'BIMAS', 'AKBNK', 'SASA', 'SISE'];
    return bellwethers
      .map((sym) => stocksMap[sym])
      .filter((s): s is BistStock => !!s);
  }, [stocksMap]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl shadow-emerald-500/20 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        lastUpdated={lastUpdated}
        isLoading={isLoadingStocks}
        onRefresh={() => fetchStocksData(true)}
        onOpenAddModal={() => {
          setAddModalInitialSymbol('');
          setAddModalInitialType('BUY');
          setAddModalMaxSell(0);
          setIsAddModalOpen(true);
        }}
        onOpenScreener={() => setIsScreenerOpen(true)}
        onOpenReversal={() => setIsReversalOpen(true)}
        onOpenCashModal={() => setIsCashModalOpen(true)}
        onOpenNewsModal={() => setIsNewsModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        totalStocksCount={stocks.length}
      />

      {/* Live Market Bar */}
      {tickerStocks.length > 0 && (
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center gap-5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>BIST Piyasa:</span>
            </span>
            <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
              {tickerStocks.map((st) => {
                const isPos = st.change >= 0;
                return (
                  <button
                    key={st.symbol}
                    onClick={() => setSelectedStockSymbol(st.symbol)}
                    className="flex items-center gap-1.5 hover:bg-slate-800/60 px-2 py-0.5 rounded transition-colors group cursor-pointer"
                  >
                    <span className="font-bold text-slate-200 group-hover:text-emerald-400 font-mono">
                      {st.symbol}
                    </span>
                    <span className="font-mono text-slate-300">
                      ₺{formatPrice(st.close)}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-semibold flex items-center ${
                        isPos ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(st.change)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* Error warning if TradingView API fails */}
        {fetchError && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => fetchStocksData(true)}
              className="font-bold underline hover:text-amber-200"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Portfolio Stats Key Metric Cards */}
        <PortfolioStats
          positions={positions}
          cash={portfolioData.cash}
          onOpenCashModal={() => setIsCashModalOpen(true)}
        />

        {/* Ana sekmeler: Portföy / İzleme Listesi */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setMainTab('portfolio')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'portfolio'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Portföyüm ({positions.length})</span>
          </button>
          <button
            onClick={() => setMainTab('watch')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'watch'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>İzleme Listesi ({watchlist.length})</span>
          </button>
        </div>

        {mainTab === 'portfolio' ? (
          <>
            {/* Main Holdings Table & Controls */}
            <HoldingsTable
              positions={positions}
              notes={notes}
              onSelectStock={(symbol) => setSelectedStockSymbol(symbol)}
              onBuyStock={handleQuickBuy}
              onSellStock={handleQuickSell}
              onDeleteStock={handleDeletePosition}
              onOpenAddModal={() => {
                setAddModalInitialSymbol('');
                setAddModalInitialType('BUY');
                setAddModalMaxSell(0);
                setIsAddModalOpen(true);
              }}
            />

            {/* Portfolio Allocation & Sector Breakdown */}
            <PortfolioAllocation
              positions={positions}
              cash={portfolioData.cash}
            />
          </>
        ) : (
          <Watchlist
            items={watchlist}
            stocksMap={stocksMap}
            portfolioSymbols={portfolioSymbols}
            notes={notes}
            onSelectStock={(symbol) => setSelectedStockSymbol(symbol)}
            onToggleWatch={handleToggleWatch}
            onAddToPortfolio={handleQuickBuy}
            onOpenScreener={() => setIsScreenerOpen(true)}
          />
        )}
      </main>

      {/* App Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            BIST Portföy Takip — Borsa İstanbul verileri, teknik analiz göstergeleri ve haberler TradingView üzerinden sağlanmaktadır.
          </p>
          <div className="flex items-center gap-3 text-slate-400">
            <span>{stocks.length} BIST Hissesi Listelendi</span>
            <span>•</span>
            <button
              onClick={() => setIsScreenerOpen(true)}
              className="hover:text-emerald-400 underline"
            >
              Hisseleri Keşfet
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <StockDetailModal
        stock={selectedStock}
        position={selectedPosition}
        isOpen={!!selectedStockSymbol}
        onClose={() => setSelectedStockSymbol(null)}
        onBuy={handleQuickBuy}
        onSell={handleQuickSell}
        isWatched={selectedStockSymbol ? isWatched(selectedStockSymbol) : false}
        onToggleWatch={handleToggleWatch}
        note={selectedStockSymbol ? notes[selectedStockSymbol]?.text || '' : ''}
        noteUpdatedAt={selectedStockSymbol ? notes[selectedStockSymbol]?.updatedAt : undefined}
        onSaveNote={handleSaveNote}
      />

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        allStocks={stocks}
        initialSymbol={addModalInitialSymbol}
        initialType={addModalInitialType}
        maxSellShares={addModalMaxSell}
      />

      <BistScreener
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        stocks={stocks}
        onSelectStock={(sym) => setSelectedStockSymbol(sym)}
        onAddToPortfolio={(sym) => {
          setIsScreenerOpen(false);
          handleQuickBuy(sym);
        }}
        watchlist={watchlist}
        onToggleWatch={handleToggleWatch}
        notes={notes}
      />

      <ReversalScanner
        isOpen={isReversalOpen}
        onClose={() => setIsReversalOpen(false)}
        onSelectStock={(sym) => setSelectedStockSymbol(sym)}
        onAddToPortfolio={(sym) => {
          setIsReversalOpen(false);
          handleQuickBuy(sym);
        }}
        watchlist={watchlist}
        onToggleWatch={handleToggleWatch}
      />

      <CashModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        currentCash={portfolioData.cash}
        onUpdateCash={handleUpdateCash}
      />

      <NewsFeedModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
        onSelectStock={(sym) => setSelectedStockSymbol(sym)}
      />

      <ExportImportModal        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        portfolioData={portfolioData}
        notes={notes}
        watchlist={watchlist}
        onImportData={handleImportData}
        onImportNotes={handleImportNotes}
        onImportWatchlist={(list) => {
          // Eski yedekler string[] olabilir — göçer
          const now = Date.now();
          const items: WatchItem[] = (list as any[]).map((e) =>
            typeof e === 'string' ? { symbol: e, addedAt: now } : { symbol: e.symbol, addedAt: e.addedAt || now }
          );
          setWatchlist(items);
          saveStoredWatchlist(items);
        }}
        onResetData={handleResetData}
      />
    </div>
  );
}
