/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Sur GitHub Pages, le site est servi sous /<nom-du-dépôt>/.
// Le workflow de déploiement fournit BASE_PATH ; en local on reste à la racine.
const base = process.env.BASE_PATH ?? '/';
// Application installable (PWA), sauf pendant les tests et pour l'aperçu en un seul fichier (NO_PWA=1).
const withPwa = !process.env.VITEST && !process.env.NO_PWA;
// SINGLE_FILE=1 : un seul fichier JavaScript, pour l'aperçu autonome.
const singleFile = Boolean(process.env.SINGLE_FILE);

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    ...(withPwa
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
              name: 'Panier malin',
              short_name: 'Panier malin',
              description: 'Liste de courses de la semaine et comparateur de prix (Open Prices)',
              lang: 'fr',
              start_url: '.',
              scope: '.',
              display: 'standalone',
              background_color: '#f3f6f5',
              theme_color: '#f3f6f5',
              icons: [
                { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                {
                  src: 'maskable-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
              // Le module PDF dépasse la limite par défaut de 2 Mo : il reste disponible hors connexion.
              maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/images\.openfoodfacts\.org\//,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'images-open-food-facts',
                    expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ],
            },
          }),
        ]
      : []),
  ],
  build: singleFile ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {},
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
