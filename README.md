# the-signal-reader

Static IBM Carbon-styled digest web app deployed to GitHub Pages.

## How it works
- GitHub Actions runs `scripts/buildDigest.mjs` on a schedule to fetch RSS + score articles.
- The script writes `web/public/data/digest.json`.
- A Vite + React + TypeScript app (IBM Carbon) reads that JSON and renders the digest.

## Local dev
```bash
cd web
npm install
npm run dev
```

## Build
```bash
cd web
npm run build
```

## Configure sources/settings
Edit:
- `scripts/defaultConfig/sources.json`
- `scripts/defaultConfig/settings.json`
Commit changes and run **Actions → Refresh Digest Data** once.
