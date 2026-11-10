import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// GitHub Actions sets these two automatically (see .github/workflows/build-apk.yml)
const version = process.env.VITE_APP_VERSION || pkg.version;
const repo = process.env.VITE_GITHUB_REPO || '';

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __GITHUB_REPO__: JSON.stringify(repo),
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 900 },
});
