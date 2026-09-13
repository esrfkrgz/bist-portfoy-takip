import React, { useMemo } from 'react';
import { HistoryCandle } from '../types';

interface PriceChartProps {
  candles: HistoryCandle[];
  sma50: (number | null)[];
  sma200: (number | null)[];
  height?: number;
}

// Bağımlılıksız SVG çizgi grafik: kapanış + SMA50/SMA200
export const PriceChart: React.FC<PriceChartProps> = ({
  candles,
  sma50,
  sma200,
  height = 220,
}) => {
  const W = 800;
  const H = 260;
  const PAD = { l: 8, r: 64, t: 12, b: 22 };

  const model = useMemo(() => {
    if (!candles.length) return null;
    const closes = candles.map((c) => c.c);
    const all: number[] = [...closes];
    sma50.forEach((v) => v !== null && all.push(v));
    sma200.forEach((v) => v !== null && all.push(v));
    let min = Math.min(...all);
    let max = Math.max(...all);
    if (min === max) {
      min *= 0.99;
      max *= 1.01;
    }
    const padY = (max - min) * 0.06;
    min -= padY;
    max += padY;
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const x = (i: number) => PAD.l + (candles.length === 1 ? iw / 2 : (i / (candles.length - 1)) * iw);
    const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * ih;

    const line = (vals: (number | null)[] | number[]): string => {
      let d = '';
      let started = false;
      for (let i = 0; i < vals.length; i++) {
        const v = vals[i];
        if (v === null || v === undefined || isNaN(v)) {
          started = false;
          continue;
        }
        d += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
        started = true;
      }
      return d;
    };

    // Alan dolgusu (kapanış çizgisi altı)
    const area = line(closes) + `L${x(candles.length - 1).toFixed(1)},${(PAD.t + ih).toFixed(1)} L${x(0).toFixed(1)},${(PAD.t + ih).toFixed(1)} Z`;

    const up = closes[closes.length - 1] >= closes[0];

    // X ekseni: haftalık (Pazartesi) işaretler — en fazla ~8 etiket
    const ticks: { i: number; label: string }[] = [];
    {
      const n = candles.length;
      const weeksTotal = Math.max(1, Math.round(n / 5));
      const everyWeeks = Math.max(1, Math.round(weeksTotal / 8));
      const step = everyWeeks * 5;
      // ilk Pazartesi'yi bul
      let firstMonday = 0;
      for (let k = 0; k < Math.min(n, 7); k++) {
        if (new Date(candles[k].t * 1000).getDay() === 1) {
          firstMonday = k;
          break;
        }
      }
      for (let k = firstMonday; k < n; k += step) {
        const d = new Date(candles[k].t * 1000);
        const label =
          d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) +
          (d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(2)}` : '');
        ticks.push({ i: k, label });
      }
      // son bar her zaman etiketlensin
      const lastTick = ticks[ticks.length - 1];
      if (!lastTick || lastTick.i < n - 1) {
        const d = new Date(candles[n - 1].t * 1000);
        ticks.push({
          i: n - 1,
          label: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        });
      }
    }

    return { min, max, x, y, line, area, up, closes, ticks };
  }, [candles, sma50, sma200]);

  if (!model) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">Grafik verisi yok</div>
    );
  }

  const last = model.closes[model.closes.length - 1];
  const fmtTick = (v: number) =>
    v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => model.min + (model.max - model.min) * f);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="pcFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={model.up ? '#10b981' : '#f43f5e'}
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor={model.up ? '#10b981' : '#f43f5e'}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={model.y(t)}
              y2={model.y(t)}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={W - PAD.r + 5}
              y={model.y(t) + 3}
              fill="#64748b"
              fontSize="11"
              fontFamily="monospace"
            >
              {fmtTick(t)}
            </text>
          </g>
        ))}

        <path d={model.area} fill="url(#pcFill)" />
        {model.line(sma200) && (
          <path d={model.line(sma200)} fill="none" stroke="#f59e0b" strokeWidth="1.6" />
        )}
        {model.line(sma50) && (
          <path d={model.line(sma50)} fill="none" stroke="#38bdf8" strokeWidth="1.6" />
        )}
        <path
          d={model.line(model.closes)}
          fill="none"
          stroke={model.up ? '#34d399' : '#fb7185'}
          strokeWidth="2"
        />

        <circle
          cx={model.x(candles.length - 1)}
          cy={model.y(last)}
          r="4"
          fill={model.up ? '#34d399' : '#fb7185'}
          stroke="#0f172a"
          strokeWidth="2"
        />

        {model.ticks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={model.x(t.i)}
              x2={model.x(t.i)}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.7"
            />
            <text
              x={model.x(t.i)}
              y={H - 6}
              fill="#64748b"
              fontSize="11"
              textAnchor={idx === 0 ? 'start' : idx === model.ticks.length - 1 ? 'end' : 'middle'}
            >
              {t.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Kapanış (düzeltilmiş)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-sky-400 inline-block" /> SMA50
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-amber-400 inline-block" /> SMA200
        </span>
      </div>
    </div>
  );
};
