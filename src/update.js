import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Injected at build time by vite.config.js (GitHub Actions sets both automatically)
export const APP_VERSION = __APP_VERSION__;
export const DEFAULT_REPO = __GITHUB_REPO__;

const clean = (v) => String(v || '').replace(/^v/i, '').trim();

// returns >0 if a is newer than b
export function compareVersions(a, b) {
  const pa = clean(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = clean(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export const normalizeRepo = (r) =>
  String(r || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

export async function checkForUpdate(repoInput) {
  const repo = normalizeRepo(repoInput || DEFAULT_REPO);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { status: 'norepo' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (res.status === 404) return { status: 'norelease', repo };
    if (!res.ok) return { status: 'error', repo, error: `HTTP ${res.status}` };
    const rel = await res.json();
    const latest = clean(rel.tag_name);
    const apk = (rel.assets || []).find((a) => /\.apk$/i.test(a.name));
    const info = {
      repo,
      latest,
      current: APP_VERSION,
      url: apk?.browser_download_url || rel.html_url,
      page: rel.html_url,
      notes: (rel.body || '').trim(),
      published: rel.published_at,
      size: apk?.size,
    };
    return { status: compareVersions(latest, APP_VERSION) > 0 ? 'available' : 'latest', ...info };
  } catch (e) {
    return { status: 'error', repo, error: e?.name === 'AbortError' ? 'timeout' : e?.message || 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export async function openExternal(url) {
  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.open(url, '_blank', 'noopener');
}
