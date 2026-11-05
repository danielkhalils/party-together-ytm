import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import YTMusic from 'ytmusic-api'

// Plugin local para responder à rota /api/search durante o npm run dev
function ytMusicLocalApi() {
  let ytmusic = null;

  return {
    name: 'ytmusic-local-api',
    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const query = url.searchParams.get('q');

          if (!query) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Termo de busca vazio' }));
            return;
          }

          if (!ytmusic) {
            ytmusic = new YTMusic();
            await ytmusic.initialize();
          }

          const songs = await ytmusic.searchSongs(query);

          const formatted = songs.slice(0, 15).map((song) => {
            // Formata segundos para m:ss
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

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(formatted));
        } catch (err) {
          console.error('Erro na busca YT Music:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Falha ao buscar músicas' }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ytMusicLocalApi()
  ],
})