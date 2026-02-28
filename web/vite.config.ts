import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages repo name (base path)
export default defineConfig({
  plugins: [react()],
  base: "/the-signal-reader/",
});
