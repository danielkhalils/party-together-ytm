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

async function translateWithGoogleGtx(text, target = 'pt', source = 'auto') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) throw new Error(`Google translate returned status ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Formato inesperado na resposta');

  const translated = data[0].map((item) => item[0]).join('');
  if (isErrorString(translated)) throw new Error('Error string detected');
  return translated;
}

async function translateWithGoogleDict(text, target = 'pt') {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google dict returned status ${res.status}`);
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

async function translateWithMyMemory(text, target = 'pt', source = 'auto') {
  if (text.length > 350) throw new Error('Query too large for MyMemory');
  const langpair = `${source === 'auto' ? 'en' : source}|${target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory returned status ${res.status}`);
  const data = await res.json();
  const trans = data?.responseData?.translatedText;
  if (!trans || isErrorString(trans)) throw new Error('Invalid MyMemory response');
  return trans;
}

async function translateChunk(text, target = 'pt', source = 'auto') {
  if (!text || text.trim() === '♪' || !text.trim()) return text;

  try {
    const res = await translateWithGoogleGtx(text, target, source);
    if (res) return res;
  } catch {}

  try {
    const res = await translateWithGoogleDict(text, target);
    if (res) return res;
  } catch {}

  if (text.length <= 350) {
    try {
      const res = await translateWithMyMemory(text, target, source);
      if (res) return res;
    } catch {}
  }

  return text;
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
      // Agrupa em lotes estritamente seguros (<= 250 caracteres por lote)
      const batches = [];
      let currentBatch = [];
      let currentChars = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineText = (lines[i] || '').trim();
        if (currentChars + lineText.length + 1 > 250 && currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [{ text: lineText, index: i }];
          currentChars = lineText.length;
        } else {
          currentBatch.push({ text: lineText, index: i });
          currentChars += lineText.length + 1;
        }
      }
      if (currentBatch.length > 0) batches.push(currentBatch);

      const translatedLinesArray = new Array(lines.length);

      for (const batch of batches) {
        const combined = batch.map((item) => item.text).join('\n');
        let chunkTranslated = '';
        try {
          chunkTranslated = await translateChunk(combined, target, source);
        } catch {
          chunkTranslated = combined;
        }

        const splitResult = chunkTranslated.split('\n');
        for (let j = 0; j < batch.length; j++) {
          const originalIdx = batch[j].index;
          const trans = splitResult[j]?.trim();
          translatedLinesArray[originalIdx] = (trans && !isErrorString(trans)) ? trans : batch[j].text;
        }
      }

      sendJson(res, 200, {
        success: true,
        target,
        lines: translatedLinesArray
      });
      return;
    }

    if (!text) {
      sendJson(res, 400, { error: 'O parâmetro "text" ou "lines" é obrigatório.' });
      return;
    }

    // Tradução de texto plano dividindo em lotes seguros
    const textLines = text.split('\n');
    const batches = [];
    let currentBatch = [];
    let currentChars = 0;

    for (const l of textLines) {
      const lineText = l.trim();
      if (currentChars + lineText.length + 1 > 250 && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [lineText];
        currentChars = lineText.length;
      } else {
        currentBatch.push(lineText);
        currentChars += lineText.length + 1;
      }
    }
    if (currentBatch.length > 0) batches.push(currentBatch);

    const translatedBatches = [];
    for (const batch of batches) {
      const combined = batch.join('\n');
      const trans = await translateChunk(combined, target, source);
      translatedBatches.push(trans);
    }

    sendJson(res, 200, {
      success: true,
      target,
      translatedText: translatedBatches.join('\n')
    });
  } catch (err) {
    sendJson(res, 500, {
      error: 'Falha ao traduzir letra',
      details: err?.message
    });
  }
}
