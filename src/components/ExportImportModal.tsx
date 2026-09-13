import React, { useState } from 'react';
import { X, Download, Upload, RotateCcw, Copy, Check, AlertCircle } from 'lucide-react';
import { PortfolioData, NotesMap, WatchItem } from '../types';

interface BackupFile {
  version: number;
  exportedAt: string;
  portfolio: PortfolioData;
  notes?: NotesMap;
  watchlist?: WatchItem[];
}

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioData: PortfolioData;
  notes?: NotesMap;
  watchlist?: WatchItem[];
  onImportData: (data: PortfolioData) => void;
  onImportNotes?: (notes: NotesMap) => void;
  onImportWatchlist?: (list: WatchItem[] | string[]) => void;
  onResetData: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  portfolioData,
  notes,
  watchlist,
  onImportData,
  onImportNotes,
  onImportWatchlist,
  onResetData,
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const buildBackup = (): BackupFile => ({
    version: 2,
    exportedAt: new Date().toISOString(),
    portfolio: portfolioData,
    notes: notes || {},
    watchlist: watchlist || [],
  });

  const handleDownload = () => {
    const jsonString = JSON.stringify(buildBackup(), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bist_portfoy_yedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const jsonString = JSON.stringify(buildBackup(), null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    setError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      // Yeni format: { portfolio, notes?, watchlist? } — eski format: doğrudan portfolio
      const portfolio: PortfolioData = parsed.portfolio || parsed;
      if (!portfolio || !Array.isArray(portfolio.transactions)) {
        throw new Error('Geçersiz portföy verisi. transactions dizisi bulunamadı.');
      }
      onImportData(portfolio);
      if (parsed.notes && typeof parsed.notes === 'object' && onImportNotes) {
        onImportNotes(parsed.notes);
      }
      if (Array.isArray(parsed.watchlist) && onImportWatchlist) {
        onImportWatchlist(parsed.watchlist.filter((s: any) => typeof s === 'string' || (s && typeof s.symbol === 'string')));
      }
      onClose();
    } catch (err: any) {
      setError('JSON ayrıştırma hatası: ' + err.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setJsonInput(text);
      } catch (err: any) {
        setError('Dosya okunamadı: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Yedekle ve İçe/Dışa Aktar</h3>
              <p className="text-xs text-slate-400">Portföy + notlar + izleme listesi (JSON yedek)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Export section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              1. Portföyü Dışa Aktar (Yedek Al)
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                <span>JSON Dosyası İndir</span>
              </button>
              <button
                onClick={handleCopy}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>
          </div>

          {/* Import section */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              2. Yedekten Geri Yükle (İçe Aktar)
            </h4>
            <div className="space-y-2">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              <textarea
                placeholder="Veya JSON metnini buraya yapıştırın..."
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleImport}
                disabled={!jsonInput.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Yedeği Yükle</span>
              </button>
            </div>
          </div>

          {/* Reset section */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Örnek portföy verisine sıfırla:</span>
            <button
              onClick={() => {
                if (confirm('Portföyünüz varsayılan örnek verilere sıfırlanacak. Onaylıyor musunuz?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="text-rose-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
