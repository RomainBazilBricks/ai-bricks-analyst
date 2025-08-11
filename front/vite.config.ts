import path from "path"
import tailwindcss from '@tailwindcss/vite'
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api-local": {
        target: "http://localhost:3001/api",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-local/, "")
      },
      "/api-prod": {
        target: "https://api-ai-bricks-production.up.railway.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-prod/, "")
      },
    }
  },
})