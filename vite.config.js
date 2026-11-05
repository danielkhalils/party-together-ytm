import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import searchHandler from './api/search.js'

// Plugin local para responder à rota /api/search durante npm run dev e npm run preview
function ytMusicLocalApi() {
  return {
    name: 'ytmusic-local-api',
    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        await searchHandler(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        await searchHandler(req, res);
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
