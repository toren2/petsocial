import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
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
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            files: [
              { name: 'media', accept: ['image/*', 'video/*'] },
            ],
          },
        },
       icons: [
  {
    src: 'web-app-manifest-192x192.png',
    sizes: '192x192',
    type: 'image/png',
  },
  {
    src: 'web-app-manifest-512x512.png',
    sizes: '512x512',
    type: 'image/png',
  },
  {
    src: 'web-app-manifest-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any maskable',
  },
],
      },
    }),
  ],
})
