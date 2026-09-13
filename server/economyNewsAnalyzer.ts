import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export interface MarketImpactData {
  sector: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  affectedStocks: string[];
  impactReason: string;
}

export interface EvaluatedNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  published: string;
  url: string;
  category: string;
  impacts: MarketImpactData[];
  keyTakeaway: string;
}

// Helper: Rule-based heuristics for fallback or instant analysis
export function ruleBasedAnalysis(title: string): { summary: string; impacts: MarketImpactData[]; keyTakeaway: string; category: string } {
  const t = title.toLowerCase();
  const impacts: MarketImpactData[] = [];
  let category = 'Makroekonomi';

  // Bankacılık & Faiz & TCMB
  if (t.includes('faiz') || t.includes('tcmb') || t.includes('merkez bank') || t.includes('enflasyon') || t.includes('mevduat') || t.includes('kredi') || t.includes('bank')) {
    category = 'Bankacılık & Finans';
    impacts.push({
      sector: 'Bankacılık & Finans',
      sentiment: t.includes('faiz indir') || t.includes('kâr') || t.includes('büyüme') ? 'POSITIVE' : t.includes('daralma') || t.includes('zarar') ? 'NEGATIVE' : 'POSITIVE',
      affectedStocks: ['GARAN', 'AKBNK', 'ISCTR', 'YKBNK', 'VAKBN', 'HALKB'],
      impactReason: 'Para politikası ve faiz marjları bankaların fonlama maliyetini, kredi hacmini ve net faiz marjlarını doğrudan şekillendirir.',
    });
  }

  // Havacılık & Turizm
  if (t.includes('havacılık') || t.includes('uçak') || t.includes('yolcu') || t.includes('turizm') || t.includes('thy') || t.includes('pegasus') || t.includes('havalimanı')) {
    category = 'Havacılık & Turizm';
    impacts.push({
      sector: 'Havacılık & Ulaştırma',
      sentiment: 'POSITIVE',
      affectedStocks: ['THYAO', 'PGSUS', 'TAVHL', 'CLEBI'],
      impactReason: 'Yolcu sayıları, dış hat dolulukları ve turizm gelirleri havacılık şirketlerinin döviz bazlı gelirlerini olumlu destekler.',
    });
  }

  // Enerji & Petrol & Rafineri
  if (t.includes('enerji') || t.includes('petrol') || t.includes('akaryakıt') || t.includes('doğalgaz') || t.includes('tüpraş') || t.includes('elektrik') || t.includes('güneş') || t.includes('rüzgar') || t.includes('epdk')) {
    category = 'Enerji & Emtia';
    impacts.push({
      sector: 'Enerji & Rafineri',
      sentiment: 'POSITIVE',
      affectedStocks: ['TUPRS', 'ENJSA', 'ASTOR', 'CWENE', 'AKSEN', 'EUPWR'],
      impactReason: 'Enerji tarifeleri, rafineri net marjları ve yenilenebilir enerji teşvikleri şirket nakit akışlarına doğrudan yansır.',
    });
  }

  // Demir Çelik & Sanayi
  if (t.includes('çelik') || t.includes('demir') || t.includes('sanayi') || t.includes('üretim') || t.includes('ihracat') || t.includes('kapasite') || t.includes('cam')) {
    category = 'Sanayi & İhracat';
    impacts.push({
      sector: 'Demir-Çelik & Ağır Sanayi',
      sentiment: 'POSITIVE',
      affectedStocks: ['EREGL', 'KRDMD', 'KCHOL', 'SISE', 'SAHOL'],
      impactReason: 'İhracat pazarlarındaki toparlanma ve emtia fiyat dengesi sanayi devlerinin kapasite ve kârlılıklarını destekler.',
    });
  }

  // Otomotiv
  if (t.includes('otomotiv') || t.includes('araç') || t.includes('oto') || t.includes('tofaş') || t.includes('ford') || t.includes('odmd')) {
    category = 'Otomotiv';
    impacts.push({
      sector: 'Otomotiv & Yan Sanayi',
      sentiment: t.includes('daralma') || t.includes('düşüş') ? 'NEGATIVE' : 'POSITIVE',
      affectedStocks: ['FROTO', 'TOASO', 'DOAS', 'TTRAK'],
      impactReason: 'İç pazar ve Avrupa pazarındaki talep ile model yenileme yatırımları hisseleri etkiler.',
    });
  }

  // Perakende & Gıda
  if (t.includes('gıda') || t.includes('market') || t.includes('perakende') || t.includes('tüketici') || t.includes('asgari') || t.includes('marketler')) {
    category = 'Tüketim & Perakende';
    impacts.push({
      sector: 'Perakende & Tüketim',
      sentiment: 'POSITIVE',
      affectedStocks: ['BIMAS', 'MGROS', 'SOKM', 'CCOLA', 'ULKER'],
      impactReason: 'Hanehalkı tüketim harcamaları ve gıda perakendeciliği enflasyonist ortamda güçlü ciro büyümesi sağlar.',
    });
  }

  // Gayrimenkul / İnşaat
  if (t.includes('konut') || t.includes('inşaat') || t.includes('emlak') || t.includes('gyo') || t.includes('kentsel dönüşüm')) {
    category = 'Gayrimenkul & GYO';
    impacts.push({
      sector: 'Gayrimenkul Yatırım Ortaklıkları (GYO)',
      sentiment: t.includes('yüksek faiz') ? 'NEGATIVE' : 'POSITIVE',
      affectedStocks: ['EKGYO', 'ISGYO', 'TRGYO', 'OYAKC'],
      impactReason: 'Konut projeleri, faiz oranları ve kentsel dönüşüm hamleleri portföy değerlemelerine ve konut satışlarına yön verir.',
    });
  }

  // Savunma
  if (t.includes('savunma') || t.includes('aselsan') || t.includes('askeri') || t.includes('ihracat anlaşması') || t.includes('nato')) {
    category = 'Savunma Sanayii';
    impacts.push({
      sector: 'Savunma Sanayii',
      sentiment: 'POSITIVE',
      affectedStocks: ['ASELS', 'SDTTR', 'OTKAR'],
      impactReason: 'Yeni sözleşmeler ve savunma sanayii ihracat rekorları uzun vadeli bakiye siparişleri ve kârlılığı artırır.',
    });
  }

  // BIST Genel
  if (t.includes('borsa') || t.includes('bist') || t.includes('yabancı') || t.includes('endeks') || t.includes('not artışı')) {
    impacts.push({
      sector: 'BIST 100 / Lokomotif Hisseler',
      sentiment: 'POSITIVE',
      affectedStocks: ['THYAO', 'GARAN', 'KCHOL', 'TUPRS', 'EREGL', 'ASELS'],
      impactReason: 'Piyasa likiditesi ve yabancı yatırımcı girişleri BIST 30 endeks ağırlığı yüksek ana hisselere yönelir.',
    });
  }

  // Default fallback if no specific rule matched
  if (impacts.length === 0) {
    impacts.push({
      sector: 'BIST 100 / Genel Piyasa',
      sentiment: 'POSITIVE',
      affectedStocks: ['THYAO', 'GARAN', 'KCHOL', 'TUPRS'],
      impactReason: 'Makroekonomik görünüm ve sektör dinamikleri endeks ağırlığı yüksek hisseleri etkilemektedir.',
    });
  }

  return {
    summary: `${title} haberi Türkiye ekonomisi ve Borsa İstanbul'daki sektör dinamikleri açısından yakından takip ediliyor.`,
    impacts,
    keyTakeaway: 'Sektörel kârlılıklar ve hisse değerlemeleri için önem taşıyan bir makro gösterge.',
    category,
  };
}

