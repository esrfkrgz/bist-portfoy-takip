import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  Calendar, 
  DollarSign, 
  FileText,
  AlertCircle,
  TrendingUp,
  Coins
} from 'lucide-react';
import { BistStock, Transaction, TransactionType } from '../types';
import { formatPrice, formatPercent } from '../utils/formatters';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  allStocks: BistStock[];
  initialSymbol?: string;
  initialType?: TransactionType;
  maxSellShares?: number;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  allStocks,
  initialSymbol = '',
  initialType = 'BUY',
  maxSellShares = 0,
}) => {
  const [symbolQuery, setSymbolQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<BistStock | null>(null);
  const [type, setType] = useState<TransactionType>(initialType);
  const [shares, setShares] = useState<string>('100');
  const [price, setPrice] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When initialSymbol is provided, select it
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setError(null);
      if (initialSymbol) {
        const found = allStocks.find(
          (s) => s.symbol.toUpperCase() === initialSymbol.toUpperCase()
        );
        if (found) {
          setSelectedStock(found);
          setSymbolQuery(found.symbol);
          setPrice(found.close ? String(found.close) : '');
        } else {
          setSymbolQuery(initialSymbol);
        }
      } else {
        setSelectedStock(null);
        setSymbolQuery('');
        setPrice('');
      }
    }
  }, [isOpen, initialSymbol, initialType, allStocks]);

  // Autocomplete matching stocks from all 649 BIST stocks
  const searchResults = useMemo(() => {
    if (!symbolQuery.trim()) return allStocks.slice(0, 8);
    const query = symbolQuery.trim().toLowerCase();
    return allStocks
      .filter(
        (s) =>
          s.symbol.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [symbolQuery, allStocks]);

  const handleSelectStock = (stock: BistStock) => {
    setSelectedStock(stock);
    setSymbolQuery(stock.symbol);
    setPrice(String(stock.close || ''));
    setShowDropdown(false);
    setError(null);
  };

  const parsedShares = parseFloat(shares) || 0;
  const parsedPrice = parseFloat(price.replace(',', '.')) || 0;
  const totalAmount = parsedShares * parsedPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const symbol = (selectedStock?.symbol || symbolQuery).toUpperCase().trim();

    if (!symbol) {
      setError('Lütfen bir hisse senedi seçin.');
      return;
    }

    if (parsedShares <= 0) {
      setError('Lütfen geçerli bir lot (adet) sayısı girin.');
      return;
    }

    if (parsedPrice <= 0) {
      setError('Lütfen geçerli bir hisse fiyatı girin.');
      return;
    }

    if (type === 'SELL' && maxSellShares > 0 && parsedShares > maxSellShares) {
      setError(`Portföyünüzde sadece ${maxSellShares} lot bulunuyor. Daha fazla satamazsınız.`);
      return;
    }

    onAddTransaction({
      symbol,
      type,
      shares: parsedShares,
      price: parsedPrice,
      totalAmount,
      date,
      note: note.trim() || undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                type === 'BUY'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {type === 'BUY' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {type === 'BUY' ? 'Hisse Alımı (Portföye Ekle)' : 'Hisse Satışı (Lot Çıkar)'}
              </h3>
              <p className="text-xs text-slate-400">
                TradingView verileri ile portföy takibi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Type Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'BUY'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Alış (BUY)
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'SELL'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satış (SELL)
            </button>
          </div>

          {/* Stock Search Input with Dropdown */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              BIST Hisse Senedi Kodu *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Örn: THYAO, ASELS, GARAN, SASA..."
                value={symbolQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSymbolQuery(e.target.value);
                  setShowDropdown(true);
                  const exact = allStocks.find(
                    (s) => s.symbol.toUpperCase() === e.target.value.toUpperCase().trim()
                  );
                  if (exact) {
                    setSelectedStock(exact);
                    if (!price) setPrice(String(exact.close));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white uppercase placeholder:normal-case placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>

            {/* Dropdown list */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                {searchResults.map((stock) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => handleSelectStock(stock)}
                    className="w-full p-2.5 text-left hover:bg-slate-800/80 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{stock.symbol}</span>
                        <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400">
                          {stock.sector}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {stock.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-semibold text-white">
                        ₺{formatPrice(stock.close)}
                      </div>
                      <div
                        className={`text-[10px] font-mono font-semibold ${
                          stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPercent(stock.change)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Stock TradingView Quick Stats Banner */}
          {selectedStock && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">TradingView Fiyatı:</span>
                <span className="font-mono font-bold text-white text-sm">
                  ₺{formatPrice(selectedStock.close)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Günlük Değişim:</span>
                <span
                  className={`font-mono font-bold text-xs ${
                    selectedStock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatPercent(selectedStock.change)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrice(String(selectedStock.close))}
                className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium"
              >
                Fiyatı Kullan
              </button>
            </div>
          )}

          {/* Shares & Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Adet (Lot) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="100"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
              {type === 'SELL' && maxSellShares > 0 && (
                <div className="text-[11px] text-slate-400 mt-1">
                  Mevcut: <strong className="text-white">{maxSellShares} Lot</strong>
                  <button
                    type="button"
                    onClick={() => setShares(String(maxSellShares))}
                    className="ml-2 text-emerald-400 hover:underline"
                  >
                    Tümünü Sat
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Birim Fiyat (₺) *
              </label>
              <input
                type="text"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Date & Note Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                İşlem Tarihi
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Açıklama / Not
              </label>
              <input
                type="text"
                placeholder="Örn: Temettü yatırımı, düşüş alımı"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Total Calculation Display */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Toplam İşlem Tutarı:</span>
            <span className="text-base font-mono font-bold text-white">
              ₺{formatPrice(totalAmount)}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
              type === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
            }`}
          >
            {type === 'BUY' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            <span>
              {type === 'BUY'
                ? `₺${formatPrice(totalAmount)} İle Portföye Ekle`
                : `${parsedShares} Lot Satışı Onayla`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
