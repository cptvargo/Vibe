import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'icons/*.png'],
      manifest: {
        name: 'Vibe',
        short_name: 'Vibe',
        description: 'Your premium music experience',
        theme_color: '#080810',
        background_color: '#080810',
        display: 'fullscreen',
        orientation: 'portrait',
        icons: [
          { src: 'icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/apple-touch-icon.png',       sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /\/Audio\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vibe-audio-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\/Images\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vibe-image-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
})
