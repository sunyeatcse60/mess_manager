import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const root = fileURLToPath(new URL('.', import.meta.url));

function githubRepoFromGit() {
  try {
    const remote = execSync('git remote get-url origin', { cwd: root, encoding: 'utf8' }).trim();
    if (!remote) return '';
    return remote
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/^git@github\.com:/i, '')
      .replace(/\.git$/i, '')
      .replace(/\/+$/, '');
  } catch {
    return '';
  }
}

// GitHub Actions sets these two automatically (see .github/workflows/build-apk.yml)
const version = process.env.VITE_APP_VERSION || pkg.version;
const repo = process.env.VITE_GITHUB_REPO || githubRepoFromGit();

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __GITHUB_REPO__: JSON.stringify(repo),
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 900 },
});
