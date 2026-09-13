interface StockScanNewsItem {
  id: string;
  title: string;
  source: string;
  published: string;
  url: string;
  snippet?: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

function detectSentiment(text: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
  const t = text.toLowerCase();
  const positiveWords = [
    'yüksel', 'rekor', 'alım', 'artış', 'kâr', 'büyüme', 'tavan', 'hedef fiyat', 'al tavsiye', 
    'fırsat', 'ihracat', 'anlaşma', 'sözleşme', 'güçlü', 'zirve', 'prim', 'beklenti üstü', 'temettü', 'kapasite'
  ];
  const negativeWords = [
    'düşüş', 'zarar', 'satış', 'taban', 'gerile', 'kayıp', 'risk', 'ceza', 'dava', 'iptal', 
    'soruşturma', 'düşürüldü', 'kriz', 'borç', 'iflas', 'ihtar', 'uyarı'
  ];

  let posScore = 0;
  let negScore = 0;

  for (const w of positiveWords) {
    if (t.includes(w)) posScore++;
  }
  for (const w of negativeWords) {
    if (t.includes(w)) negScore++;
  }

  if (posScore > negScore) return 'POSITIVE';
  if (negScore > posScore) return 'NEGATIVE';
  return 'NEUTRAL';
}

export async function scanNewsForStock(
  symbol: string,
  companyName?: string,
  timeRange: string = '30d'
): Promise<StockScanNewsItem[]> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cleanCompany = (companyName || '').replace(/A\.Ş\.|AŞ|Ticaret|ve Sanayi|Anonim Şirketi/gi, '').trim();

  // Search query tailored to Turkish financial media & stock news
  let query = `("${cleanSymbol}"`;
  if (cleanCompany && cleanCompany.length > 3) {
    query += ` OR "${cleanCompany}"`;
  }
  query += `) AND (Borsa OR BIST OR hisse OR KAP OR piyasa) when:${timeRange}`;

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Google News RSS responded with status: ${response.status}`);
  }

  const xml = await response.text();
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const results: StockScanNewsItem[] = [];

  for (let i = 0; i < Math.min(itemMatches.length, 25); i++) {
    const itemXml = itemMatches[i];

    let title = itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
    title = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"');

    let source = itemXml.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '';
    if (!source && title.includes(' - ')) {
      const parts = title.split(' - ');
      source = parts[parts.length - 1].trim();
      title = parts.slice(0, -1).join(' - ').trim();
    }

    let link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    link = link.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();

    const pubDateStr = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();

    let description = itemXml.match(/<description>(.*?)<\/description>/)?.[1] || '';
    description = description.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();

    if (title && title.length > 5) {
      results.push({
        id: `scan-${cleanSymbol}-${i}-${Date.now().toString(36)}`,
        title: title.trim(),
        source: source.trim() || 'Finans Basını',
        published: new Date(pubDateStr).toISOString(),
        url: link,
        snippet: description || undefined,
        sentiment: detectSentiment(`${title} ${description}`),
      });
    }
  }

  return results;
}
