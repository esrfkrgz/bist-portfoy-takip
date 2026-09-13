import { evaluateNewsBatchWithGemini, EvaluatedNews } from './economyNewsAnalyzer.js';

interface RawNewsItem {
  id: string;
  title: string;
  source: string;
  published: string;
  url: string;
}

// In-memory cache for evaluated economy news
let economyNewsCache: {
  timestamp: number;
  news: EvaluatedNews[];
} | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache to be fast & rate-friendly

// Fallback high-impact Turkish economy news items if RSS network request fails or is blocked
const CURATED_TURKISH_ECONOMY_NEWS: RawNewsItem[] = [
  {
    id: 'curated-1',
    title: 'TCMB faiz politikası ve TL mevduat payındaki artış: Bankaların net faiz marjları toparlanma eğiliminde',
    source: 'Bloomberg HT',
    published: new Date().toISOString(),
    url: 'https://www.bloomberght.com',
  },
  {
    id: 'curated-2',
    title: 'Türkiye ihracatında Avrupa toparlanması ve sanayi üretim endeksinde aylık artış kaydedildi',
    source: 'Ekonomim',
    published: new Date(Date.now() - 3600000 * 3).toISOString(),
    url: 'https://www.ekonomim.com',
  },
  {
    id: 'curated-3',
    title: 'Havacılıkta rekor yolcu sayıları ve dış hat doluluk oranları: Turizm gelirleri beklentileri aştı',
    source: 'Anadolu Ajansı Finans',
    published: new Date(Date.now() - 3600000 * 6).toISOString(),
    url: 'https://www.aa.com.tr/tr/ekonomi',
  },
  {
    id: 'curated-4',
    title: 'Enerji Piyasası Düzenleme Kurumu (EPDK) yeni şebeke yatırımları ve depolamalı yenilenebilir enerji teşviklerini açıkladı',
    source: 'Dünya Gazetesi',
    published: new Date(Date.now() - 3600000 * 10).toISOString(),
    url: 'https://www.dunya.com',
  },
  {
    id: 'curated-5',
    title: 'Savunma ve Havacılık Sanayii İhracatı yeni rekor kırdı: Yeni uluslararası sözleşmeler imzalandı',
    source: 'TRT Haber Ekonomi',
    published: new Date(Date.now() - 3600000 * 14).toISOString(),
    url: 'https://www.trthaber.com',
  },
  {
    id: 'curated-6',
    title: 'Demir-çelik ve çimento sektöründe kentsel dönüşüm ve altyapı projeleriyle iç talep canlandı',
    source: 'Para Ajansı',
    published: new Date(Date.now() - 3600000 * 18).toISOString(),
    url: 'https://paraajansi.com.tr',
  },
  {
    id: 'curated-7',
    title: 'Otomotiv Distribütörleri ve Mobilite Derneği (ODMD): Yerli üretim araç payı ve hibrit modeller öne çıkıyor',
    source: 'Ekonomist',
    published: new Date(Date.now() - 3600000 * 22).toISOString(),
    url: 'https://www.ekonomist.com.tr',
  },
  {
    id: 'curated-8',
    title: 'Gıda perakendeciliği ve organize perakendede güçlü nakit akışı ve mağaza açılışları sürüyor',
    source: 'Investing Türkiye',
    published: new Date(Date.now() - 3600000 * 28).toISOString(),
    url: 'https://tr.investing.com',
  },
];

async function fetchGoogleNewsTurkishEconomy(): Promise<RawNewsItem[]> {
  const query = encodeURIComponent('Borsa İstanbul OR BIST OR "Türkiye ekonomisi" OR "Merkez Bankası" when:5d');
  const url = `https://news.google.com/rss/search?q=${query}&hl=tr&gl=TR&ceid=TR:tr`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Google News RSS status: ${response.status}`);
  }

  const xml = await response.text();
  const items: RawNewsItem[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (let i = 0; i < Math.min(itemMatches.length, 12); i++) {
    const itemXml = itemMatches[i];
    let title = itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
    // Clean CDATA and common suffixes
    title = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    
    // Extract source
    let source = itemXml.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '';
    if (!source && title.includes(' - ')) {
      const parts = title.split(' - ');
      source = parts[parts.length - 1];
      title = parts.slice(0, -1).join(' - ');
    }

    let link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    link = link.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');

    const pubDateStr = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();

    if (title && title.length > 10) {
      items.push({
        id: `gn-${i}-${Date.now().toString(36)}`,
        title: title.trim(),
        source: source.trim() || 'Ekonomi Basını',
        published: new Date(pubDateStr).toISOString(),
        url: link,
      });
    }
  }

  return items;
}

export async function getEvaluatedEconomyNews(forceRefresh = false): Promise<EvaluatedNews[]> {
  const now = Date.now();

  if (!forceRefresh && economyNewsCache && now - economyNewsCache.timestamp < CACHE_TTL_MS) {
    return economyNewsCache.news;
  }

  let rawNews: RawNewsItem[] = [];

  try {
    rawNews = await fetchGoogleNewsTurkishEconomy();
  } catch (err: any) {
    console.warn('Google News fetch failed, using curated Turkish economy news:', err.message);
  }

  if (rawNews.length === 0) {
    rawNews = CURATED_TURKISH_ECONOMY_NEWS;
  } else if (rawNews.length < 5) {
    // Merge curated to have plenty of varied sector impacts
    rawNews = [...rawNews, ...CURATED_TURKISH_ECONOMY_NEWS.slice(0, 5)];
  }

  // Analyze top 8 relevant economy news items with Gemini / financial rules
  const targetNews = rawNews.slice(0, 10);
  const evaluatedNews = await evaluateNewsBatchWithGemini(targetNews);

  economyNewsCache = {
    timestamp: now,
    news: evaluatedNews,
  };

  return evaluatedNews;
}

// Find economy news that specifically impact a given stock symbol
export async function getEconomyNewsForStock(symbol: string): Promise<EvaluatedNews[]> {
  const allNews = await getEvaluatedEconomyNews(false);
  const target = symbol.toUpperCase();

  return allNews.filter((news) => {
    // Check if any market impact mentions this stock
    const mentionsStock = news.impacts.some((imp) =>
      imp.affectedStocks.some((s) => s.toUpperCase() === target)
    );
    if (mentionsStock) return true;

    // Or title/summary explicitly mentions stock
    const t = `${news.title} ${news.summary}`.toUpperCase();
    return t.includes(target);
  });
}
