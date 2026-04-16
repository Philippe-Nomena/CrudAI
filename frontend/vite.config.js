import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // 🔧 DEV (local)
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },

  // 🚀 PROD (Render)
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT || 10000,
    allowedHosts: "all",
  },
});
