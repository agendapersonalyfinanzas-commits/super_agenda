import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['super-snoopy.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'Super Agenda Finanzas',
        short_name: 'SuperAgenda',
        description: 'Tu control diario de agenda, tareas y finanzas',
        theme_color: '#FBBF24',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/super-snoopy.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ]
})