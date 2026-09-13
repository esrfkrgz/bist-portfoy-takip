import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus, TrendingUp, TrendingDown, Search, StickyNote } from 'lucide-react';
import { BistStock, NotesMap, WatchItem } from '../types';
import { formatPrice, formatPercent, formatLargeNumber, formatDate } from '../utils/formatters';

interface WatchPerf {
  entryPrice: number | null;
  entryDate: number | null;
  currentPrice: number | null;
  pct: number | null;
}

interface WatchlistProps {
  items: WatchItem[];
  stocksMap: Record<string, BistStock>;
  portfolioSymbols: Set<string>;
  onSelectStock: (symbol: string) => void;
  onToggleWatch: (symbol: string) => void;
  onAddToPortfolio: (symbol: string) => void;
  onOpenScreener: () => void;
  notes?: NotesMap;
}

export const Watchlist: React.FC<WatchlistProps> = ({
  items,
  stocksMap,
  portfolioSymbols,
  onSelectStock,
  onToggleWatch,
  onAddToPortfolio,
  onOpenScreener,
  notes,
}) => {
  const [perf, setPerf] = useState<Record<string, WatchPerf>>({});

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    fetch('/api/watch-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.success) return;
        const map: Record<string, WatchPerf> = {};
        (json.data || []).forEach((d: any) => {
          map[d.symbol] = {
            entryPrice: d.entryPrice,
            entryDate: d.entryDate,
            currentPrice: d.currentPrice,
            pct: d.pct,
          };
        });
        setPerf(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/90 p-10 text-center">
        <Eye className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white mb-1">İzleme listeniz boş</h3>
        <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
          Portföyünüzde olmayan ama takip etmek istediğiniz hisseleri buraya ekleyin.
          Fiyatları canlı takip edin, hazır olunca tek tıkla portföye alın.
        </p>
        <button
          onClick={onOpenScreener}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
        >
          <Search className="w-4 h-4" />
          <span>Hisse Keşfet ve Ekle</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/90 overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-400" />
            <span>İzleme Listesi</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {items.length} Hisse
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Portföyde yok — sadece takip ediliyor. Fiyatlar canlı (TradingView).
          </p>
        </div>
        <button
          onClick={onOpenScreener}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ekle</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Hisse</th>
              <th className="py-3 px-4">Son Fiyat</th>
              <th className="py-3 px-4">Günlük %</th>
              <th className="py-3 px-4 hidden sm:table-cell">Hacim (TL)</th>
              <th className="py-3 px-4 hidden md:table-cell">F/K</th>
              <th className="py-3 px-4 hidden md:table-cell">PD/DD</th>
              <th className="py-3 px-4 hidden lg:table-cell">Eklenme</th>
              <th className="py-3 px-4 hidden lg:table-cell">Eklenmeden Beri</th>
              <th className="py-3 px-4 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map((item) => {
              const sym = item.symbol;
              const st = stocksMap[sym];
              const p = perf[sym];
              const isPos = (st?.change ?? 0) >= 0;
              const sincePos = (p?.pct ?? 0) >= 0;
              const inPortfolio = portfolioSymbols.has(sym);
              return (
                <tr key={sym} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <button onClick={() => onSelectStock(sym)} className="text-left hover:text-emerald-400 transition-colors">
                      <div className="font-bold text-white font-mono flex items-center gap-1.5">
                        <span>{sym}</span>
                        {notes?.[sym]?.text && (
                          <span title={notes[sym].text.slice(0, 160)}>
                            <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[220px]">
                        {st ? st.description : 'Veri bekleniyor...'}
                      </div>
                    </button>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {st ? `₺${formatPrice(st.close)}` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    {st ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-bold ${
                          isPos
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(st.change)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-300 hidden sm:table-cell">
                    {st ? formatLargeNumber(st.valueTraded, true) : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400 hidden md:table-cell">
                    {st?.peRatio ? st.peRatio.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400 hidden md:table-cell">
                    {st?.pbRatio ? st.pbRatio.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400 hidden lg:table-cell whitespace-nowrap" title={p?.entryPrice != null ? `Giriş fiyatı: ₺${formatPrice(p.entryPrice)}` : 'Giriş fiyatı bekleniyor'}>
                    {formatDate(item.addedAt)}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    {p?.pct != null ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-bold ${
                          sincePos
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                        title={p.entryPrice != null ? `Giriş: ₺${formatPrice(p.entryPrice)} → Şimdi: ₺${formatPrice(p.currentPrice)}` : undefined}
                      >
                        {sincePos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(p.pct)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">…</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!inPortfolio && (
                        <button
                          onClick={() => onAddToPortfolio(sym)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                          title="Portföye ekle (alış işlemi)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Portföye Al</span>
                        </button>
                      )}
                      <button
                        onClick={() => onToggleWatch(sym)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-400"
                        title={inPortfolio ? 'Zaten portföyde — izlemeden çıkar' : 'İzlemeden çıkar'}
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
