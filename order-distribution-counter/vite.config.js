import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Proxy /api to the port the API server uses (API_PORT in .env).
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.PORT || env.API_PORT || 3001

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`,
      },
    },
  }
})
