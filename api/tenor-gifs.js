const TENOR_PAGE_ORIGINS = new Set(['https://tenor.com', 'https://www.tenor.com']);
const TENOR_MEDIA_HOSTS = new Set(['media.tenor.com', 'media1.tenor.com', 'media.tenor.co', 'media1.tenor.co']);

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function isTenorGifUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && TENOR_MEDIA_HOSTS.has(url.hostname) && /\.gif$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function isTenorPreviewUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && TENOR_MEDIA_HOSTS.has(url.hostname) && /\.(gif|webp|png)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function readJsonScript(html, scriptId) {
  const escapedId = scriptId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script\\b(?=[^>]*\\bid=["']${escapedId}["'])[^>]*>([\\s\\S]*?)<\\/script>`, 'i'));
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function toGifResult(gif) {
  const formats = gif?.media_formats || {};
  const playable = formats.nanogif || formats.tinygif || formats.gif;
  if (!playable?.url || !isTenorGifUrl(playable.url)) return null;
  const preview = formats.nanogifpreview || formats.tinygifpreview || formats.tinywebppreview || formats.nanogif || playable;
  const previewUrl = isTenorPreviewUrl(preview.url) ? preview.url : playable.url;
  return {
    id: String(gif.id || gif.legacy_info?.post_id || playable.url),
    title: String(gif.h1_title || gif.long_title || gif.title || gif.content_description || 'GIF do Tenor').slice(0, 100),
    previewUrl,
    gifUrl: playable.url,
    pageUrl: typeof gif.itemurl === 'string' ? gif.itemurl : ''
  };
}

function getSearchResults(store) {
  const resultLists = Object.values(store?.universal?.search || {}).map((entry) => entry?.results || []);
  const seen = new Set();
  const results = [];
  for (const gifs of resultLists) {
    for (const gif of gifs) {
      const result = toGifResult(gif);
      if (!result || seen.has(result.id)) continue;
      seen.add(result.id);
      results.push(result);
      if (results.length >= 16) return results;
    }
  }
  return results;
}

async function fetchTenorPage(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(9000),
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) throw new Error(`Tenor retornou HTTP ${response.status}`);
  if (!TENOR_PAGE_ORIGINS.has(new URL(response.url).origin) && !isTenorGifUrl(response.url)) {
    await response.body?.cancel();
    throw new Error('O link do Tenor redirecionou para um endereço inesperado.');
  }
  return response;
}

async function resolveGifLink(rawUrl) {
  let source;
  try { source = new URL(rawUrl); } catch { throw new Error('Link inválido.'); }
  if (source.protocol !== 'https:' || !TENOR_PAGE_ORIGINS.has(source.origin)) throw new Error('Use um link HTTPS do Tenor.');

  const viewMatch = source.pathname.match(/^\/view\/.+-(\d+)\/?$/i);
  const embedMatch = source.pathname.match(/^\/embed\/(\d+)\/?$/i);
  if (viewMatch || embedMatch) {
    const postId = viewMatch?.[1] || embedMatch[1];
    source = new URL(`/embed/${postId}`, 'https://tenor.com');
  }

  const response = await fetchTenorPage(source.href);
  if (isTenorGifUrl(response.url)) {
    await response.body?.cancel();
    return { gifUrl: response.url };
  }
  const html = await response.text();

  const directGif = readJsonScript(html, 'gif-json');
  const result = toGifResult(directGif);
  if (result) return result;

  const store = readJsonScript(html, 'store-cache');
  const firstSearchResult = getSearchResults(store)[0];
  if (firstSearchResult) return firstSearchResult;
  throw new Error('Não encontramos a mídia GIF nesse link do Tenor.');
}

/**
 * GET /api/tenor-gifs?q=<term> returns up to 16 lightweight Tenor GIF previews.
 * GET /api/tenor-gifs?url=<tenor-share-url> resolves a Tenor share page to a direct media URL.
 * Tenor's public search page is used because Tenor stopped accepting new API clients in 2026.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Método não permitido.' });

  const parsedUrl = new URL(req.url, `https://${req.headers?.host || 'localhost'}`);
  const rawQuery = req.query?.q ?? parsedUrl.searchParams.get('q');
  const rawLink = req.query?.url ?? parsedUrl.searchParams.get('url');
  const query = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 80) : '';
  const shareUrl = typeof rawLink === 'string' ? rawLink.trim().slice(0, 2000) : '';
  if (!query && !shareUrl) return sendJson(res, 400, { error: 'Informe q para buscar ou url para resolver um GIF.' });

  try {
    if (shareUrl) {
      const gif = await resolveGifLink(shareUrl);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return sendJson(res, 200, gif);
    }

    const slug = encodeURIComponent(query).replace(/%20/g, '+');
    const response = await fetchTenorPage(`https://tenor.com/search/${slug}-gifs`);
    const html = await response.text();
    const store = readJsonScript(html, 'store-cache');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return sendJson(res, 200, { results: getSearchResults(store) });
  } catch (error) {
    console.warn('[Tenor] Falha ao buscar/resolver GIF:', error?.message);
    return sendJson(res, 502, { error: 'Não foi possível carregar GIFs do Tenor agora.' });
  }
}
