import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png'
      ],
      manifest: {
        name: 'Top40',
        short_name: 'Top40',
        description: 'App Top40 (Aluno/Instrutor)',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#004e11ff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        // opcional (remove o aviso do "Richer PWA Install UI")
        screenshots: [
          { src: 'screenshots/wide-1280x720.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
          { src: 'screenshots/mobile-540x720.png', sizes: '540x720', type: 'image/png' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              ['document','script','style','image','font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'static-assets' }
          },
          {
            urlPattern: /\/backend\/public\/api\/.*|\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost/tcc_backend_min/public/", // ajuste p/ seu Laragon (ex: 'http://api.tcc.test')
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost/tcc_backend_min/public',
        changeOrigin: true,
      },
    },
  },
});