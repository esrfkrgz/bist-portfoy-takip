import React, { useState, useEffect } from 'react';
import {
  X,
  Newspaper,
  ExternalLink,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Building2,
  Tag,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { EconomyNewsItem, MarketImpact } from '../types';
import { formatDate } from '../utils/formatters';

interface NewsFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock?: (symbol: string) => void;
}

export const NewsFeedModal: React.FC<NewsFeedModalProps> = ({
  isOpen,
  onClose,
  onSelectStock,
}) => {
  const [news, setNews] = useState<EconomyNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedSentiment, setSelectedSentiment] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/economy-news${refresh ? '?refresh=true' : ''}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setNews(json.items);
      } else {
        throw new Error(json.error || 'Haberler alınamadı');
      }
    } catch (err: any) {
      console.error('Error fetching economy news:', err);
      setError('Türkiye ekonomi haberleri alınırken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && news.length === 0) {
      fetchNews(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract unique sectors from evaluated news
  const availableSectors = Array.from(
    new Set(
      news.flatMap((n) => n.impacts?.map((imp) => imp.sector) || []).filter(Boolean)
    )
  );

  const filteredNews = news.filter((item) => {
    // Text search
    const matchesText =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.summary.toLowerCase().includes(search.toLowerCase()) ||
      item.source.toLowerCase().includes(search.toLowerCase()) ||
      item.impacts?.some((imp) =>
        imp.affectedStocks.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
        imp.sector.toLowerCase().includes(search.toLowerCase()) ||
        imp.impactReason.toLowerCase().includes(search.toLowerCase())
      );

    if (!matchesText) return false;

    // Sector filter
    if (selectedSector !== 'ALL') {
      const hasSector = item.impacts?.some((imp) => imp.sector === selectedSector);
      if (!hasSector) return false;
    }

    // Sentiment filter
    if (selectedSentiment !== 'ALL') {
      const hasSentiment = item.impacts?.some((imp) => imp.sentiment === selectedSentiment);
      if (!hasSentiment) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Türkiye Ekonomi & Piyasa Haberleri
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Yapay Zeka Sektör & Hisse Analizi</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Türkiye ekonomisini ilgilendiren güncel gelişmeler, olası sektör etkileri ve öne çıkan BIST hisseleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNews(true)}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Yeniden değerlendir ve güncelle"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Güncelle</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Haber, hisse kodu (ör. THYAO, GARAN), sektör veya konu ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Sentiment Quick Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setSelectedSentiment('ALL')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                  selectedSentiment === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setSelectedSentiment('POSITIVE')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 ${
                  selectedSentiment === 'POSITIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Pozitif Etki</span>
              </button>
              <button
                onClick={() => setSelectedSentiment('NEGATIVE')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 ${
                  selectedSentiment === 'NEGATIVE'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <TrendingDown className="w-3 h-3" />
                <span>Negatif Etki</span>
              </button>
            </div>
          </div>

          {/* Sector Tags Scroll */}
          {availableSectors.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <span className="text-slate-500 shrink-0 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Sektör:
              </span>
              <button
                onClick={() => setSelectedSector('ALL')}
                className={`px-2.5 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                  selectedSector === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                Tüm Sektörler
              </button>
              {availableSectors.map((sector) => (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(sector === selectedSector ? 'ALL' : sector)}
                  className={`px-2.5 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                    selectedSector === sector
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sector}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto opacity-80" />
              <div className="text-sm font-semibold text-slate-200">
                Türkiye ekonomi haberleri alınıyor ve sektör-hisse etkileri analiz ediliyor...
              </div>
              <p className="text-xs text-slate-500">
                Google News Türkiye verileri taranıyor ve BIST etkisi çıkarılıyor.
              </p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs space-y-2">
              <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
              <div>Kriterlere uygun haber bulunamadı.</div>
              {(selectedSector !== 'ALL' || selectedSentiment !== 'ALL' || search) && (
                <button
                  onClick={() => {
                    setSelectedSector('ALL');
                    setSelectedSentiment('ALL');
                    setSearch('');
                  }}
                  className="text-emerald-400 hover:underline inline-block mt-2"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          ) : (
            filteredNews.map((item) => (
              <article
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-3 shadow-md group"
              >
                {/* News Title & Link */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                      <span className="font-semibold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {item.category || 'Ekonomi'}
                      </span>
                      <span className="text-slate-300 font-medium">{item.source}</span>
                      <span>•</span>
                      <span>{formatDate(item.published)}</span>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 leading-snug"
                    >
                      <span>{item.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0 inline ml-1" />
                    </a>
                  </div>
                </div>

                {/* AI / Professional Economic Evaluation Summary */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Ekonomik Değerlendirme & Piyasa Yorumu</span>
                  </div>
                  <p>{item.summary}</p>
                  {item.keyTakeaway && (
                    <div className="text-[11px] text-slate-400 font-medium border-t border-slate-800/60 pt-1.5 mt-1.5">
                      <strong className="text-slate-300">Yatırımcı Notu:</strong> {item.keyTakeaway}
                    </div>
                  )}
                </div>

                {/* Sector & Stock Impacts Grid */}
                {item.impacts && item.impacts.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Etkilenmesi Muhtemel Sektör ve Hisseler
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {item.impacts.map((imp, idx) => {
                        const isPos = imp.sentiment === 'POSITIVE';
                        const isNeg = imp.sentiment === 'NEGATIVE';
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                              isPos
                                ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-200'
                                : isNeg
                                ? 'bg-rose-950/20 border-rose-500/25 text-rose-200'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5 text-white">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>{imp.sector}</span>
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                  isPos
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : isNeg
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {isPos ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : isNeg ? (
                                  <TrendingDown className="w-3 h-3" />
                                ) : (
                                  <Minus className="w-3 h-3" />
                                )}
                                <span>{isPos ? 'Pozitif Etki' : isNeg ? 'Negatif Etki' : 'Nötr'}</span>
                              </span>
                            </div>

                            <p className="text-[11px] opacity-90 leading-normal">
                              {imp.impactReason}
                            </p>

                            {/* Affected Stocks Clickable Pills */}
                            {imp.affectedStocks && imp.affectedStocks.length > 0 && (
                              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  İlgili Hisseler:
                                </span>
                                {imp.affectedStocks.map((sym) => (
                                  <button
                                    key={sym}
                                    onClick={() => {
                                      if (onSelectStock) {
                                        onClose();
                                        onSelectStock(sym.toUpperCase());
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30 transition-colors shadow-sm"
                                    title={`${sym} hisse detayını aç`}
                                  >
                                    {sym}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div>
            <span>Toplam </span>
            <strong className="text-white">{filteredNews.length}</strong>
            <span> ekonomi haberi listelendi.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
