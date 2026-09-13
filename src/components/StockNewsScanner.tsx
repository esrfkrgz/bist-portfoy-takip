import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Radio,
  Clock,
  Sparkles,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { BistStock, StockNewsItem } from '../types';
import { formatDate } from '../utils/formatters';

interface StockNewsScannerProps {
  stock: BistStock;
}

type TimeRange = '7d' | '30d' | '90d' | '1y';

export const StockNewsScanner: React.FC<StockNewsScannerProps> = ({ stock }) => {
  const [scannedNews, setScannedNews] = useState<StockNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSentiment, setFilterSentiment] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE'>('ALL');
  const [hasScanned, setHasScanned] = useState(false);

  const runScan = async (selectedRange = timeRange) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        symbol: stock.symbol,
        company: stock.description || '',
        range: selectedRange,
      });
      const res = await fetch(`/api/stock-news-scan?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setScannedNews(json.items);
      }
    } catch (err) {
      console.error('Error scanning stock news:', err);
    } finally {
      setIsLoading(false);
      setHasScanned(true);
    }
  };

  // Run initial scan on mount or when stock symbol changes
  useEffect(() => {
    runScan('30d');
  }, [stock.symbol]);

  const filteredItems = scannedNews.filter((item) => {
    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(term);
      const matchSource = item.source.toLowerCase().includes(term);
      const matchSnippet = item.snippet?.toLowerCase().includes(term);
      if (!matchTitle && !matchSource && !matchSnippet) return false;
    }

    // Sentiment filter
    if (filterSentiment !== 'ALL') {
      if (item.sentiment !== filterSentiment) return false;
    }

    return true;
  });

  const positiveCount = scannedNews.filter((i) => i.sentiment === 'POSITIVE').length;
  const negativeCount = scannedNews.filter((i) => i.sentiment === 'NEGATIVE').length;

  return (
    <div className="space-y-4">
      {/* Scanner Control Bar */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">
                  {stock.symbol} Hisse Haberleri Taraması
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                  Canlı Medya & BIST Taraması
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Finans basını, ekonomi bültenleri ve borsa platformlarında {stock.symbol} ({stock.description}) için yapılan haber taraması.
              </p>
            </div>
          </div>

          {/* Quick Scan Action */}
          <button
            onClick={() => runScan(timeRange)}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0 shadow-md shadow-emerald-500/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Taranıyor...' : 'Yeniden Tara'}</span>
          </button>
        </div>

        {/* Scan Parameters & Filter Options */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Zaman:
            </span>
            {(
              [
                { label: 'Son 7 Gün', value: '7d' },
                { label: 'Son 30 Gün', value: '30d' },
                { label: 'Son 3 Ay', value: '90d' },
                { label: 'Son 1 Yıl', value: '1y' },
              ] as const
            ).map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTimeRange(t.value);
                  runScan(t.value);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  timeRange === t.value
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sentiment Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto justify-start md:justify-end">
            <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" /> Hava:
            </span>
            <button
              onClick={() => setFilterSentiment('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                filterSentiment === 'ALL'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tümü ({scannedNews.length})
            </button>
            <button
              onClick={() => setFilterSentiment('POSITIVE')}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all ${
                filterSentiment === 'POSITIVE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Pozitif ({positiveCount})</span>
            </button>
            <button
              onClick={() => setFilterSentiment('NEGATIVE')}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all ${
                filterSentiment === 'NEGATIVE'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <TrendingDown className="w-3 h-3 text-rose-400" />
              <span>Negatif ({negativeCount})</span>
            </button>
          </div>
        </div>

        {/* In-tab Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={`Hisse haberleri içinde ara (ör: kâr, hedef fiyat, BofA, sipariş, KAP)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-400">
        <span className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {stock.symbol} araması için <strong>{filteredItems.length}</strong> haber bulundu
          </span>
        </span>
        {isLoading && (
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <RefreshCw className="w-3 h-3 animate-spin" /> Taranıyor...
          </span>
        )}
      </div>

      {/* News List */}
      {isLoading && scannedNews.length === 0 ? (
        <div className="p-12 text-center bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-300 font-medium">
            {stock.symbol} ({stock.description}) için finans ve borsa haberleri taranıyor...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-10 text-center bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 space-y-2">
          <Radio className="w-6 h-6 text-slate-600 mx-auto" />
          <p className="text-xs font-medium">
            {searchTerm
              ? 'Arama kriterinize uygun hisse haberi bulunamadı.'
              : `Seçilen dönemde (${timeRange}) ${stock.symbol} için haber kaydı bulunamadı.`}
          </p>
          {timeRange !== '1y' && (
            <button
              onClick={() => {
                setTimeRange('1y');
                runScan('1y');
              }}
              className="text-emerald-400 text-xs hover:underline mt-1 inline-block"
            >
              Daha geniş zaman aralığında (Son 1 Yıl) ara
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const isPos = item.sentiment === 'POSITIVE';
            const isNeg = item.sentiment === 'NEGATIVE';
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Source & Date & Sentiment */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                      <span className="font-semibold text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {item.source}
                      </span>
                      <span>•</span>
                      <span>{formatDate(item.published)}</span>

                      <span
                        className={`ml-auto sm:ml-2 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                          isPos
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                            : isNeg
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                            : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
                        }`}
                      >
                        {isPos ? (
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                        ) : isNeg ? (
                          <TrendingDown className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Minus className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{isPos ? 'Pozitif Ton' : isNeg ? 'Negatif Ton' : 'Nötr Ton'}</span>
                      </span>
                    </div>

                    {/* Headline */}
                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors leading-snug">
                      {item.title}
                    </h4>

                    {/* Snippet / Description if available */}
                    {item.snippet && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.snippet}
                      </p>
                    )}
                  </div>

                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0 mt-1 transition-colors" />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
