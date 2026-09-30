import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableHttps = env.VITE_ENABLE_HTTPS === 'true'

  return {
    plugins: [
      react(), 
      tailwindcss(),
      ...(enableHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'apple-wallet-es.svg', 'google-wallet-es.svg'],
      manifest: {
        name: 'Fidelity Wallet',
        short_name: 'Fidelity Wallet',
        description: 'Fidelity Wallet',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: enableHttps ? true : false,
    allowedHosts: enableHttps ? true : undefined,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/auth/v1': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/rest/v1': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/storage/v1': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  }
  }
})

