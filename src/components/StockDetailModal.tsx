import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Clock, 
  Newspaper, 
  BarChart3, 
  Plus, 
  Minus, 
  Building,
  Building2,
  Activity,
  Eye,
  Layers,
  Brain,
  NotebookPen,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Radio
} from 'lucide-react';
import { BistStock, PortfolioPosition, NewsItem, EconomyNewsItem, StockHistory } from '../types';
import {
  formatCurrency,
  formatPrice,
  formatPercent,
  formatLargeNumber,
  formatDate,
  getTradingViewRatingLabel
} from '../utils/formatters';
import { TradingViewTechnicalWidget } from './TradingViewWidget';
import { StockNewsScanner } from './StockNewsScanner';
import { PriceChart } from './PriceChart';
import { AiAnalysisTab } from './AiAnalysisTab';

interface StockDetailModalProps {
  stock: BistStock | null;
  position?: PortfolioPosition;
  isOpen: boolean;
  onClose: () => void;
  onBuy: (symbol: string) => void;
  onSell: (symbol: string) => void;
  isWatched?: boolean;
  onToggleWatch?: (symbol: string) => void;
  note?: string;
  noteUpdatedAt?: string;
  onSaveNote?: (symbol: string, text: string) => void;
}

// Tek değer hücresi (temel/teknik sekmelerde ortak)
const StatCell: React.FC<{
  label: string;
  display: string;
  hint?: string;
  sub?: string;
  accentClass?: string;
}> = ({ label, display, hint, sub, accentClass }) => (
  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800" title={hint}>
    <span className="text-[11px] text-slate-400 block">{label}</span>
    <span className={`text-xs sm:text-sm font-mono font-semibold text-white ${accentClass || ''}`}>
      {display}
    </span>
    {sub && <span className="text-[10px] text-slate-500 block mt-0.5">{sub}</span>}
  </div>
);

const fmtRatio = (v: number | null | undefined): string =>
  v === null || v === undefined || isNaN(v) ? '—' : v.toFixed(2);

const fmtMoney = (v: number | null | undefined): string =>
  v === null || v === undefined || isNaN(v) ? '—' : formatLargeNumber(v, true);