// Single-batch Gemini evaluation of multiple items at once to be fast & low-token
export async function evaluateNewsBatchWithGemini(
  items: Array<{ id: string; title: string; source: string; published: string; url: string }>
): Promise<EvaluatedNews[]> {
  const ai = getGenAIClient();

  if (!ai || items.length === 0) {
    return items.map((item) => {
      const fb = ruleBasedAnalysis(item.title);
      return {
        id: item.id,
        title: item.title,
        summary: fb.summary,
        source: item.source,
        published: item.published,
        url: item.url,
        category: fb.category,
        impacts: fb.impacts,
        keyTakeaway: fb.keyTakeaway,
      };
    });
  }

  try {
    const listText = items
      .map((item, idx) => `[${idx}] "${item.title}"`)
      .join('\n');

    const prompt = `Aşağıda Türkiye ekonomisi ve piyasalarla ilgili güncel haber başlıkları yer almaktadır:
${listText}

Bir kıdemli borsa ve finans analisti olarak her haber için:
- summary: Türkiye ekonomisine ve borsa piyasasına etkisini açıklayan 1-2 cümlelik Türkçe özet.
- keyTakeaway: BIST yatırımcısının bilmesi gereken 1 net çıkarım.
- category: 'Bankacılık' | 'Havacılık' | 'Enerji' | 'Sanayi' | 'Makroekonomi' | 'Otomotiv' | 'Savunma' | 'Perakende' | 'Gayrimenkul'.
- impacts: Etkilenmesi muhtemel Borsa İstanbul sektörleri, sentiment ('POSITIVE' | 'NEGATIVE' | 'NEUTRAL'), etkilenen BIST hisse kodları (ör. ["GARAN", "AKBNK"], ["THYAO", "PGSUS"], ["TUPRS", "ENJSA"], ["EREGL", "KRDMD"], ["ASELS"], ["FROTO", "TOASO"]) ve 1 cümlelik impactReason.

Her madde için sıra indeksiyle şu JSON formatında bir dizi döndür:
[
  {
    "index": 0,
    "summary": "...",
    "keyTakeaway": "...",
    "category": "...",
    "impacts": [
      {
        "sector": "...",
        "sentiment": "POSITIVE",
        "affectedStocks": ["..."],
        "impactReason": "..."
      }
    ]
  }
]`;

    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (res.text) {
      let rawText = res.text.trim();
      // Remove any markdown ```json ... ``` wrappers if present
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
      }
      // Extract array portion if there are extra characters
      const arrayMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const jsonToParse = arrayMatch ? arrayMatch[0] : rawText;

      const parsedArray = JSON.parse(jsonToParse);
      if (Array.isArray(parsedArray)) {
        const resultMap = new Map<number, any>();
        parsedArray.forEach((p) => {
          if (typeof p.index === 'number') resultMap.set(p.index, p);
        });

        return items.map((item, idx) => {
          const aiData = resultMap.get(idx);
          if (aiData) {
            return {
              id: item.id,
              title: item.title,
              summary: aiData.summary || item.title,
              source: item.source,
              published: item.published,
              url: item.url,
              category: aiData.category || 'Makroekonomi',
              impacts: Array.isArray(aiData.impacts) && aiData.impacts.length > 0 ? aiData.impacts : ruleBasedAnalysis(item.title).impacts,
              keyTakeaway: aiData.keyTakeaway || 'Piyasalar gelişmeyi izliyor.',
            };
          }

          const fb = ruleBasedAnalysis(item.title);
          return {
            id: item.id,
            title: item.title,
            summary: fb.summary,
            source: item.source,
            published: item.published,
            url: item.url,
            category: fb.category,
            impacts: fb.impacts,
            keyTakeaway: fb.keyTakeaway,
          };
        });
      }
    }
  } catch (err: any) {
    console.warn('Batch Gemini analysis failed, using rule-based evaluation:', err.message);
  }

  // Fallback
  return items.map((item) => {
    const fb = ruleBasedAnalysis(item.title);
    return {
      id: item.id,
      title: item.title,
      summary: fb.summary,
      source: item.source,
      published: item.published,
      url: item.url,
      category: fb.category,
      impacts: fb.impacts,
      keyTakeaway: fb.keyTakeaway,
    };
  });
}
