import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CircleDollarSign, 
  Coins, 
  PiggyBank 
} from 'lucide-react';
import { PortfolioPosition } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface PortfolioStatsProps {
  positions: PortfolioPosition[];
  cash: number;
  onOpenCashModal: () => void;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  positions,
  cash,
  onOpenCashModal,
}) => {
  const totalStockValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.totalCost, 0);
  const totalUnrealizedPnL = totalStockValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalUnrealizedPnL / totalCost) * 100 : 0;

  const totalDailyChange = positions.reduce((sum, p) => sum + p.dailyChangeAmount, 0);
  const totalDailyChangePercent = (totalStockValue - totalDailyChange) > 0 
    ? (totalDailyChange / (totalStockValue - totalDailyChange)) * 100 
    : 0;

  const totalAssets = totalStockValue + cash;
  const cashRatio = totalAssets > 0 ? (cash / totalAssets) * 100 : 0;

  const isTotalProfit = totalUnrealizedPnL >= 0;
  const isDailyProfit = totalDailyChange >= 0;

  // ---- Portföy seviyesi agregalar (ağırlıklı oranlar) ----
  const withValue = positions.filter((p) => p.currentValue > 0);
  const profitable = withValue.filter(
    (p) => p.stockData?.peRatio != null && (p.stockData.peRatio as number) > 0
  );
  const profitableValue = profitable.reduce((s, p) => s + p.currentValue, 0);
  const totalEarnings = profitable.reduce(
    (s, p) => s + p.currentValue / (p.stockData!.peRatio as number),
    0
  );
  // Portföy F/K = toplam değer / toplam kâr payı (sadece F/K'si olan kârlı hisseler)
  const portfolioPE = totalEarnings > 0 ? profitableValue / totalEarnings : null;
  const peCoverage = totalStockValue > 0 ? (profitableValue / totalStockValue) * 100 : 0;

  const weightedYield =
    totalStockValue > 0
      ? withValue.reduce(
          (s, p) => s + p.currentValue * ((p.stockData?.dividendYield ?? 0) / 100),
          0
        ) / totalStockValue * 100
      : 0;

  const betaParts = withValue.filter((p) => p.stockData?.beta1y != null);
  const betaValue = betaParts.reduce((s, p) => s + p.currentValue, 0);
  const weightedBeta =
    betaValue > 0
      ? betaParts.reduce((s, p) => s + p.currentValue * (p.stockData!.beta1y as number), 0) / betaValue
      : null;

  const sectorValues: Record<string, number> = {};
  withValue.forEach((p) => {
    const sec = p.stockData?.sector || 'Diğer';
    sectorValues[sec] = (sectorValues[sec] || 0) + p.currentValue;
  });
  const topSector = Object.entries(sectorValues).sort((a, b) => b[1] - a[1])[0];
  const topSectorPct = topSector && totalStockValue > 0 ? (topSector[1] / totalStockValue) * 100 : 0;

  return (
    <div className="space-y-3.5 mb-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Toplam Varlık */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Toplam Portföy</span>
          <Coins className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {formatCurrency(totalAssets)}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <span>Hisse: {formatCurrency(totalStockValue)}</span>
          <span>•</span>
          <span>{positions.length} Hisse</span>
        </div>
      </div>

      {/* 2. Toplam Kâr / Zarar */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Toplam Kâr / Zarar</span>
          {isTotalProfit ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          )}
        </div>
        <div className={`text-2xl font-bold tracking-tight ${isTotalProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(totalUnrealizedPnL)}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <span className={`font-semibold px-1.5 py-0.5 rounded ${isTotalProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {formatPercent(totalPnLPercent)}
          </span>
          <span className="text-slate-400">
            (Maliyet: {formatCurrency(totalCost)})
          </span>
        </div>
      </div>

      {/* 3. Günlük Getiri (TradingView Değişim) */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Günlük Değişim (Bugün)</span>
          {isDailyProfit ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          )}
        </div>
        <div className={`text-2xl font-bold tracking-tight ${isDailyProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(totalDailyChange)}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <span className={`font-semibold px-1.5 py-0.5 rounded ${isDailyProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {formatPercent(totalDailyChangePercent)}
          </span>
          <span className="text-slate-400">TradingView verisi</span>
        </div>
      </div>

      {/* 4. Nakit Bakiye */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Nakit Bakiye</span>
          <button 
            onClick={onOpenCashModal} 
            className="text-xs text-emerald-400 hover:underline hover:text-emerald-300"
          >
            Yönet
          </button>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {formatCurrency(cash)}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
          <span>Portföy Payı: %{cashRatio.toFixed(1)}</span>
          <button
            onClick={onOpenCashModal}
            className="text-slate-400 hover:text-white flex items-center gap-1"
          >
            <Wallet className="w-3 h-3" />
            <span>Nakit Ekle/Çıkar</span>
          </button>
        </div>
      </div>
      </div>

      {/* 5. Portföy Oranları (ağırlıklı) */}
      {positions.length > 0 && (
        <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">
            Portföy Oranları (pozisyon büyüklüğüne göre ağırlıklı)
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div title="Toplam hisse değeri / toplam kâr payı. Zarardaki veya F/K'siz hisseler hariç.">
              <div className="text-slate-400 mb-0.5">Portföy F/K</div>
              <div className="text-base font-mono font-bold text-white">
                {portfolioPE !== null ? portfolioPE.toFixed(2) : '—'}
              </div>
              <div className="text-slate-500 text-[11px]">Kapsama: %{peCoverage.toFixed(0)} (kârlı hisseler)</div>
            </div>
            <div title="Hisselerin temettü verimlerinin ağırlıklı ortalaması (verisi olmayanlar 0 sayılır)">
              <div className="text-slate-400 mb-0.5">Temettü Verimi</div>
              <div className="text-base font-mono font-bold text-white">
                {formatPercent(weightedYield)}
              </div>
              <div className="text-slate-500 text-[11px]">Tahmini yıllık temettü: {formatCurrency(totalStockValue * weightedYield / 100)}</div>
            </div>
            <div title="1'den büyükse portföy endeksten oynak, küçükse sakin">
              <div className="text-slate-400 mb-0.5">Portföy Beta (XU100)</div>
              <div className="text-base font-mono font-bold text-white">
                {weightedBeta !== null ? weightedBeta.toFixed(2) : '—'}
              </div>
              <div className="text-slate-500 text-[11px]">Endekse duyarlılık</div>
            </div>
            <div title="En büyük sektörün portföydeki payı — yüksekse tek sektöre bağımlılık riski">
              <div className="text-slate-400 mb-0.5">En Yoğun Sektör</div>
              <div className="text-base font-bold text-white truncate">
                {topSector ? topSector[0] : '—'}
              </div>
              <div className={`text-[11px] font-semibold ${topSectorPct >= 50 ? 'text-amber-400' : 'text-slate-500'}`}>
                %{topSectorPct.toFixed(0)} {topSectorPct >= 50 ? '• Yoğunlaşma riski' : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
