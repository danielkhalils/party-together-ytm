import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import searchHandler from './api/search.js'
import playlistHandler from './api/playlist.js'
import tenorGifsHandler from './api/tenor-gifs.js'
import translateHandler from './api/translate.js'

// Plugin local para responder às rotas /api durante npm run dev e npm run preview
function ytMusicLocalApi() {
  return {
    name: 'ytmusic-local-api',
    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        await searchHandler(req, res);
      });
      server.middlewares.use('/api/playlist', async (req, res) => {
        await playlistHandler(req, res);
      });
      server.middlewares.use('/api/tenor-gifs', async (req, res) => {
        await tenorGifsHandler(req, res);
      });
      server.middlewares.use('/api/translate', async (req, res) => {
        await translateHandler(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        await searchHandler(req, res);
      });
      server.middlewares.use('/api/playlist', async (req, res) => {
        await playlistHandler(req, res);
      });
      server.middlewares.use('/api/tenor-gifs', async (req, res) => {
        await tenorGifsHandler(req, res);
      });
      server.middlewares.use('/api/translate', async (req, res) => {
        await translateHandler(req, res);
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
