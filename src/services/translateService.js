// Cache em memória de traduções para resposta imediata
const translationCache = new Map();

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
  return translated;
}

// Gateway 2: Google Dict API (muito estável e permissiva)
async function fetchGoogleDict(text, targetLang) {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(targetLang)}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Dict returned ${res.status}`);
  const data = await res.json();
  let translated = '';
  if (Array.isArray(data)) {
    translated = Array.isArray(data[0]) ? data[0].join('') : data.join('');
  } else if (typeof data === 'string') {
    translated = data;
  }
  if (isErrorString(translated)) throw new Error('Error string detected');
  return translated;
}

// Gateway 3: MyMemory (com limite rigoroso de 300 caracteres para NUNCA estourar 500 chars)
async function fetchMyMemory(text, targetLang) {
  if (text.length > 350) throw new Error('Query too large for MyMemory');
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${encodeURIComponent(targetLang)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory returned ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated || isErrorString(translated)) throw new Error('MyMemory invalid response');
  return translated;
}

// Traduz um lote de texto seguro (< 300 caracteres) tentando os múltiplos gateways
async function translateChunkWithFallbacks(text, targetLang) {
  if (!text || text.trim() === '♪' || !text.trim()) return text;

  // 1. Tenta Google GTX
  try {
    const res = await fetchGoogleGtx(text, targetLang);
    if (res) return res;
  } catch {}

  // 2. Tenta Google Dict
  try {
    const res = await fetchGoogleDict(text, targetLang);
    if (res) return res;
  } catch {}

  // 3. Tenta MyMemory (apenas para trechos pequenos)
  if (text.length <= 350) {
    try {
      const res = await fetchMyMemory(text, targetLang);
      if (res) return res;
    } catch {}
  }

  // Fallback: retorna o texto original se nenhum gateway responder
  return text;
}

/**
 * Traduz versos sincronizados sem nunca exceder o limite de caracteres.
 * Agrupa versos em lotes pequenos (máximo 250 caracteres por requisição).
 */
export async function translateSyncedLyrics(lines, targetLang = 'pt', trackId = '') {
  if (!lines || lines.length === 0) return [];

  const cacheKey = `synced_${trackId || lines[0]?.text || ''}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // 1. Tenta API interna primeiro
  try {
    const rawTexts = lines.map((l) => l.text);
    const apiRes = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: rawTexts, target: targetLang })
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data.lines) && data.lines.length === lines.length) {
        // Valida se não veio com mensagem de erro
        const hasError = data.lines.some((l) => isErrorString(l));
        if (!hasError) {
          const result = lines.map((line, idx) => ({
            time: line.time,
            text: data.lines[idx] || line.text,
            originalText: line.text
          }));
          translationCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch {}

  // 2. Divisão em lotes estritamente seguros (<= 250 caracteres por lote)
  const batches = [];
  let currentBatch = [];
  let currentChars = 0;

  for (let i = 0; i < lines.length; i++) {
    const text = (lines[i].text || '').trim();
    if (currentChars + text.length + 1 > 250 && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [{ text, index: i }];
      currentChars = text.length;
    } else {
      currentBatch.push({ text, index: i });
      currentChars += text.length + 1;
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  const translatedLinesArray = new Array(lines.length);

  for (const batch of batches) {
    const combinedText = batch.map((item) => item.text).join('\n');
    let translatedCombined = '';

    try {
      translatedCombined = await translateChunkWithFallbacks(combinedText, targetLang);
    } catch {
      translatedCombined = combinedText;
    }

    const split = translatedCombined.split('\n');
    for (let j = 0; j < batch.length; j++) {
      const originalIdx = batch[j].index;
      const transText = split[j]?.trim();
      translatedLinesArray[originalIdx] = (transText && !isErrorString(transText)) ? transText : batch[j].text;
    }
  }

  const result = lines.map((line, idx) => ({
    time: line.time,
    text: translatedLinesArray[idx] || line.text,
    originalText: line.text
  }));

  translationCache.set(cacheKey, result);
  return result;
}

/**
 * Traduz texto estático de letra dividindo em parágrafos seguros (<= 250 chars).
 */
export async function translatePlainLyrics(plainText, targetLang = 'pt', trackId = '') {
  if (!plainText) return '';

  const cacheKey = `plain_${trackId || plainText.slice(0, 30)}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const lines = plainText.split('\n');
  const batches = [];
  let currentBatch = [];
  let currentChars = 0;

  for (const line of lines) {
    const text = line.trim();
    if (currentChars + text.length + 1 > 250 && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [text];
      currentChars = text.length;
    } else {
      currentBatch.push(text);
      currentChars += text.length + 1;
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  const translatedBatches = [];
  for (const batch of batches) {
    const combined = batch.join('\n');
    try {
      const trans = await translateChunkWithFallbacks(combined, targetLang);
      translatedBatches.push(trans);
    } catch {
      translatedBatches.push(combined);
    }
  }

  const result = translatedBatches.join('\n');
  translationCache.set(cacheKey, result);
  return result;
}
