function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) { // 1MB max
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

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

// Cache em memória de versos individuais do servidor para resposta ultrarrápida
const serverVerseCache = new Map();

async function translateSingleLine(line, target = 'pt', source = 'auto') {
  const trimmed = (line || '').trim();
  if (!trimmed || trimmed === '♪' || /^\[.*\]$/.test(trimmed)) {
    return line;
  }

  const cacheKey = `${trimmed}___${target}`;
  if (serverVerseCache.has(cacheKey)) {
    return serverVerseCache.get(cacheKey);
  }

  // Gateway 1: Google Translate GTX
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const trans = data[0].map((item) => item[0]).join('');
        if (trans && !isErrorString(trans)) {
          const result = stripLeakedLanguageSuffix(decodeHtmlEntities(trans.trim()), trimmed);
          serverVerseCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch {}

  // Gateway 2: Google Dict API (rápido e permissivo)
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      let trans = '';
      if (Array.isArray(data)) {
        if (Array.isArray(data[0])) {
          trans = typeof data[0][0] === 'string' ? data[0][0] : data[0][0]?.toString() || '';
        } else if (typeof data[0] === 'string') {
          trans = data[0];
        } else {
          trans = data.join('');
        }
      } else if (typeof data === 'string') {
        trans = data;
      }
      if (trans && !isErrorString(trans)) {
        const result = stripLeakedLanguageSuffix(decodeHtmlEntities(trans.trim()), trimmed);
        serverVerseCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {}

  // Gateway 3: MyMemory (para versos curtos)
  if (trimmed.length <= 350) {
    try {
      const langpair = `${source === 'auto' ? 'en' : source}|${target}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${encodeURIComponent(langpair)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const trans = data?.responseData?.translatedText;
        if (trans && !isErrorString(trans)) {
          const result = decodeHtmlEntities(trans.trim());
          serverVerseCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {}
  }

  return line;
}

/**
 * Traduz todas as linhas estritamente linha a linha, de forma concorrente e sem limites de tamanho.
 */
async function translateAllLinesLineByLine(rawLines, target = 'pt', source = 'auto', concurrency = 10) {
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
        translateSingleLine(item, target, source)
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

export default async function translateHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  let text = '';
  let lines = [];
  let target = 'pt';
  let source = 'auto';

  try {
    if (req.method === 'POST') {
      const body = await readBody(req);
      text = body.text || '';
      lines = Array.isArray(body.lines) ? body.lines : [];
      target = body.target || 'pt';
      source = body.source || 'auto';
    } else {
      const parsedUrl = new URL(req.url, 'http://localhost');
      text = parsedUrl.searchParams.get('text') || '';
      target = parsedUrl.searchParams.get('target') || 'pt';
      source = parsedUrl.searchParams.get('source') || 'auto';
    }

    if (lines.length > 0) {
      const translatedLines = await translateAllLinesLineByLine(lines, target, source, 10);
      sendJson(res, 200, {
        success: true,
        target,
        lines: translatedLines
      });
      return;
    }

    if (!text) {
      sendJson(res, 400, { error: 'O parâmetro "text" ou "lines" é obrigatório.' });
      return;
    }

    const rawSplit = text.split('\n');
    const translatedTextLines = await translateAllLinesLineByLine(rawSplit, target, source, 10);

    sendJson(res, 200, {
      success: true,
      target,
      translatedText: translatedTextLines.join('\n')
    });
  } catch (err) {
    sendJson(res, 500, {
      error: 'Falha ao traduzir letra',
      details: err?.message
    });
  }
}
