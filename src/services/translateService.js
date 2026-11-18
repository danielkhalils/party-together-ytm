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

async function translateDirectWithGoogle(text, target = 'pt') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google returned ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Invalid response');
  return data[0].map((item) => item[0]).join('');
}

async function translateDirectWithMyMemory(text, target = 'pt') {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${encodeURIComponent(target)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory returned ${res.status}`);
  const data = await res.json();
  return data?.responseData?.translatedText || text;
}

/**
 * Traduz um conjunto de versos sincronizados mantendo as marcações de tempo originais.
 * @param {Array<{time: number, text: string}>} lines - Linhas sincronizadas originais
 * @param {string} targetLang - Código do idioma de destino (ex: 'pt')
 * @returns {Promise<Array<{time: number, text: string, originalText: string}>>}
 */
export async function translateSyncedLyrics(lines, targetLang = 'pt', trackId = '') {
  if (!lines || lines.length === 0) return [];

  const cacheKey = `synced_${trackId || lines[0]?.text || ''}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const rawTexts = lines.map((l) => l.text);

  // 1. Tenta traduzir via API interna do projeto (/api/translate)
  try {
    const apiRes = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: rawTexts, target: targetLang })
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data.lines) && data.lines.length === lines.length) {
        const result = lines.map((line, idx) => ({
          time: line.time,
          text: data.lines[idx] || line.text,
          originalText: line.text
        }));
        translationCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('[translateService] Chamada ao endpoint /api/translate falhou, tentando fallback direto:', err);
  }

  // 2. Fallback direto no cliente (para hospedagens estáticas ou offline da API)
  try {
    const CHUNK_SIZE = 30;
    const translatedTexts = [];

    for (let i = 0; i < rawTexts.length; i += CHUNK_SIZE) {
      const slice = rawTexts.slice(i, i + CHUNK_SIZE);
      const combined = slice.join('\n');
      let translatedCombined = '';

      try {
        translatedCombined = await translateDirectWithGoogle(combined, targetLang);
      } catch {
        try {
          translatedCombined = await translateDirectWithMyMemory(combined, targetLang);
        } catch {
          translatedCombined = combined;
        }
      }

      const split = translatedCombined.split('\n');
      for (let j = 0; j < slice.length; j++) {
        translatedTexts.push(split[j] || slice[j]);
      }
    }

    const result = lines.map((line, idx) => ({
      time: line.time,
      text: translatedTexts[idx] || line.text,
      originalText: line.text
    }));

    translationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[translateService] Erro na tradução direta:', err);
    // Em caso de falha completa, retorna o texto original com marcação
    return lines.map((line) => ({
      time: line.time,
      text: line.text,
      originalText: line.text
    }));
  }
}

/**
 * Traduz texto estático de letra (plain lyrics).
 */
export async function translatePlainLyrics(plainText, targetLang = 'pt', trackId = '') {
  if (!plainText) return '';

  const cacheKey = `plain_${trackId || plainText.slice(0, 30)}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // 1. Tenta API interna
  try {
    const apiRes = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: plainText, target: targetLang })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.translatedText) {
        translationCache.set(cacheKey, data.translatedText);
        return data.translatedText;
      }
    }
  } catch {}

  // 2. Fallback direto
  try {
    let result = '';
    try {
      result = await translateDirectWithGoogle(plainText, targetLang);
    } catch {
      result = await translateDirectWithMyMemory(plainText, targetLang);
    }
    translationCache.set(cacheKey, result);
    return result;
  } catch {
    return plainText;
  }
}
