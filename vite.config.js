import { defineConfig } from "vite";

export default defineConfig({
  root: "./website",
  build: {
    outDir: "../build",
    emptyOutDir: true
  }
});
