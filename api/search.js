import YTMusic from 'ytmusic-api';

let ytmusic = null;

async function getYTM() {
  if (!ytmusic) {
    ytmusic = new YTMusic();
    await ytmusic.initialize();
  }
  return ytmusic;
}

// Fallback caso a API interna do YT Music seja bloqueada ou falhe no datacenter do Vercel
async function searchYouTubeFallback(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+100'
    }
  });

  if (!res.ok) {
    throw new Error(`YouTube search returned status ${res.status}`);
  }

  const html = await res.text();
  const match = html.match(/ytInitialData\s*=\s*({.+?});/s);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  const sections =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

  const results = [];
  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const v = item.videoRenderer;
      if (!v || !v.videoId) continue;

      const title = v.title?.runs?.map((r) => r.text).join('') || 'Sem título';
      const artist = v.ownerText?.runs?.map((r) => r.text).join('') || 'Artista Desconhecido';
      const duration = v.lengthText?.simpleText || 'YT';
      const thumbnails = v.thumbnail?.thumbnails || [];
      const thumbnail =
        thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

      results.push({
        videoId: v.videoId,
        title,
        artist,
        duration,
        thumbnail
      });

      if (results.length >= 15) break;
    }
    if (results.length >= 15) break;
  }

  return results;
}

export default async function handler(req, res) {
  // Cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Cache de 30 minutos na CDN da Vercel para acelerar buscas repetidas
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');

  const host = req.headers?.host || 'localhost';
  const parsedUrl = new URL(req.url, `http://${host}`);
  const rawQuery = req.query?.q || parsedUrl.searchParams.get('q');
  const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';

  if (!query) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Termo de busca vazio' }));
    return;
  }

  // 1. Tenta buscar via YTMusic API
  try {
    const ytm = await getYTM();
    const songs = await ytm.searchSongs(query);

    if (Array.isArray(songs) && songs.length > 0) {
      const formatted = songs.slice(0, 15).map((song) => {
        const durSec = song.duration || 0;
        const m = Math.floor(durSec / 60);
        const s = Math.floor(durSec % 60);
        const durationStr = durSec ? `${m}:${s < 10 ? '0' : ''}${s}` : 'YT Music';

        return {
          videoId: song.videoId,
          title: song.name,
          artist: song.artist?.name || 'Artista Desconhecido',
          duration: durationStr,
          thumbnail:
            song.thumbnails?.[song.thumbnails.length - 1]?.url ||
            `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`
        };
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(formatted));
      return;
    }
  } catch (ytmError) {
    console.warn('Aviso: falha na busca YTMusic API principal, acionando fallback:', ytmError?.message);
  }

  // 2. Se YTMusic falhar ou não retornar resultados, usa o fallback do YouTube Search
  try {
    const fallbackResults = await searchYouTubeFallback(query);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(fallbackResults));
  } catch (err) {
    console.error('Erro na busca (YTMusic e Fallback falharam):', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Falha ao buscar músicas', details: err?.message }));
  }
}
