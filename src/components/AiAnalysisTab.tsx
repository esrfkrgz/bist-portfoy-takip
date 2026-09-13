import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { formatPrice, formatPercent, formatDate } from '../utils/formatters';

interface AiAnalysisTabProps {
  symbol: string;
}

interface Report {
  symbol: string;
  verdict: 'YUKSELIS' | 'DUSUS' | 'NOTR';
  confidence: number;
  score: number;
  summary: string;
  horizon: string;
  upside: { price: number | null; pct: number | null; reason: string };
  downside: { price: number | null; pct: number | null; reason: string };
  supports: number[];
  resistances: number[];
  trend: string;
  fundamental: string;
  technical: string;
  news: string;
  risks: string[];
  sources: string[];
  generatedAt: string;
  aiPowered: boolean;
}

const VERDICT = {
  YUKSELIS: { label: 'Yükseliş Yönü', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: TrendingUp },
  DUSUS: { label: 'Düşüş Yönü', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30', Icon: TrendingDown },
  NOTR: { label: 'Nötr / Kararsız', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: Minus },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
      <h4 className="text-sm font-bold text-white mb-1.5">{title}</h4>
      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{children}</p>
    </div>
  );
}

export const AiAnalysisTab: React.FC<AiAnalysisTabProps> = ({ symbol }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analysis/${encodeURIComponent(symbol)}${refresh ? '?refresh=true' : ''}`);
      const json = await res.json();
      if (json.success && json.data) setReport(json.data as Report);
      else setError(json.error || 'Analiz alınamadı');
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReport(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <Loader2 className="w-7 h-7 text-emerald-400 animate-spin mx-auto" />
        <p className="text-xs font-medium">Fiyat, bilanço, teknik göstergeler ve haberler toplanıp analiz ediliyor...</p>
        <p className="text-[11px] text-slate-500">İlk analiz 15-30 sn sürebilir (önbelleğe alınır)</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-slate-300">{error || 'Analiz alınamadı'}</p>
        <button
          onClick={() => load(true)}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  const v = VERDICT[report.verdict] || VERDICT.NOTR;
  const scorePct = ((report.score + 100) / 200) * 100;

  return (
    <div className="space-y-4">
      {/* Hüküm kartı */}
      <div className={`p-4 rounded-xl border ${v.cls} bg-opacity-40`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-base font-black">
            <v.Icon className="w-5 h-5" />
            {v.label}
          </span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-slate-900/70 text-slate-300 font-semibold">
              {report.horizon}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                report.aiPowered ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-400'
              }`}
              title={report.aiPowered ? 'Gemini ile üretildi' : 'AI kapalı: gösterge bazlı basit analiz'}
            >
              {report.aiPowered ? 'AI Analizi' : 'Ön Analiz'}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed mb-3">{report.summary}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Güven</span>
              <span className="font-mono font-bold text-white">%{report.confidence}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${report.confidence}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Düşüş ← Skor → Yükseliş</span>
              <span className="font-mono font-bold text-white">{report.score > 0 ? '+' : ''}{report.score}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden relative">
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500" />
              <div
                className={`h-full rounded-full ${report.score >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                style={report.score >= 0 ? { marginLeft: '50%', width: `${scorePct - 50}%` } : { marginRight: '50%', width: `${50 - scorePct}%`, marginLeft: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Senaryolar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/25">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mb-1">
            <Target className="w-4 h-4" /> Yükseliş Hedefi
          </div>
          <div className="text-xl font-mono font-black text-white">
            {report.upside.price != null ? `₺${formatPrice(report.upside.price)}` : '—'}
            {report.upside.pct != null && (
              <span className="text-xs text-emerald-400 ml-2">({formatPercent(report.upside.pct)})</span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{report.upside.reason}</p>
        </div>
        <div className="p-4 rounded-xl bg-rose-950/25 border border-rose-500/25">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300 mb-1">
            <Target className="w-4 h-4" /> Düşüş Hedefi
          </div>
          <div className="text-xl font-mono font-black text-white">
            {report.downside.price != null ? `₺${formatPrice(report.downside.price)}` : '—'}
            {report.downside.pct != null && (
              <span className="text-xs text-rose-400 ml-2">({formatPercent(report.downside.pct)})</span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{report.downside.reason}</p>
        </div>
      </div>

      {/* Destek / Direnç */}
      {(report.supports.length > 0 || report.resistances.length > 0) && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
          {report.resistances.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold">Dirençler:</span>
              {report.resistances.map((r, i) => (
                <span key={i} className="px-2 py-0.5 rounded font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  ₺{formatPrice(r)}
                </span>
              ))}
            </div>
          )}
          {report.supports.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold">Destekler:</span>
              {report.supports.map((s, i) => (
                <span key={i} className="px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  ₺{formatPrice(s)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <Section title="Trend">{report.trend}</Section>
      <Section title="Temel (Bilanço)">{report.fundamental}</Section>
      <Section title="Teknik">{report.technical}</Section>
      <Section title="Haber Akışı">{report.news}</Section>

      {report.risks.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/25">
          <h4 className="text-sm font-bold text-amber-200 mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Riskler
          </h4>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
            {report.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          Kaynaklar: {report.sources.join(' • ')} • {formatDate(report.generatedAt)}
        </span>
        <button
          onClick={() => load(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          <RefreshCw className="w-3 h-3" /> Yeniden Analiz Et
        </button>
      </div>

      <p className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-3 flex items-start gap-1.5">
        <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Bu sayfa veriye dayalı otomatik analizdir; olasılık diliyle konuşur, kesinlik iddia etmez.
          Yatırım tavsiyesi değildir — karar öncesi kendi araştırmanızı yapın.
        </span>
      </p>
    </div>
  );
};
