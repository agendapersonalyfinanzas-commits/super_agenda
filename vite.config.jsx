import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Activa SSL autofirmado únicamente durante el desarrollo local (npm run dev)
    command === 'serve' ? basicSsl() : []
  ]
}))