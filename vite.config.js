import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Hosting: GitHub Pages https://spotzli.github.io/Spotzli/
const base = process.env.BASE_PATH || '/Spotzli/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Spozli',
        short_name: 'Spozli',
        description: 'Gemeinsamer Kalender, To-dos, Haushalt und Einkaufsliste',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#F3F5FA',
        theme_color: '#4C5BD4',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: base + 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
