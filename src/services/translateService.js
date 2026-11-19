// Cache em memória de traduções para resposta imediata
const songTranslationCache = new Map();
const clientVerseCache = new Map();

export const SUPPORTED_LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' }
];

function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`');
}

function stripLeakedLanguageSuffix(text, originalText = '') {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\s*\b(en|pt|es|fr|de|it|ja|ko)\b$/i, (match, code) => {
      const origEnds = (originalText || '').trim().toLowerCase().endsWith(code.toLowerCase());
      return origEnds ? match : '';
    })
    .trim();
}

function isErrorString(str) {
  if (!str || typeof str !== 'string') return true;
  const upper = str.toUpperCase();
  return (
    upper.includes('QUERY LENGTH') ||
    upper.includes('MYMEMORY') ||
    upper.includes('LIMIT EXCEED') ||
    upper.includes('INVALID') ||
    upper.includes('TOO MANY REQUESTS') ||
    upper.includes('DAILY LIMIT') ||
    upper.includes('QUOTA')
  );
}

// Gateway 1: Google Translate GTX
async function fetchGoogleGtx(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google GTX returned ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Invalid format');
  const translated = data[0].map((item) => item[0]).join('');
  if (isErrorString(translated)) throw new Error('Error string detected');
  return stripLeakedLanguageSuffix(decodeHtmlEntities(translated.trim()), text);
}

// Gateway 2: Google Dict API
async function fetchGoogleDict(text, targetLang) {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(targetLang)}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Dict returned ${res.status}`);
  const data = await res.json();
  let translated = '';
  if (Array.isArray(data)) {
    if (Array.isArray(data[0])) {
      translated = typeof data[0][0] === 'string' ? data[0][0] : data[0][0]?.toString() || '';
    } else if (typeof data[0] === 'string') {
      translated = data[0];
    } else {
      translated = data.join('');
    }
  } else if (typeof data === 'string') {
    translated = data;
  }
  if (isErrorString(translated)) throw new Error('Error string detected');
  return stripLeakedLanguageSuffix(decodeHtmlEntities(translated.trim()), text);
}

// Gateway 3: MyMemory
async function fetchMyMemory(text, targetLang) {
  if (text.length > 350) throw new Error('Query too large for MyMemory');
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${encodeURIComponent(targetLang)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory returned ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated || isErrorString(translated)) throw new Error('MyMemory invalid response');
  return stripLeakedLanguageSuffix(decodeHtmlEntities(translated.trim()), text);
}

/**
 * Traduz um único verso individualmente testando múltiplos gateways em cascata.
 */
async function translateSingleLineWithFallbacks(text, targetLang) {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed === '♪' || /^\[.*\]$/.test(trimmed)) {
    return text;
  }

  const cacheKey = `${trimmed}___${targetLang}`;
  if (clientVerseCache.has(cacheKey)) {
    return clientVerseCache.get(cacheKey);
  }

  // 1. Google GTX
  try {
    const res = await fetchGoogleGtx(trimmed, targetLang);
    if (res) {
      clientVerseCache.set(cacheKey, res);
      return res;
    }
  } catch {}

  // 2. Google Dict
  try {
    const res = await fetchGoogleDict(trimmed, targetLang);
    if (res) {
      clientVerseCache.set(cacheKey, res);
      return res;
    }
  } catch {}

  // 3. MyMemory (para versos curtos)
  if (trimmed.length <= 350) {
    try {
      const res = await fetchMyMemory(trimmed, targetLang);
      if (res) {
        clientVerseCache.set(cacheKey, res);
        return res;
      }
    } catch {}
  }

  return text;
}

/**
 * Motor concorrente que traduz estritamente linha a linha sem pular versos.
 */
async function clientTranslateLinesLineByLine(rawLines, targetLang, concurrency = 8) {
  const uniqueVerses = Array.from(new Set(rawLines.map((l) => (l || '').trim()))).filter(
    (l) => l && l !== '♪' && !/^\[.*\]$/.test(l)
  );

  const lineMap = new Map();
  let index = 0;
  let active = 0;

  await new Promise((resolve) => {
    function dispatch() {
      if (index >= uniqueVerses.length && active === 0) return resolve();
      while (active < concurrency && index < uniqueVerses.length) {
        const item = uniqueVerses[index++];
        active++;
        translateSingleLineWithFallbacks(item, targetLang)
          .then((translated) => {
            lineMap.set(item, translated);
            active--;
            dispatch();
          })
          .catch(() => {
            lineMap.set(item, item);
            active--;
            dispatch();
          });
      }
    }
    dispatch();
  });

  return rawLines.map((line) => {
    const trimmed = (line || '').trim();
    if (!trimmed || trimmed === '♪' || /^\[.*\]$/.test(trimmed)) return line;
    return lineMap.get(trimmed) || line;
  });
}

/**
 * Traduz versos sincronizados linha a linha com preservação 100% de marcações e tempos.
 */
export async function translateSyncedLyrics(lines, targetLang = 'pt', trackId = '') {
  if (!lines || lines.length === 0) return [];

  const fingerprint = `${lines.length}_${lines[0]?.time ?? 0}_${(lines[0]?.text || '').slice(0, 24)}_${(lines[lines.length - 1]?.text || '').slice(0, 24)}`;
  const cacheKey = `synced_${trackId}_${targetLang}_${fingerprint}`;
  if (songTranslationCache.has(cacheKey)) {
    return songTranslationCache.get(cacheKey);
  }

  const rawTexts = lines.map((l) => l.text || '');

  // 1. Tenta API interna primeiro (executa em paralelo no servidor com alta performance)
  try {
    const apiRes = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: rawTexts, target: targetLang })
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data.lines) && data.lines.length === lines.length) {
        const hasError = data.lines.some((l) => isErrorString(l));
        if (!hasError) {
          const result = lines.map((line, idx) => ({
            time: line.time,
            text: data.lines[idx] || line.text,
            originalText: line.text
          }));
          songTranslationCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch {}

  // 2. Fallback de cliente: tradução concorrente linha a linha
  const translatedTexts = await clientTranslateLinesLineByLine(rawTexts, targetLang, 8);
  const result = lines.map((line, idx) => ({
    time: line.time,
    text: translatedTexts[idx] || line.text,
    originalText: line.text
  }));

  songTranslationCache.set(cacheKey, result);
  return result;
}

/**
 * Traduz texto estático de letra linha a linha mantendo parágrafos e pontuação intactos.
 */
export async function translatePlainLyrics(plainText, targetLang = 'pt', trackId = '') {
  if (!plainText) return '';

  const fingerprint = `${plainText.length}_${plainText.slice(0, 30)}_${plainText.slice(-30)}`;
  const cacheKey = `plain_${trackId}_${targetLang}_${fingerprint}`;
  if (songTranslationCache.has(cacheKey)) {
    return songTranslationCache.get(cacheKey);
  }

  const lines = plainText.split('\n');

  // 1. Tenta API interna
  try {
    const apiRes = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, target: targetLang })
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data.lines) && data.lines.length === lines.length) {
        const joined = data.lines.join('\n');
        songTranslationCache.set(cacheKey, joined);
        return joined;
      }
    }
  } catch {}

  // 2. Fallback de cliente
  const translatedLines = await clientTranslateLinesLineByLine(lines, targetLang, 8);
  const joined = translatedLines.join('\n');
  songTranslationCache.set(cacheKey, joined);
  return joined;
}
