import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  theme?: 'dark' | 'light';
  height?: number | string;
  autosize?: boolean;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  theme = 'dark',
  height = 420,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanSymbol = (symbol || '').replace('BIST:', '').toUpperCase();
  const tvSymbol = `BIST:${cleanSymbol}`;
  const containerIdRef = useRef<string>(`tv_chart_${cleanSymbol}_${Math.random().toString(36).substring(2, 9)}`);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    const initWidget = () => {
      try {
        if (!containerRef.current || !isMounted) return;
        containerRef.current.innerHTML = '';

        if (typeof (window as any).TradingView !== 'undefined') {
          new (window as any).TradingView.widget({
            container_id: containerIdRef.current,
            width: '100%',
            height: height,
            symbol: tvSymbol,
            interval: 'D',
            timezone: 'Europe/Istanbul',
            theme: theme,
            style: '1',
            locale: 'tr',
            toolbar_bg: '#090d16',
            enable_publishing: false,
            allow_symbol_change: false,
            hide_top_toolbar: false,
            save_image: false,
            studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
          });
        } else {
          // Check if script tag is already in document
          let script = document.querySelector('script#tv-core-script') as HTMLScriptElement;
          if (!script) {
            script = document.createElement('script');
            script.id = 'tv-core-script';
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
          }

          const onLoad = () => {
            if (!isMounted || !containerRef.current) return;
            try {
              if (typeof (window as any).TradingView !== 'undefined') {
                new (window as any).TradingView.widget({
                  container_id: containerIdRef.current,
                  width: '100%',
                  height: height,
                  symbol: tvSymbol,
                  interval: 'D',
                  timezone: 'Europe/Istanbul',
                  theme: theme,
                  style: '1',
                  locale: 'tr',
                  toolbar_bg: '#090d16',
                  enable_publishing: false,
                  allow_symbol_change: false,
                  hide_top_toolbar: false,
                  save_image: false,
                  studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
                });
              }
            } catch (err) {
              console.warn('TradingView chart widget initialization caught error:', err);
              if (isMounted) setHasError(true);
            }
          };

          const onError = (e: any) => {
            console.warn('TradingView script load failed or blocked:', e);
            if (isMounted) setHasError(true);
          };

          script.addEventListener('load', onLoad, { once: true });
          script.addEventListener('error', onError, { once: true });
        }
      } catch (err) {
        console.warn('Failed to load TradingView chart:', err);
        if (isMounted) setHasError(true);
      }
    };

    const timer = setTimeout(initWidget, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tvSymbol, height, theme]);

  if (hasError) {
    return (
      <div 
        style={{ height }}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3"
      >
        <AlertCircle className="w-8 h-8 text-slate-500" />
        <p className="text-xs text-slate-400 max-w-sm">
          TradingView canlı grafik widget'ı yüklenirken bağlantı gecikmesi yaşandı.
        </p>
        <a
          href={`https://tr.tradingview.com/symbols/BIST-${cleanSymbol}/`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition-colors"
        >
          <span>TradingView'de Görüntüle</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950">
      <div id={containerIdRef.current} ref={containerRef} style={{ height }} className="w-full" />
    </div>
  );
};

interface TradingViewMiniWidgetProps {
  symbol: string;
  height?: number;
}

export const TradingViewMiniWidget: React.FC<TradingViewMiniWidgetProps> = ({
  symbol,
  height = 220,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanSymbol = (symbol || '').replace('BIST:', '').toUpperCase();

  useEffect(() => {
    let isMounted = true;
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    try {
      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      containerRef.current.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.innerHTML = JSON.stringify({
        symbol: `BIST:${cleanSymbol}`,
        width: '100%',
        height: height,
        locale: 'tr',
        dateRange: '1M',
        colorTheme: 'dark',
        isTransparent: true,
        autosize: false,
        largeChartUrl: '',
      });

      containerRef.current.appendChild(script);
    } catch (err) {
      console.warn('TradingView mini widget error:', err);
    }

    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [cleanSymbol, height]);

  return (
    <div ref={containerRef} className="tradingview-widget-container w-full overflow-hidden" />
  );
};

interface TradingViewTechnicalProps {
  symbol: string;
  height?: number;
}

export const TradingViewTechnicalWidget: React.FC<TradingViewTechnicalProps> = ({
  symbol,
  height = 380,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanSymbol = (symbol || '').replace('BIST:', '').toUpperCase();

  useEffect(() => {
    let isMounted = true;
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    try {
      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      containerRef.current.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.innerHTML = JSON.stringify({
        interval: '1D',
        width: '100%',
        isTransparent: true,
        height: height,
        symbol: `BIST:${cleanSymbol}`,
        showIntervalTabs: true,
        displayMode: 'single',
        locale: 'tr',
        colorTheme: 'dark',
      });

      containerRef.current.appendChild(script);
    } catch (err) {
      console.warn('TradingView technical widget error:', err);
    }

    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [cleanSymbol, height]);

  return (
    <div ref={containerRef} className="tradingview-widget-container w-full overflow-hidden" />
  );
};

