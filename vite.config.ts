import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { voiceStudio } from "./scripts/studio-plugin";

export default defineConfig({
  plugins: [react(), cloudflare(), voiceStudio()],
  build: { sourcemap: false, assetsInlineLimit: 0 },
});
