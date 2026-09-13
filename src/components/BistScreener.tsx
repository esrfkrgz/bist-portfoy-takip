import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  BarChart2,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Sparkles,
  Flame,
  Activity,
  Eye,
  EyeOff,
  StickyNote
} from 'lucide-react';
import { BistStock, NotesMap, WatchItem } from '../types';
import { 
  formatPrice, 
  formatPercent, 
  formatLargeNumber, 
  getTradingViewRatingLabel 
} from '../utils/formatters';

interface BistScreenerProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: BistStock[];
  onSelectStock: (symbol: string) => void;
  onAddToPortfolio: (symbol: string) => void;
  watchlist?: WatchItem[];
  onToggleWatch?: (symbol: string) => void;
  notes?: NotesMap;
}

type FilterTab = 'ALL' | 'GAINERS' | 'LOSERS' | 'VOLUME' | 'STRONG_BUY' | 'VALUE' | 'PROFITABLE';

export const BistScreener: React.FC<BistScreenerProps> = ({
  isOpen,
  onClose,
  stocks,
  onSelectStock,
  onAddToPortfolio,
  watchlist,
  onToggleWatch,
  notes,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  // Available sectors from all BIST stocks
  const sectors = useMemo(() => {
    const s = new Set<string>();
    stocks.forEach((st) => {
      if (st.sector) s.add(st.sector);
    });
    return Array.from(s).sort();
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    let list = [...stocks];

    // Filter by sector
    if (selectedSector !== 'ALL') {
      list = list.filter((st) => st.sector === selectedSector);
    }

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (st) =>
          st.symbol.toLowerCase().includes(q) ||
          st.name.toLowerCase().includes(q) ||
          st.description.toLowerCase().includes(q)
      );
    }

    // Preset tabs
    switch (activeTab) {
      case 'GAINERS':
        return list.filter((s) => s.change > 0).sort((a, b) => b.change - a.change);
      case 'LOSERS':
        return list.filter((s) => s.change < 0).sort((a, b) => a.change - b.change);
      case 'VOLUME':
        return list.sort((a, b) => b.valueTraded - a.valueTraded);
      case 'STRONG_BUY':
        return list
          .filter((s) => s.technicalRating >= 0.1)
          .sort((a, b) => b.technicalRating - a.technicalRating);
      case 'VALUE':
        // Değer: kârlı + F/K 15 altı + PD/DD 3 altı, F/K'ya göre sıralı
        return list
          .filter(
            (s) =>
              s.peRatio !== null &&
              s.peRatio !== undefined &&
              s.peRatio > 0 &&
              s.peRatio < 15 &&
              s.pbRatio !== null &&
              s.pbRatio !== undefined &&
              s.pbRatio < 3
          )
          .sort((a, b) => (a.peRatio as number) - (b.peRatio as number));
      case 'PROFITABLE':
        // Kârlılık: net marj %10 üstü + ROE %15 üstü, ROE'ye göre sıralı
        return list
          .filter(
            (s) =>
              s.netMarginTtm !== null &&
              s.netMarginTtm !== undefined &&
              s.netMarginTtm > 10 &&
              s.roeFq !== null &&
              s.roeFq !== undefined &&
              s.roeFq > 15
          )
          .sort((a, b) => (b.roeFq as number) - (a.roeFq as number));
      case 'ALL':
      default:
        return list.sort((a, b) => b.valueTraded - a.valueTraded);
    }
  }, [stocks, searchTerm, activeTab, selectedSector]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Tüm Borsa İstanbul Hisseleri
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  {stocks.length} Hisse (TradingView)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                BIST hisselerini inceleyin, teknik tavsiyeleri görün ve portföyünüze ekleyin
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

        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Hisse kodu veya şirket ara (Örn: THYAO, Tüpraş, Aselsan)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Sector filter */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="ALL">Tüm Sektörler ({sectors.length})</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Quick preset tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Tüm Hisseler
            </button>
            <button
              onClick={() => setActiveTab('GAINERS')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'GAINERS'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>En Çok Yükselenler</span>
            </button>
            <button
              onClick={() => setActiveTab('LOSERS')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'LOSERS'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'bg-slate-800/60 text-rose-400 hover:text-rose-300'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>En Çok Düşenler</span>
            </button>
            <button
              onClick={() => setActiveTab('VOLUME')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'VOLUME'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Hacim Liderleri</span>
            </button>
            <button
              onClick={() => setActiveTab('STRONG_BUY')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'STRONG_BUY'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>TradingView 'Al' Sinyali</span>
            </button>
            <button
              onClick={() => setActiveTab('VALUE')}
              title="Kârlı + F/K < 15 + PD/DD < 3 olan hisseler"
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'VALUE'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Değer Hisseleri</span>
            </button>
            <button
              onClick={() => setActiveTab('PROFITABLE')}
              title="Net marj > %10 ve ROE > %15 olan hisseler"
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'PROFITABLE'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Yüksek Kârlılık</span>
            </button>
          </div>
        </div>

        {/* Stocks List / Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider z-10">
              <tr>
                <th className="py-3 px-4">Hisse Senedi</th>
                <th className="py-3 px-4">Son Fiyat</th>
                <th className="py-3 px-4">Günlük %</th>
                <th className="py-3 px-4 hidden sm:table-cell">İşlem Hacmi (TL)</th>
                <th className="py-3 px-4 hidden md:table-cell">F/K</th>
                <th className="py-3 px-4 hidden md:table-cell">PD/DD</th>
                <th className="py-3 px-4 hidden lg:table-cell">FD/FAVÖK</th>
                <th className="py-3 px-4 hidden lg:table-cell">ROE %</th>
                <th className="py-3 px-4 text-center">TradingView</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStocks.slice(0, 150).map((st) => {
                const isPositive = st.change >= 0;
                const rating = getTradingViewRatingLabel(st.technicalRating);

                return (
                  <tr
                    key={st.symbol}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Symbol & Name */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          onClose();
                          onSelectStock(st.symbol);
                        }}
                        className="text-left group-hover:text-emerald-400 transition-colors"
                      >
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{st.symbol}</span>
                          {notes?.[st.symbol]?.text && (
                            <span title={notes[st.symbol].text.slice(0, 160)}>
                              <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-normal px-1 rounded bg-slate-800">
                            {st.sector}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[220px]">
                          {st.description}
                        </div>
                      </button>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ₺{formatPrice(st.close)}
                    </td>

                    {/* Change % */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-xs font-bold ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {formatPercent(st.change)}
                      </span>
                    </td>

                    {/* Volume (TL) */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-300 hidden sm:table-cell">
                      {formatLargeNumber(st.valueTraded, true)}
                    </td>

                    {/* F/K */}
                    <td
                      className="py-3 px-4 font-mono text-xs text-slate-400 hidden md:table-cell"
                      title="Zarardaki şirketlerde F/K tanımsızdır (N/A)"
                    >
                      {st.peRatio ? st.peRatio.toFixed(2) : '—'}
                    </td>

                    {/* PD/DD */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 hidden md:table-cell">
                      {st.pbRatio ? st.pbRatio.toFixed(2) : '—'}
                    </td>

                    {/* FD/FAVÖK */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 hidden lg:table-cell">
                      {st.evEbitda ? st.evEbitda.toFixed(2) : '—'}
                    </td>

                    {/* ROE */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 hidden lg:table-cell">
                      {st.roeFq != null ? `%${st.roeFq.toFixed(1).replace('.', ',')}` : '—'}
                    </td>

                    {/* Rating */}
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${rating.badgeClass}`}>
                        {rating.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            onClose();
                            onSelectStock(st.symbol);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Grafik ve Detaylar"
                        >
                          <BarChart2 className="w-4 h-4 text-emerald-400" />
                        </button>
                        {onToggleWatch && (
                          <button
                            onClick={() => onToggleWatch(st.symbol)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              watchlist?.some((w) => w.symbol === st.symbol)
                                ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                                : 'bg-slate-800 text-slate-400 hover:text-sky-300'
                            }`}
                            title={watchlist?.some((w) => w.symbol === st.symbol) ? 'İzlemeden çıkar' : 'İzleme listesine ekle'}
                          >
                            {watchlist?.some((w) => w.symbol === st.symbol) ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onClose();
                            onAddToPortfolio(st.symbol);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ekle</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredStocks.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              Aramanıza uygun hisse bulunamadı.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Toplam {filteredStocks.length} hisse gösteriliyor</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
