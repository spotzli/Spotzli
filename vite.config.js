import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { SAYINGS } from './src/sayings.js';

// Hosting: GitHub Pages https://spotzli.github.io/Spotzli/
const base = process.env.BASE_PATH || '/Spotzli/';

export default defineConfig({
  base,
  plugins: [
    // Sprüche zusätzlich als JSON für die Push-Funktion auf dem Server
    { name: 'sayings-json', generateBundle() { this.emitFile({ type: 'asset', fileName: 'sayings.json', source: JSON.stringify(SAYINGS) }); } },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Spotzi',
        short_name: 'Spotzi',
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
        // Installationsseite und iPhone-Profil nicht durch die App ersetzen
        navigateFallbackDenylist: [/\.mobileconfig$/, /installieren\.html$/],
        importScripts: ['push-sw.js'],
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
