import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) {
            return "leaflet";
          }
          if (id.includes("node_modules/recharts")) {
            return "recharts";
          }
          if (id.includes("node_modules/jspdf")) {
            return "pdf";
          }
          if (id.includes("node_modules/docx")) {
            return "docx";
          }
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
