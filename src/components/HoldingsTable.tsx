import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Plus, 
  Minus, 
  BarChart2, 
  Trash2, 
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  AlertCircle,
  StickyNote
} from 'lucide-react';
import { PortfolioPosition, NotesMap } from '../types';
import { 
  formatCurrency, 
  formatPrice, 
  formatPercent, 
  getTradingViewRatingLabel 
} from '../utils/formatters';

interface HoldingsTableProps {
  positions: PortfolioPosition[];
  onSelectStock: (symbol: string) => void;
  onBuyStock: (symbol: string) => void;
  onSellStock: (symbol: string) => void;
  onDeleteStock: (symbol: string) => void;
  onOpenAddModal: () => void;
  notes?: NotesMap;
}

type SortField = 'currentValue' | 'unrealizedPnLPercent' | 'dailyChangePercent' | 'symbol' | 'portfolioWeight';
type SortOrder = 'asc' | 'desc';

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  positions,
  onSelectStock,
  onBuyStock,
  onSellStock,
  onDeleteStock,
  onOpenAddModal,
  notes,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Available sectors from current positions
  const sectors = useMemo(() => {
    const set = new Set<string>();
    positions.forEach((p) => {
      if (p.stockData?.sector) {
        set.add(p.stockData.sector);
      }
    });
    return Array.from(set);
  }, [positions]);

  // Filtered and sorted positions
  const filteredPositions = useMemo(() => {
    return positions
      .filter((pos) => {
        const matchesSearch =
          pos.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pos.stockData?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pos.stockData?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSector =
          selectedSector === 'ALL' || pos.stockData?.sector === selectedSector;

        return matchesSearch && matchesSector;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'symbol') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [positions, searchTerm, selectedSector, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (positions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center my-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Portföyünüzde henüz hisse yok</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Borsa İstanbul'daki 600'den fazla hisse arasından arama yaparak portföyünüze ekleyebilir, TradingView verileri ile anlık takip edebilirsiniz.
        </p>
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>İlk Hisse Alımını Ekle</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Portföyde ara (Örn: THYAO, Havayolları)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {sectors.length > 0 && (
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="ALL">Tüm Sektörler</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* View toggle */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Tablo Görünümü"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Kart Görünümü"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Add transaction button */}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-all shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni İşlem</span>
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-medium uppercase tracking-wider">
                <th
                  onClick={() => handleSort('symbol')}
                  className="pb-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Hisse</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="pb-3 px-3">Adet (Lot)</th>
                <th className="pb-3 px-3">Ort. Maliyet</th>
                <th className="pb-3 px-3">Son Fiyat</th>
                <th
                  onClick={() => handleSort('dailyChangePercent')}
                  className="pb-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Günlük %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('currentValue')}
                  className="pb-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Toplam Değer</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('unrealizedPnLPercent')}
                  className="pb-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Kâr / Zarar</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('portfolioWeight')}
                  className="pb-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Ağırlık</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="pb-3 px-3 text-center">Teknik</th>
                <th className="pb-3 px-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPositions.map((pos) => {
                const isProfit = pos.unrealizedPnL >= 0;
                const isDailyPositive = pos.dailyChangePercent >= 0;
                const rating = pos.stockData
                  ? getTradingViewRatingLabel(pos.stockData.technicalRating)
                  : null;

                return (
                  <tr
                    key={pos.symbol}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Hisse Kodu & Şirket */}
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => onSelectStock(pos.symbol)}
                        className="text-left group-hover:text-emerald-400 transition-colors"
                      >
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{pos.symbol}</span>
                          {notes?.[pos.symbol]?.text && (
                            <span title={notes[pos.symbol].text.slice(0, 160)}>
                              <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-normal px-1 rounded bg-slate-800">
                            BIST
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[170px]" title={pos.stockData?.description}>
                          {pos.stockData?.description || pos.symbol}
                        </div>
                      </button>
                    </td>

                    {/* Adet (Lot) */}
                    <td className="py-3.5 px-3 font-mono text-slate-200">
                      {pos.totalShares.toLocaleString('tr-TR')}
                    </td>

                    {/* Ortalama Maliyet */}
                    <td className="py-3.5 px-3 font-mono text-slate-300">
                      ₺{formatPrice(pos.averageCost)}
                    </td>

                    {/* Son Fiyat (TradingView) */}
                    <td className="py-3.5 px-3 font-mono font-semibold text-white">
                      ₺{formatPrice(pos.currentPrice)}
                    </td>

                    {/* Günlük Değişim % */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${
                          isDailyPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {formatPercent(pos.dailyChangePercent)}
                      </span>
                    </td>

                    {/* Toplam Değer */}
                    <td className="py-3.5 px-3 font-mono font-semibold text-white">
                      {formatCurrency(pos.currentValue)}
                    </td>

                    {/* Kâr / Zarar */}
                    <td className="py-3.5 px-3">
                      <div className={`font-mono font-bold text-xs ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(pos.unrealizedPnL)}
                      </div>
                      <div className={`text-[11px] font-mono ${isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                        {formatPercent(pos.unrealizedPnLPercent)}
                      </div>
                    </td>

                    {/* Portföy Ağırlığı */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-300">
                          %{pos.portfolioWeight.toFixed(1)}
                        </span>
                        <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(pos.portfolioWeight, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* TradingView Teknik Tavsiyesi */}
                    <td className="py-3.5 px-3 text-center">
                      {rating ? (
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded border font-medium ${rating.badgeClass}`}>
                          {rating.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>

                    {/* İşlemler */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectStock(pos.symbol)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Hisse Detayı & Teknik Analiz"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          onClick={() => onBuyStock(pos.symbol)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-colors"
                          title="Hisse Al (+ Lot Ekle)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSellStock(pos.symbol)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
                          title="Hisse Sat (- Lot Çıkar)"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteStock(pos.symbol)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Pozisyonu Tamamen Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredPositions.map((pos) => {
            const isProfit = pos.unrealizedPnL >= 0;
            const isDailyPositive = pos.dailyChangePercent >= 0;
            const rating = pos.stockData
              ? getTradingViewRatingLabel(pos.stockData.technicalRating)
              : null;

            return (
              <div
                key={pos.symbol}
                className="rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <button
                      onClick={() => onSelectStock(pos.symbol)}
                      className="text-left font-bold text-base text-white hover:text-emerald-400 flex items-center gap-1.5"
                    >
                      <span>{pos.symbol}</span>
                      <span className="text-[10px] font-normal px-1 rounded bg-slate-800 text-slate-400">
                        BIST
                      </span>
                    </button>
                    <div className="text-xs text-slate-400 truncate max-w-[190px]">
                      {pos.stockData?.description || pos.symbol}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-base text-white">
                      ₺{formatPrice(pos.currentPrice)}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono ${
                        isDailyPositive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {formatPercent(pos.dailyChangePercent)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-800/80 mb-3">
                  <div>
                    <span className="text-slate-500 block">Lot:</span>
                    <span className="font-mono font-medium text-slate-200">
                      {pos.totalShares.toLocaleString('tr-TR')} Adet
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Maliyet:</span>
                    <span className="font-mono font-medium text-slate-200">
                      ₺{formatPrice(pos.averageCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Toplam Değer:</span>
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(pos.currentValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kâr / Zarar:</span>
                    <span className={`font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(pos.unrealizedPnL)} ({formatPercent(pos.unrealizedPnLPercent)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {rating && (
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${rating.badgeClass}`}>
                      {rating.label}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono ml-auto">
                    Ağırlık: %{pos.portfolioWeight.toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => onSelectStock(pos.symbol)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 hover:text-white flex items-center justify-center gap-1"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Analiz & Detay</span>
                  </button>
                  <button
                    onClick={() => onBuyStock(pos.symbol)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-emerald-500/20 border border-slate-800 text-slate-300 hover:text-emerald-400"
                    title="Al"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSellStock(pos.symbol)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 border border-slate-800 text-slate-300 hover:text-rose-400"
                    title="Sat"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteStock(pos.symbol)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-900/30 border border-slate-800 text-slate-400 hover:text-rose-400"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
