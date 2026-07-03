import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'snoutt-icon.png', 'snoutt-logo.png'],
      manifest: {
        name: 'Snoutt',
        short_name: 'Snoutt',
        description: 'La red social de mascotas',
        theme_color: '#7C3AED',
        background_color: '#F8F7FF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'snoutt-icon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'snoutt-icon.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'snoutt-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})