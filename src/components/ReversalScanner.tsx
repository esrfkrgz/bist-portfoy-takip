import React, { useState } from 'react';
import {
  X,
  Play,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Plus,
  BarChart2,
  Loader2,
  Info,
} from 'lucide-react';
import { formatPrice, formatPercent, formatLargeNumber, formatDate } from '../utils/formatters';
import { WatchItem } from '../types';

interface ReversalScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (symbol: string) => void;
  onAddToPortfolio: (symbol: string) => void;
  watchlist?: WatchItem[];
  onToggleWatch?: (symbol: string) => void;
}

interface ScanSignal {
  key: string;
  label: string;
  detail: string;
  points: number;
}

interface ScanRow {
  symbol: string;
  close: number;
  change: number | null;
  sector: string | null;
  valueTraded: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  bullScore: number;
  bearScore: number;
  grade: 'GUCLU' | 'ORTA' | 'ZAYIF';
  direction: 'bull' | 'bear';
  score: number;
  signals: ScanSignal[];
  volumeSurge: boolean;
  rsi14: number | null;
}

const GRADE = {
  GUCLU: { label: 'Güçlü', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ORTA: { label: 'Orta', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  ZAYIF: { label: 'Zayıf', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
};

export const ReversalScanner: React.FC<ReversalScannerProps> = ({
  isOpen,
  onClose,
  onSelectStock,
  onAddToPortfolio,
  watchlist,
  onToggleWatch,
}) => {
  const [direction, setDirection] = useState('both');
  const [limit, setLimit] = useState('200');
  const [minScore, setMinScore] = useState('3');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [meta, setMeta] = useState<{ scanned: number; skipped: number; ms: number; cached: boolean } | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/reversals?direction=${direction}&limit=${limit}&minScore=${minScore}`
      );
      const json = await res.json();
      if (json.success) {
        setRows(json.results || []);
        setMeta({ scanned: json.scanned, skipped: json.skipped, ms: json.ms, cached: !!json.cached });
      } else {
        setError(json.error || 'Tarama başarısız');
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Trend-Dönüş Taraması
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                RSI uyumsuzluğu + MACD + Supertrend + EMA + hacim + yapı
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sihirli indikatör yoktur — bu tarama momentum, hacim ve fiyat yapısının birlikte teyidini puanlar.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-slate-300">
            <span>Yön</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="both">Tümü</option>
              <option value="bull">Yükseliş dönüşü</option>
              <option value="bear">Düşüş dönüşü</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-slate-300">
            <span>Evren</span>
            <select value={limit} onChange={(e) => setLimit(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="100">En likit 100</option>
              <option value="200">En likit 200</option>
              <option value="400">En likit 400</option>
              <option value="649">Tümü (~649)</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-slate-300">
            <span>Min. skor</span>
            <select value={minScore} onChange={(e) => setMinScore(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="2">2+ (gevşek)</option>
              <option value="3">3+ (üçlü teyit eşiği)</option>
              <option value="4">4+ (orta)</option>
              <option value="6">6+ (sıkı)</option>
            </select>
          </label>
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{loading ? 'Taranıyor (1-2 dk sürebilir)...' : 'Taramayı Başlat'}</span>
          </button>
          {meta && (
            <span className="text-slate-500">
              {meta.scanned} hisse tarandı{meta.skipped > 0 ? `, ${meta.skipped} atlandı` : ''} • {(meta.ms / 1000).toFixed(1)} sn
              {meta.cached ? ' • önbellek' : ''}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <div className="p-4 text-xs text-rose-300">{error}</div>}
          {!loading && rows.length === 0 && !error && (
            <div className="p-12 text-center text-slate-400 text-sm space-y-2">
              <Info className="w-6 h-6 mx-auto text-slate-600" />
              <p>Henüz tarama yapılmadı. Filtreleri seçip “Taramayı Başlat”a basın.</p>
              <p className="text-xs text-slate-500">Puanlama: RSI uyumsuzluğu 3 • MACD/Supertrend/EMA+hacim/BOS/cross 2 • Stochastic/EMA50/hacim/RSI dönüşü 1 puan. 7+ güçlü, 4-6 orta.</p>
            </div>
          )}
          {rows.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider z-10">
                <tr>
                  <th className="py-3 px-4">Hisse</th>
                  <th className="py-3 px-4">Fiyat / Günlük</th>
                  <th className="py-3 px-4">Yön / Skor</th>
                  <th className="py-3 px-4">Sinyaller</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((r) => {
                  const g = GRADE[r.grade];
                  const isBull = r.direction === 'bull';
                  return (
                    <tr key={r.symbol} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <button onClick={() => { onClose(); onSelectStock(r.symbol); }} className="text-left hover:text-emerald-400">
                          <div className="font-bold text-white font-mono">{r.symbol}</div>
                          <div className="text-xs text-slate-400">{r.sector || ''} {r.rsi14 != null ? `• RSI ${r.rsi14.toFixed(0)}` : ''}</div>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white">₺{formatPrice(r.close)}</div>
                        <div className={`font-mono text-xs font-semibold ${r.change != null && r.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.change != null ? formatPercent(r.change) : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${isBull ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' : 'bg-rose-500/10 text-rose-300 border-rose-500/25'}`}>
                            {isBull ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {r.score}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${g.cls}`}>{g.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 font-mono">B:{r.bullScore} A:{r.bearScore}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {r.signals.map((s) => (
                            <span
                              key={s.key}
                              title={`${s.detail} (+${s.points})`}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-medium border cursor-help ${
                                isBull ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25' : 'bg-rose-500/10 text-rose-200 border-rose-500/25'
                              }`}
                            >
                              {s.label} +{s.points}
                            </span>
                          ))}
                          {r.volumeSurge && (
                            <span className="px-1.5 py-0.5 rounded text-[11px] border bg-sky-500/10 text-sky-200 border-sky-500/25" title="Son bar hacmi 20 günlük ortalamanın 1.5 katından fazla">
                              Hacimli
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { onClose(); onSelectStock(r.symbol); }} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700" title="Detay">
                            <BarChart2 className="w-4 h-4 text-emerald-400" />
                          </button>
                          {onToggleWatch && (
                            <button
                              onClick={() => onToggleWatch(r.symbol)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-sky-300"
                              title={watchlist?.some((w) => w.symbol === r.symbol) ? 'İzlemeden çıkar' : 'İzle'}
                            >
                              {watchlist?.some((w) => w.symbol === r.symbol) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => { onClose(); onAddToPortfolio(r.symbol); }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1"
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
          )}
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Tarama sinyalleri olasılıksaldır; yatırım tavsiyesi değildir. Sonucu AI Analiz sekmesiyle birlikte okuyun.</span>
          <span>{rows.length > 0 ? `${rows.length} sonuç` : ''} {rows.length > 0 && `• ${formatDate(new Date().toISOString())}`}</span>
        </div>
      </div>
    </div>
  );
};
