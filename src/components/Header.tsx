import React from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  Wallet,
  Newspaper,
  Download,
  TrendingUp,
  Activity,
  Repeat
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

interface HeaderProps {
  lastUpdated: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onOpenScreener: () => void;
  onOpenReversal: () => void;
  onOpenCashModal: () => void;
  onOpenNewsModal: () => void;
  onOpenBackupModal: () => void;
  totalStocksCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  isLoading,
  onRefresh,
  onOpenAddModal,
  onOpenScreener,
  onOpenReversal,
  onOpenCashModal,
  onOpenNewsModal,
  onOpenBackupModal,
  totalStocksCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Brand & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  BIST Portföy
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    TradingView
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {totalStocksCount > 0 ? `${totalStocksCount} BIST Hissesi Aktif` : 'Borsa İstanbul'}
                </span>
                {lastUpdated && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span>Son Veri: {formatDateTime(lastUpdated)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile quick actions */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              title="Verileri Güncelle"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onOpenAddModal}
              className="p-2 rounded-lg bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400"
              title="Hisse Ekle"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all disabled:opacity-60"
            title="TradingView verilerini yeniden çek"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isLoading ? 'Güncelleniyor...' : 'Verileri Güncelle'}</span>
          </button>

          {/* Screener Button */}
          <button
            onClick={onOpenScreener}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Tüm BIST Hisseleri</span>
          </button>

          {/* Reversal Scanner Button */}
          <button
            onClick={onOpenReversal}
            title="RSI uyumsuzluğu, MACD, Supertrend, EMA, hacim ve yapı kırılımına göre dönüş sinyali tarar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-amber-500/30 text-xs font-medium text-amber-300 hover:text-amber-200 transition-all"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Dönüş Taraması</span>
          </button>

          {/* News Button */}
          <button
            onClick={onOpenNewsModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all group"
            title="Türkiye Ekonomi Haberleri & Sektör/Hisse Etkileri"
          >
            <Newspaper className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Ekonomi & Borsa Haberleri</span>
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Cash Button */}
          <button
            onClick={onOpenCashModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all"
          >
            <Wallet className="w-3.5 h-3.5 text-slate-400" />
            <span>Nakit</span>
          </button>

          {/* Backup Button */}
          <button
            onClick={onOpenBackupModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all"
            title="Portföyü İçe/Dışa Aktar"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Add Transaction Button */}
          <button
            onClick={onOpenAddModal}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>İşlem / Hisse Ekle</span>
          </button>
        </div>
      </div>
    </header>
  );
};
