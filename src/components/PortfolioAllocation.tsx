import React, { useMemo } from 'react';
import { PieChart, Layers, Building2 } from 'lucide-react';
import { PortfolioPosition } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface PortfolioAllocationProps {
  positions: PortfolioPosition[];
  cash: number;
}

const COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-emerald-400',
];

export const PortfolioAllocation: React.FC<PortfolioAllocationProps> = ({
  positions,
  cash,
}) => {
  const totalStockValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalAssets = totalStockValue + cash;

  // Sector breakdown
  const sectorAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    positions.forEach((pos) => {
      const sector = pos.stockData?.sector || 'Diğer';
      map[sector] = (map[sector] || 0) + pos.currentValue;
    });

    return Object.entries(map)
      .map(([sector, value]) => ({
        sector,
        value,
        percentage: totalAssets > 0 ? (value / totalAssets) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions, totalAssets]);

  if (positions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
      {/* 1. Hisse Ağırlıkları */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Hisse Dağılımı</h3>
          </div>
          <span className="text-xs text-slate-400">
            {positions.length} Hisse Pozisyonu
          </span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800 mb-4">
          {positions.map((pos, idx) => {
            const widthPct = totalAssets > 0 ? (pos.currentValue / totalAssets) * 100 : 0;
            return (
              <div
                key={pos.symbol}
                className={`h-full rounded-sm ${COLORS[idx % COLORS.length]}`}
                style={{ width: `${Math.max(widthPct, 1)}%` }}
                title={`${pos.symbol}: %${widthPct.toFixed(1)}`}
              />
            );
          })}
          {cash > 0 && (
            <div
              className="h-full rounded-sm bg-slate-600"
              style={{ width: `${Math.max((cash / totalAssets) * 100, 1)}%` }}
              title={`Nakit: %${((cash / totalAssets) * 100).toFixed(1)}`}
            />
          )}
        </div>

        {/* List of shares */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {positions.map((pos, idx) => {
            const weight = totalAssets > 0 ? (pos.currentValue / totalAssets) * 100 : 0;
            return (
              <div
                key={pos.symbol}
                className="flex items-center justify-between text-xs py-1"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${COLORS[idx % COLORS.length]}`} />
                  <span className="font-bold text-white">{pos.symbol}</span>
                  <span className="text-slate-500 truncate max-w-[120px]">
                    {pos.stockData?.description || ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-300">{formatCurrency(pos.currentValue)}</span>
                  <span className="font-bold text-emerald-400 w-12 text-right">
                    %{weight.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
          {cash > 0 && (
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/60 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span className="font-bold text-slate-300">Nakit Bakiye</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-300">{formatCurrency(cash)}</span>
                <span className="font-bold text-slate-400 w-12 text-right">
                  %{((cash / totalAssets) * 100).toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Sektör Dağılımı */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Sektör Çeşitlendirmesi</h3>
          </div>
          <span className="text-xs text-slate-400">
            {sectorAllocation.length} Farklı Sektör
          </span>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {sectorAllocation.map((item, idx) => (
            <div key={item.sector} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium">{item.sector}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400">{formatCurrency(item.value)}</span>
                  <span className="font-bold text-emerald-400">
                    %{item.percentage.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${COLORS[idx % COLORS.length]}`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
