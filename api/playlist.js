import YTMusic from 'ytmusic-api';

const MAX_PLAYLIST_TRACKS = 100;

let ytmusic = null;

async function getYTM() {
  if (!ytmusic) {
    ytmusic = new YTMusic();
    await ytmusic.initialize();
  }
  return ytmusic;
}

function cleanTrackTitle(rawTitle) {
  if (!rawTitle) return '';
  let title = String(rawTitle).trim();
  title = title.replace(/\s*(?:\||\/\/|•|–|—)\s*(?:official\s*(?:music\s*)?video|official\s*audio|visualizer|audio|lyric\s*video|lyrics|letra|vídeo\s*oficial|clipe\s*oficial|video\s*oficial|audio\s*oficial|4k|hd|hq|live|ao\s*vivo).*$/i, '');
  title = title.replace(/\s*[([][^\])]*(?:official\s*(?:music\s*)?video|official\s*audio|official|music\s*video|visualizer|audio|lyric\s*video|lyrics|letra|vídeo\s*oficial|clipe\s*oficial|video\s*oficial|audio\s*oficial|videoclipe|clip\s*oficial|4k|hd|hq|remastered|remasterizado|prod\.|produced\s*by|ft\.|feat\.|ao\s*vivo|live)[^\])]*[)\]]/gi, '');
  title = title.replace(/\s+(?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|lyrics|letra|visualizer|clipe\s*oficial|video\s*oficial|audio\s*oficial)\s*$/i, '');
  title = title.replace(/\s*[-–—:|/]\s*$/, '').replace(/\s+/g, ' ').trim();
  return title || rawTitle;
}

function cleanArtistName(rawArtist) {
  if (!rawArtist) return 'Artista Desconhecido';
  let artist = String(rawArtist).trim();
  artist = artist.replace(/\s*-\s*Topic$/i, '');
  artist = artist.replace(/\s*VEVO$/i, '');
  artist = artist.replace(/\s*(?:\||\/\/|•)\s*.*$/i, '');
  return artist.trim() || 'Artista Desconhecido';
}

function formatDurationSeconds(seconds) {
  const secs = Number(seconds);
  if (!Number.isFinite(secs) || secs <= 0) return 'YT';
  const mins = Math.floor(secs / 60);
  const rem = Math.floor(secs % 60);
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

function extractPlaylistId(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  try {
    const parsed = new URL(trimmed);
    const listParam = parsed.searchParams.get('list');
    if (listParam && /^[a-zA-Z0-9_-]{10,120}$/.test(listParam)) {
      return listParam;
    }
  } catch {}
  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]{10,120})/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{10,120}$/.test(trimmed)) return trimmed;
  return '';
}

async function fetchYouTubePlaylistHtml(playlistId) {
  const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+100'
    }
  });

  if (!res.ok) {
    throw new Error(`YouTube playlist returned status ${res.status}`);
  }

  const html = await res.text();
  const match = html.match(/ytInitialData\s*=\s*({.+?});/s);
  if (!match) return { playlistTitle: '', tracks: [] };

  const data = JSON.parse(match[1]);
  const playlistTitle =
    data?.metadata?.playlistMetadataRenderer?.title ||
    data?.header?.playlistHeaderRenderer?.title?.simpleText ||
    '';

  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  let videoItems = [];
  for (const tab of tabs) {
    const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const sec of sections) {
      const itemContents = sec?.itemSectionRenderer?.contents || [];
      for (const item of itemContents) {
        const listContents = item?.playlistVideoListRenderer?.contents;
        if (Array.isArray(listContents) && listContents.length > 0) {
          videoItems = listContents;
          break;
        }
      }
      if (videoItems.length > 0) break;
    }
    if (videoItems.length > 0) break;
  }

  const seen = new Set();
  const tracks = [];
  for (const entry of videoItems) {
    if (tracks.length >= MAX_PLAYLIST_TRACKS) break;
    const v = entry?.playlistVideoRenderer;
    if (!v || !v.videoId || seen.has(v.videoId)) continue;
    seen.add(v.videoId);

    const rawTitle = v.title?.runs?.map((r) => r.text).join('') || v.title?.simpleText || '';
    if (!rawTitle || /\[(?:deleted|private)\s+video\]/i.test(rawTitle)) continue;

    const rawArtist = v.shortBylineText?.runs?.map((r) => r.text).join('') || '';
    const duration = v.lengthText?.simpleText || formatDurationSeconds(v.lengthSeconds);
    const thumbnails = v.thumbnail?.thumbnails || [];
    const thumbnail =
      thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

    tracks.push({
      videoId: v.videoId,
      title: cleanTrackTitle(rawTitle),
      artist: cleanArtistName(rawArtist),
      duration: duration || 'YT',
      thumbnail
    });
  }

  return { playlistTitle, tracks };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rawList = url.searchParams.get('list') || url.searchParams.get('url') || '';
  const playlistId = extractPlaylistId(rawList);

  if (!playlistId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Link ou ID de playlist inválido.' }));
  }

  try {
    let playlistTitle = '';
    let tracks = [];

    // 1. Tenta via HTML do YouTube (funciona para playlists do YouTube e YouTube Music, até 100 itens por página)
    try {
      const parsed = await fetchYouTubePlaylistHtml(playlistId);
      playlistTitle = parsed.playlistTitle || '';
      tracks = parsed.tracks || [];
    } catch {}

    // 2. Fallback via ytmusic-api caso o HTML não retorne itens
    if (tracks.length === 0) {
      try {
        const ytm = await getYTM();
        const videos = await ytm.getPlaylistVideos(playlistId);
        const seen = new Set();
        for (const item of videos || []) {
          if (tracks.length >= MAX_PLAYLIST_TRACKS) break;
          if (!item?.videoId || seen.has(item.videoId)) continue;
          seen.add(item.videoId);
          const thumb =
            item.thumbnails?.[item.thumbnails.length - 1]?.url ||
            `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
          tracks.push({
            videoId: item.videoId,
            title: cleanTrackTitle(item.name || item.title || 'Sem título'),
            artist: cleanArtistName(item.artist?.name || item.artists?.[0]?.name || 'Artista Desconhecido'),
            duration: formatDurationSeconds(item.duration),
            thumbnail: thumb
          });
        }
      } catch {}
    }

    if (tracks.length === 0) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: 'Não foi possível ler músicas desta playlist. Verifique se ela é pública ou não listada.' }));
    }

    res.statusCode = 200;
    return res.end(
      JSON.stringify({
        playlistId,
        playlistTitle,
        tracks: tracks.slice(0, MAX_PLAYLIST_TRACKS),
        maxTracks: MAX_PLAYLIST_TRACKS
      })
    );
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: err.message || 'Erro ao importar playlist.' }));
  }
}
