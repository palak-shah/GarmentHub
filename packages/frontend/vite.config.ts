import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'GarmentHub',
        short_name: 'GarmentHub',
        description: 'B2B Garment Trading Platform',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Never cache API POST/PUT (e.g. multipart uploads); only cache GET reads.
            urlPattern: ({ request, url }: { request: Request; url: URL }) =>
              request.method === 'GET' && /\/api\//.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 100, maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'image-cache', expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 30 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  /** Same proxy as dev — needed so `vite preview` can reach the API and `/uploads`. */
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
