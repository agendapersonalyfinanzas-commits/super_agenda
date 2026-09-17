import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Activa SSL autofirmado únicamente durante el desarrollo local (npm run dev)
    command === 'serve' ? basicSsl() : [],
    // Empaquetado PWA automático para renderizado nativo/standalone
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['super-snoopy.png'],
      manifest: {
        name: 'Super Agenda Finanzas',
        short_name: 'SuperAgenda',
        description: 'Tu control diario de agenda, tareas y finanzas al estilo clásico Peanuts',
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
}))