const fmtPct = (v: number | null | undefined): string =>
  v === null || v === undefined || isNaN(v) ? '—' : formatPercent(v);

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  stock,
  position,
  isOpen,
  onClose,
  onBuy,
  onSell,
  isWatched,
  onToggleWatch,
  note,
  noteUpdatedAt,
  onSaveNote,
}) => {
  const [activeTab, setActiveTab] = useState<'technical' | 'aianalysis' | 'fundamental' | 'scan' | 'impact' | 'news' | 'notes' | 'transactions'>('technical');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [economyNews, setEconomyNews] = useState<EconomyNewsItem[]>([]);
  const [economyNewsLoading, setEconomyNewsLoading] = useState(false);
  const [history, setHistory] = useState<StockHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note || '');
  useEffect(() => {
    if (!isOpen || !stock) return;

    const fetchStockNews = async () => {
      setNewsLoading(true);
      try {
        const res = await fetch(`/api/news?symbol=${encodeURIComponent(stock.symbol)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          setNews(json.items);
        }
      } catch (err) {
        console.error('Error fetching stock news:', err);
      } finally {
        setNewsLoading(false);
      }
    };

    const fetchEconomyNewsForStock = async () => {
      setEconomyNewsLoading(true);
      try {
        const res = await fetch(`/api/economy-news?symbol=${encodeURIComponent(stock.symbol)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          setEconomyNews(json.items);
        }
      } catch (err) {
        console.error('Error fetching economy news for stock:', err);
      } finally {
        setEconomyNewsLoading(false);
      }
    };

    fetchStockNews();
    fetchEconomyNewsForStock();
    setHistory(null);
    setNoteDraft(note || '');
  }, [isOpen, stock?.symbol]);

  // Fiyat geçmişi + indikatörler: yalnızca Teknik veya Temel sekmesi ilk açıldığında çekilir
  useEffect(() => {
    if (!isOpen || !stock) return;
    if (activeTab !== 'technical' && activeTab !== 'fundamental') return;
    if (history || historyLoading) return;
    let cancelled = false;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch(`/api/history/${encodeURIComponent(stock.symbol)}`);
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setHistory(json.data as StockHistory);
        }
      } catch (err) {
        console.error('Error fetching price history:', err);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [isOpen, stock?.symbol, activeTab]);

  if (!isOpen || !stock) return null;

  const isPositive = stock.change >= 0;
  const rating = getTradingViewRatingLabel(stock.technicalRating);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <div 
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 shrink-0 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {stock.symbol}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                BIST
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                {stock.sector || 'Sektör Bilgisi Yok'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-lg truncate">
              {stock.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-lg sm:text-xl font-mono font-black text-white">
                ₺{formatPrice(stock.close)}
              </div>
              <div
                className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{formatPercent(stock.change)}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User's Position Overview Banner (if holding this stock) */}
        {position && (
          <div className="bg-emerald-950/25 border-b border-emerald-900/30 px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Portföyünüzde:</span>
              </span>
              <span className="text-slate-300">
                Adet: <strong className="text-white font-mono">{position.totalShares.toLocaleString('tr-TR')} Lot</strong>
              </span>
              <span className="text-slate-300">
                Ort. Maliyet: <strong className="text-white font-mono">₺{formatPrice(position.averageCost)}</strong>
              </span>
              <span className="text-slate-300">
                Toplam Değer: <strong className="text-white font-mono">{formatCurrency(position.currentValue)}</strong>
              </span>
              <span className={`font-mono font-bold ${position.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                K/Z: {formatCurrency(position.unrealizedPnL)} ({formatPercent(position.unrealizedPnLPercent)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onBuy(stock.symbol)}
                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-semibold transition-colors flex items-center gap-1 text-xs"
              >
                <Plus className="w-3 h-3" />
                <span>Lot Ekle</span>
              </button>
              <button
                onClick={() => onSell(stock.symbol)}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-semibold transition-colors flex items-center gap-1 text-xs"
              >
                <Minus className="w-3 h-3" />
                <span>Sat</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Navigation Tabs - ALWAYS VISIBLE, SHADOWED, STICKY UNDER HEADER */}
        <div className="shrink-0 border-b border-slate-800 bg-slate-950/95 px-3 sm:px-4 py-2 z-10">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold pb-0.5">
            <button
              onClick={() => setActiveTab('technical')}
              className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'technical'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Teknik Analiz</span>
            </button>

            <button
              onClick={() => setActiveTab('aianalysis')}
              className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'aianalysis'
                  ? 'bg-violet-500 text-slate-950 font-bold shadow-md shadow-violet-500/20'
                  : 'bg-slate-900/80 text-violet-300 hover:text-violet-200 hover:bg-slate-800 border border-violet-500/30'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>AI Analiz</span>
            </button>

            <button
              onClick={() => setActiveTab('fundamental')}
              className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'fundamental'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Temel Analiz</span>
            </button>

            <button
              onClick={() => setActiveTab('scan')}
              className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'scan'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Hisse Haberleri Taraması</span>
              <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'scan' ? 'bg-slate-950' : 'bg-emerald-400 animate-pulse'}`} />
            </button>

            <button
              onClick={() => setActiveTab('impact')}
              className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'impact'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Piyasa & Makro Etkisi ({economyNews.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('news')}
              className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'news'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span>KAP & TV Haberleri ({news.length})</span>
            </button>

            {position && (
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'transactions'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>İşlemlerim ({position.transactions.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('notes')}
              className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'notes'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <NotebookPen className="w-4 h-4" />
              <span>Notlarım</span>
              {note && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Kayıtlı not var" />}
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Key Fundamentals Grid (Always Visible) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Gün İçi Aralık</span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-white">
                ₺{formatPrice(stock.low)} - ₺{formatPrice(stock.high)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">52 Hafta Zirve / Dip</span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-white">
                ₺{formatPrice(stock.week52Low)} - ₺{formatPrice(stock.week52High)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">İşlem Hacmi (TL)</span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-white">
                {formatLargeNumber(stock.valueTraded, true)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Günlük Lot Hacmi</span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-white">
                {formatLargeNumber(stock.volume)} Lot
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Piyasa Değeri</span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-white">
                {formatLargeNumber(stock.marketCap, true)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">F/K Oranı (P/E)</span>
              <span
                className="text-xs sm:text-sm font-mono font-semibold text-white"
                title={
                  stock.peRatio !== null
                    ? 'Son 12 ay net kârına göre F/K (TradingView TTM)'
                    : 'Şirket son 12 ayda kâr açıklamadı (zararda) veya veri yok → F/K tanımsız. TradingView, Fintables gibi tüm kaynaklarda N/A görünür.'
                }
              >
                {stock.peRatio !== null ? stock.peRatio.toFixed(2) : '—'}
              </span>
              {stock.peRatio === null && (
                <span className="text-[10px] text-slate-500 block mt-0.5">Kârsız → tanımsız</span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">PD/DD Oranı (P/B)</span>
              <span
                className="text-xs sm:text-sm font-mono font-semibold text-white"
                title="Hisse fiyatı / pay başına defter değeri (TradingView, son çeyrek)"
              >
                {stock.pbRatio !== null ? stock.pbRatio.toFixed(2) : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">TradingView Teknik</span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border inline-block ${rating.badgeClass}`}>
                {rating.label}
              </span>
            </div>
          </div>

          {/* TAB 1: Technical Analysis Widget */}
          {activeTab === 'technical' && (
            <div className="space-y-4">
              {/* Fiyat grafiği + dönem getirileri (Yahoo Finance, ücretsiz) */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-1">
                  Fiyat Grafiği — Son 2 Yıl (temettü/bölünme düzeltmeli)
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Kaynak: Yahoo Finance (15 dk gecikmeli olabilir). Getiriler XU100 ile kıyaslıdır.
                </p>
                {historyLoading && (
                  <div className="p-8 text-center text-slate-400 text-xs">Grafik yükleniyor...</div>
                )}
                {!historyLoading && !history && (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Bu hisse için fiyat geçmişi alınamadı.
                  </div>
                )}
                {history && (
                  <div className="space-y-4">
                    <PriceChart candles={history.candles} sma50={history.sma50} sma200={history.sma200} />
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 text-[11px]">
                            <th className="text-left font-medium py-1 pr-2">Dönem</th>
                            <th className="text-right font-medium py-1 px-2">Hisse</th>
                            <th className="text-right font-medium py-1 px-2">XU100</th>
                            <th className="text-right font-medium py-1 pl-2">Fark</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {(
                            [
                              ['1 Hafta', history.returns.w1],
                              ['1 Ay', history.returns.m1],
                              ['3 Ay', history.returns.m3],
                              ['6 Ay', history.returns.m6],
                              ['Yılbaşı', history.returns.ytd],
                              ['1 Yıl', history.returns.y1],
                            ] as [string, { stock: number | null; bench: number | null; rel: number | null }][]
                          ).map(([label, r]) => (
                            <tr key={label} className="border-t border-slate-800/60">
                              <td className="py-1.5 pr-2 text-slate-300 font-sans">{label}</td>
                              <td className={`text-right px-2 ${r.stock !== null && r.stock >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {r.stock !== null ? formatPercent(r.stock) : '—'}
                              </td>
                              <td className="text-right px-2 text-slate-400">
                                {r.bench !== null ? formatPercent(r.bench) : '—'}
                              </td>
                              <td className={`text-right pl-2 font-semibold ${r.rel !== null && r.rel >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {r.rel !== null ? formatPercent(r.rel) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Hesaplanan indikatör değerleri */}
              {history && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCell
                    label="RSI (14)"
                    display={history.indicators.rsi14 !== null ? history.indicators.rsi14.toFixed(1) : (stock.rsi ? stock.rsi.toFixed(1) : '—')}
                    hint="70+ aşırı alım, 30- aşırı satım bölgesi"
                    sub={history.indicators.rsi14 !== null ? (history.indicators.rsi14 >= 70 ? 'Aşırı alım' : history.indicators.rsi14 <= 30 ? 'Aşırı satım' : 'Nötr bölge') : undefined}
                  />
                  <StatCell
                    label="MACD"
                    display={history.indicators.macd !== null ? history.indicators.macd.toFixed(2) : '—'}
                    hint={`MACD çizgisi / Sinyal: ${history.indicators.macdSignal !== null ? history.indicators.macdSignal.toFixed(2) : '—'}`}
                    sub={history.indicators.macdHist !== null ? (history.indicators.macdHist >= 0 ? 'Pozitif momentum' : 'Negatif momentum') : undefined}
                    accentClass={history.indicators.macdHist !== null && history.indicators.macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                  />
                  <StatCell
                    label="Stochastic (%K / %D)"
                    display={history.indicators.stochK !== null ? `${history.indicators.stochK.toFixed(0)} / ${history.indicators.stochD !== null ? history.indicators.stochD.toFixed(0) : '—'}` : '—'}
                    hint="80+ aşırı alım, 20- aşırı satım"
                  />
                  <StatCell
                    label="Bollinger (Üst / Orta / Alt)"
                    display={history.indicators.bbMid !== null ? `${history.indicators.bbUpper !== null ? formatPrice(history.indicators.bbUpper, 1) : '—'} / ${formatPrice(history.indicators.bbMid, 1)} / ${history.indicators.bbLower !== null ? formatPrice(history.indicators.bbLower, 1) : '—'}` : '—'}
                    hint="Fiyat üst banda yakınsa direnç, alt banda yakınsa destek bölgesi"
                  />
                  <StatCell
                    label="SMA50 / SMA200"
                    display={`${history.indicators.sma50 !== null ? formatPrice(history.indicators.sma50) : '—'} / ${history.indicators.sma200 !== null ? formatPrice(history.indicators.sma200) : '—'}`}
                    hint="Fiyat ortalamaların üstündeyse trend pozitif"
                    sub={
                      history.indicators.goldenCross === null ? undefined
                      : history.indicators.goldenCross ? 'Golden cross (SMA50 > SMA200)' : 'Death cross (SMA50 < SMA200)'
                    }
                  />
                  <StatCell
                    label="ATR (14)"
                    display={history.indicators.atr14 !== null ? `₺${formatPrice(history.indicators.atr14)}` : '—'}
                    hint="Ortalama günlük oynaklık (TL). Yüksek ATR = yüksek oynaklık"
                  />
                  <StatCell
                    label="Beta (1Y, XU100'e)"
                    display={history.indicators.beta1y !== null ? history.indicators.beta1y.toFixed(2) : fmtRatio(stock.beta1y)}
                    hint="1'den büyükse endeksten daha oynak, küçükse daha sakin"
                  />
                  <StatCell
                    label="Ort. Hacim (20 gün)"
                    display={history.indicators.avgVolume20 !== null ? `${formatLargeNumber(history.indicators.avgVolume20)} Lot` : '—'}
                    hint="Son 20 günün ortalama günlük lot hacmi"
                  />
                </div>
              )}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-2">
                  TradingView Teknik Analiz ve Gösterge Sinyalleri
                </h4>                <p className="text-xs text-slate-400 mb-4">
                  Hareketli ortalamalar (MA) ve teknik osilatörler (RSI, MACD, Stokastik) hesaplamalarına dayalı konsolide sinyal.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center mb-4">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Genel Özet</span>
                    <span className={`text-sm font-bold ${rating.colorClass}`}>
                      {rating.label}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">RSI (14) Değeri</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {stock.rsi ? stock.rsi.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Hareketli Ortalamalar</span>
                    <span className="text-sm font-bold text-slate-200">
                      {stock.maRating > 0 ? 'Pozitif Trend' : 'Negatif Trend'}
                    </span>
                  </div>
                </div>
              </div>
              <TradingViewTechnicalWidget symbol={stock.symbol} height={380} />
            </div>
          )}

          {/* TAB: AI Analiz — bütüncül rapor (yön, hedefler, riskler) */}
          {activeTab === 'aianalysis' && (
            <AiAnalysisTab symbol={stock.symbol} />
          )}

          {/* TAB: Temel Analiz (TradingView finansalları: TTM + son çeyrek) */}
          {activeTab === 'fundamental' && (
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500">
                Kaynak: TradingView finansalları (TTM = son 12 ay, FQ = son çeyrek). Banka/sigorta
                gibi finans şirketlerinde satış ve FAVÖK kalemleri tanımsızdır — boş görünmesi normaldir.
              </p>

              <div>
                <h4 className="text-sm font-bold text-white mb-2">Gelir Tablosu (Son 12 Ay)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCell label="Satışlar (TTM)" display={fmtMoney(stock.revenueTtm)} />
                  <StatCell label="Brüt Kâr (TTM)" display={fmtMoney(stock.grossProfitTtm)} sub={stock.grossMarginTtm != null ? `Marj: ${formatPercent(stock.grossMarginTtm)}` : undefined} />
                  <StatCell label="Faaliyet Kârı (TTM)" display={fmtMoney(stock.operatingIncomeTtm)} sub={stock.operatingMarginTtm != null ? `Marj: ${formatPercent(stock.operatingMarginTtm)}` : undefined} />
                  <StatCell label="FAVÖK (TTM)" display={fmtMoney(stock.ebitdaTtm)} sub={stock.ebitdaMarginTtm != null ? `Marj: ${formatPercent(stock.ebitdaMarginTtm)}` : undefined} />
                  <StatCell label="Net Kâr (TTM)" display={fmtMoney(stock.netIncomeTtm)} sub={stock.netMarginTtm != null ? `Marj: ${formatPercent(stock.netMarginTtm)}` : undefined} accentClass={stock.netIncomeTtm != null && stock.netIncomeTtm < 0 ? 'text-rose-400' : undefined} />
                  <StatCell label="Hisse Başı Kâr (HBK)" display={stock.epsDilutedTtm != null ? `₺${formatPrice(stock.epsDilutedTtm)}` : '—'} hint="Seyreltilmiş HBK (TTM). Negatifse şirket zarardadır." />
                  <StatCell label="Pay Başı Satış (TTM)" display={stock.revenuePerShareTtm != null ? `₺${formatPrice(stock.revenuePerShareTtm)}` : '—'} />
                  <StatCell label="Serbest Nakit Akışı (TTM)" display={fmtMoney(stock.freeCashFlowTtm)} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-2">
                  Son Çeyrek{stock.lastEarningsDate ? ` (${formatDate(stock.lastEarningsDate)})` : ''}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <StatCell label="Çeyrek Satışlar" display={fmtMoney(stock.revenueFq)} />
                  <StatCell label="Çeyrek Net Kâr" display={fmtMoney(stock.netIncomeFq)} accentClass={stock.netIncomeFq != null && stock.netIncomeFq < 0 ? 'text-rose-400' : undefined} />
                  <StatCell label="Çeyrek FAVÖK" display={fmtMoney(stock.ebitdaFq)} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-2">Bilanço & Borçluluk (Son Çeyrek)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCell label="Toplam Varlıklar" display={fmtMoney(stock.totalAssetsFq)} />
                  <StatCell label="Toplam Yükümlülükler" display={fmtMoney(stock.totalLiabilitiesFq)} />
                  <StatCell label="Özkaynaklar" display={fmtMoney(stock.totalEquityFq)} />
                  <StatCell label="Toplam Borç" display={fmtMoney(stock.totalDebtFq)} />
                  <StatCell label="Net Borç" display={fmtMoney(stock.netDebtFq)} hint="Negatif net borç = net nakit pozisyonu (kasadaki para borçtan fazla)" />
                  <StatCell label="Cari Oran" display={fmtRatio(stock.currentRatioFq)} hint="Dönen varlıklar / kısa vadeli borçlar. 1,5+ sağlıklı kabul edilir." />
                  <StatCell label="Likidite Oranı" display={fmtRatio(stock.quickRatioFq)} hint="Asit-test oranı. 1+ kısa vadeli ödeme gücü demektir." />
                  <StatCell label="Borç / Özkaynak" display={stock.debtToEquityFq != null ? `${fmtRatio(stock.debtToEquityFq)}x` : '—'} hint="1x = borçlar özkaynağa eşit" />
                  <StatCell label="ROE (Özkaynak Kârlılığı)" display={stock.roeFq != null ? formatPercent(stock.roeFq) : '—'} hint="TradingView FQ bazlı %" />
                  <StatCell label="ROA (Aktif Kârlılığı)" display={stock.roaTtm != null ? formatPercent(stock.roaTtm) : '—'} hint="Net kâr (TTM) / toplam aktifler" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-2">Değerleme Çarpanları</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCell label="Firma Değeri (FD)" display={fmtMoney(stock.enterpriseValueFq)} hint="Piyasa değeri + net borç" />
                  <StatCell label="FD / FAVÖK" display={fmtRatio(stock.evEbitda)} hint="10 altı genelde ucuz, 15 üstü pahalı kabul edilir (sektöre göre değişir)" />
                  <StatCell label="FD / Satışlar" display={fmtRatio(stock.evSales)} />
                  <StatCell label="Fiyat / Satışlar" display={fmtRatio(stock.priceSales)} />
                  <StatCell label="Fiyat / Nakit Akışı" display={fmtRatio(stock.priceCashFlow)} />
                  <StatCell label="Fiyat / Serbest Nakit Akışı" display={fmtRatio(stock.priceFreeCashFlow)} />
                  <StatCell label="Temettü Verimi" display={stock.dividendYield != null ? formatPercent(stock.dividendYield) : '—'} hint="Yıllık temettü / fiyat" />
                  <StatCell label="Dağıtım Oranı" display={stock.payoutRatio != null ? formatPercent(stock.payoutRatio) : '—'} hint="Net kârın yüzde kaçı temettü olarak dağıtılıyor (hesaplanan)" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-2">Şirket & Takvim</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCell label="Çalışan Sayısı" display={stock.employees != null ? stock.employees.toLocaleString('tr-TR') : '—'} />
                  <StatCell label="Ödenmiş Sermaye (~)" display={fmtMoney(stock.paidCapital)} hint="Pay adedi × 1₺ nominal değerden yaklaşık hesap" />
                  <StatCell label="Fiili Dolaşım Oranı" display={stock.freeFloatPct != null ? formatPercent(stock.freeFloatPct) : '—'} hint="Halka açık payların toplama oranı (hesaplanan)" />
                  <StatCell label="Beta (1Y)" display={history?.indicators.beta1y != null ? history.indicators.beta1y.toFixed(2) : fmtRatio(stock.beta1y)} hint="XU100'e duyarlılık" />
                  <StatCell label="Son Bilanço" display={stock.lastEarningsDate ? formatDate(stock.lastEarningsDate) : '—'} />
                  <StatCell label="Beklenen Bilanço" display={stock.nextEarningsDate ? formatDate(stock.nextEarningsDate) : '—'} hint="TradingView tahmini açıklama tarihi" />
                  <StatCell label="Son Temettü" display={stock.lastDividendDate ? formatDate(stock.lastDividendDate) : '—'} />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Dedicated Stock News Scanner */}
          {activeTab === 'scan' && (
            <StockNewsScanner stock={stock} />
          )}

          {/* TAB: AI Market & Economy News Impact on this Stock */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/20 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{stock.symbol} İçin Makro & Sektörel Piyasa Etkileri</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                      Yapay Zeka Destekli
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Türkiye ekonomisini ilgilendiren güncel gelişmeler, sektör analizleri ve bu haberlerin {stock.symbol} hissesine yönelik potansiyel yansımaları.
                  </p>
                </div>
              </div>

              {economyNewsLoading ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs font-medium">Bu hisseyi ilgilendiren ekonomi haberleri ve etki analizleri yükleniyor...</p>
                </div>
              ) : economyNews.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                  <Building2 className="w-7 h-7 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-300">
                    {stock.symbol} hissesini doğrudan etkileyen son dakika makro haberi bulunmuyor.
                  </p>
                  <p className="text-xs text-slate-500">
                    Genel piyasa gelişmelerini görmek için üst menüdeki "Borsa Haberleri" butonuna göz atabilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {economyNews.map((item) => {
                    // Find impact specific to this stock or its sector
                    const matchingImpacts = item.impacts.filter(
                      (imp) =>
                        imp.affectedStocks.includes(stock.symbol) ||
                        imp.sector.toLowerCase().includes(stock.sector?.toLowerCase() || '')
                    );
                    const relevantImpacts = matchingImpacts.length > 0 ? matchingImpacts : item.impacts;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {item.category || 'Ekonomi'}
                              </span>
                              <span>{item.source}</span>
                              <span>•</span>
                              <span>{formatDate(item.published)}</span>
                            </div>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-bold text-white hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>{item.title}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            </a>
                          </div>
                        </div>

                        {/* Summary & Takeaway */}
                        <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 space-y-1 leading-relaxed">
                          <p>{item.summary}</p>
                          {item.keyTakeaway && (
                            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-medium">
                              <strong className="text-slate-300">Önemli Çıkarım:</strong> {item.keyTakeaway}
                            </p>
                          )}
                        </div>

                        {/* Impacts */}
                        <div className="space-y-1.5">
                          {relevantImpacts.map((imp, idx) => {
                            const isPos = imp.sentiment === 'POSITIVE';
                            const isNeg = imp.sentiment === 'NEGATIVE';
                            return (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                  isPos
                                    ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-200'
                                    : isNeg
                                    ? 'bg-rose-950/20 border-rose-500/25 text-rose-200'
                                    : 'bg-slate-900 border-slate-800 text-slate-300'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white flex items-center gap-1">
                                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{imp.sector}</span>
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        isPos
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : isNeg
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {isPos ? 'Pozitif Yönde Etki' : isNeg ? 'Negatif Yönde Etki' : 'Nötr'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] opacity-90">{imp.impactReason}</p>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap shrink-0">
                                  <span className="text-[10px] text-slate-400 font-medium">Hisseler:</span>
                                  {imp.affectedStocks.map((s) => (
                                    <span
                                      key={s}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                        s === stock.symbol
                                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/50'
                                          : 'bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TradingView News Feed */}
          {activeTab === 'news' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>TradingView ve KAP Haber Akışı: {stock.symbol}</span>
                {newsLoading && <span className="text-emerald-400">Yükleniyor...</span>}
              </div>

              {news.length === 0 && !newsLoading ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-sm">
                  Bu hisse için TradingView'de yayınlanan yeni haber bulunamadı.
                </div>
              ) : (
                <div className="space-y-2">
                  {news.map((item) => (
                    <a
                      key={item.id}
                      href={item.link || `https://tr.tradingview.com${item.storyPath || ''}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                          {item.title}
                        </h4>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="text-slate-400 font-medium">{item.source || item.provider}</span>
                        <span>•</span>
                        <span>{formatDate(item.published)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Hisse Notu (PC'de saklanır) */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <NotebookPen className="w-4 h-4 text-amber-400" />
                  <span>{stock.symbol} — Notlarım</span>
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Bu notlar yalnızca bu PC'de (tarayıcıda) saklanır. Örn: hedef fiyat, alım gerekçesi, takip edilecek gelişme.
                </p>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="örn. 13.50 üstü kapanışta alım düşünüyorum. Bilanço 12 Kasım'da açıklanacak, zararın azalmasını bekliyorum..."
                  rows={7}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-slate-500">
                    {noteUpdatedAt ? `Son kayıt: ${formatDate(noteUpdatedAt)}` : 'Henüz kayıt yok'}
                    {noteDraft !== (note || '') && <span className="text-amber-400"> • kaydedilmemiş değişiklik</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {note && (
                      <button
                        onClick={() => {
                          if (onSaveNote) onSaveNote(stock.symbol, '');
                          setNoteDraft('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 text-xs font-medium transition-colors"
                      >
                        Sil
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (onSaveNote) onSaveNote(stock.symbol, noteDraft);
                      }}
                      disabled={noteDraft === (note || '')}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: User's Transactions */}
          {activeTab === 'transactions' && position && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white mb-2">
                Bu Hissedeki Alış / Satış İşlemleriniz
              </h4>
              <div className="divide-y divide-slate-800 rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden">
                {position.transactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded ${
                          tx.type === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.type === 'BUY' ? 'ALIŞ' : 'SATIŞ'}
                      </span>
                      <div>
                        <div className="text-white font-medium">
                          {tx.shares.toLocaleString('tr-TR')} Lot × ₺{formatPrice(tx.price)}
                        </div>
                        {tx.note && <div className="text-slate-500 text-[11px]">{tx.note}</div>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-white">
                        ₺{formatPrice(tx.shares * tx.price)}
                      </div>
                      <div className="text-slate-500">{formatDate(tx.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            Kapat
          </button>

          <div className="flex items-center gap-2">
            {onToggleWatch && (
              <button
                onClick={() => onToggleWatch(stock.symbol)}
                title={isWatched ? 'İzleme listesinden çıkar' : 'İzleme listesine ekle (portföye almadan takip et)'}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  isWatched
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-sky-300 hover:border-sky-500/40'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{isWatched ? 'İzleniyor' : 'İzle'}</span>
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onBuy(stock.symbol);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-all shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>{position ? 'Lot Ekle (+)' : 'Portföye Ekle'}</span>
            </button>
            {position && (
              <button
                onClick={() => {
                  onClose();
                  onSell(stock.symbol);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-200 hover:text-rose-400 border border-slate-700 text-xs font-semibold transition-all"
              >
                <Minus className="w-4 h-4" />
                <span>Sat (-)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
