import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { voiceStudio } from "./scripts/studio-plugin";
import { bzPwa } from "./scripts/pwa-plugin";

export default defineConfig({
  plugins: [react(), cloudflare(), voiceStudio(), bzPwa()],
  build: { sourcemap: false, assetsInlineLimit: 0 },
});
