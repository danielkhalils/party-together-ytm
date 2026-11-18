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
      if (data.length > 1024 * 512) { // 512KB max
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

// Traduz um trecho de texto usando a API livre do Google Translate
async function translateWithGoogle(text, target = 'pt', source = 'auto') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`Google translate returned status ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Formato inesperado na resposta do tradutor');
  }

  // data[0] contém pares de [trecho_traduzido, trecho_original, ...]
  const translated = data[0].map((item) => item[0]).join('');
  return translated;
}

// Fallback de tradução usando MyMemory
async function translateWithMyMemory(text, target = 'pt', source = 'auto') {
  const langpair = `${source === 'auto' ? 'en' : source}|${target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MyMemory returned status ${res.status}`);
  }
  const data = await res.json();
  return data?.responseData?.translatedText || text;
}

export default async function translateHandler(req, res) {
  // Configura CORS para permitir chamadas de qualquer origem do app
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

    // Se foram enviadas linhas (versos de letras sincronizadas do BetterLyrics)
    if (lines.length > 0) {
      // Chunking em lotes de 35 linhas para não estourar o limite de URL da API
      const CHUNK_SIZE = 35;
      const translatedLines = [];

      for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        const slice = lines.slice(i, i + CHUNK_SIZE);
        const combined = slice.join('\n');

        let chunkTranslated = '';
        try {
          chunkTranslated = await translateWithGoogle(combined, target, source);
        } catch (err) {
          try {
            chunkTranslated = await translateWithMyMemory(combined, target, source);
          } catch {
            chunkTranslated = combined; // fallback para o texto original se falhar
          }
        }

        const splitResult = chunkTranslated.split('\n');
        for (let j = 0; j < slice.length; j++) {
          translatedLines.push(splitResult[j] || slice[j]);
        }
      }

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

    let translated = '';
    try {
      translated = await translateWithGoogle(text, target, source);
    } catch {
      translated = await translateWithMyMemory(text, target, source);
    }

    sendJson(res, 200, {
      success: true,
      target,
      translatedText: translated
    });
  } catch (err) {
    sendJson(res, 500, {
      error: 'Falha ao traduzir letra',
      details: err?.message
    });
  }
}
