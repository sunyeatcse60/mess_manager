# Bachelor Mess Manager (React + Vite + Capacitor)

Meal rate, bazar, deposits, maid (bua) bill split and a monthly settlement – as an Android APK.

## Run locally
```bash
npm install
npm run dev
```

## Build the APK with GitHub Actions
1. Create a **public** GitHub repo and push this folder to `main`.
2. In the repo: **Settings → Actions → General → Workflow permissions → Read and write permissions**.
3. Every push to `main` runs `.github/workflows/build-apk.yml`:
   builds → signs the APK → publishes it as a **Release** (`v1.0.<run number>`).
4. Download `MessManager-vX.Y.Z.apk` from the Releases page and install it.

## In-app updates
The app calls `https://api.github.com/repos/<your repo>/releases/latest` (repo name is injected
automatically during the build). When the release is newer than the installed version,
**Settings → App update** shows the new version, the commit message as "what's new" and a
download button, plus a red dot on the gear icon. Your commit message = the release notes.

## Important
- `signing/mess-release.keystore` is the key that signs every build. Updates only install over
  the old app if the **same key** is used, so never delete or regenerate it.
  The password is in the workflow file – fine for a private hobby project; for a bigger project
  move it to GitHub Secrets.
- Change `APP_BASE` in the workflow to bump the major/minor version.
- All data is stored locally on the phone (localStorage). Use *Settings → Backup* to move data.
