import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { tempo } from "tempo-devtools/dist/vite";

const conditionalPlugins: [string, Record<string, any>][] = [];

// @ts-ignore
if (process.env.TEMPO === "true") {
  
}

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "development" ? "/" : process.env.VITE_BASE_PATH || "/",
  optimizeDeps: {
    entries: ["src/main.tsx", "src/tempobook/**/*"],
  },
  plugins: [
    react({
      plugins: conditionalPlugins,
    }),
    tempo(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // @ts-ignore
    allowedHosts: true,
    proxy: {
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        rewrite: (path) =>
          path
            .replace(/^\/api\/yahoo\/chart/, "/v8/finance/chart")
            .replace(/^\/api\/yahoo\/search/, "/v1/finance/search"),
      },
    },
  },
});
