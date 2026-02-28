# the-signal-reader (GitHub Pages)

A static, IBM Carbon-styled web version of your iOS **FieldCTODigest** app.

## How it works

- **GitHub Actions** runs on a schedule and:
  - fetches RSS feeds
  - scores + ranks articles (ported from your Swift scoring logic)
  - writes `web/public/data/digest.json`
- **GitHub Pages** serves the static UI.
- The UI reads `data/digest.json` and renders a responsive reader experience (desktop + iOS).

## One-time GitHub setup

1. Push this repo to GitHub as: **the-signal-reader**
2. In GitHub: **Settings → Pages → Build and deployment → GitHub Actions**
3. Ensure your default branch is `main`.

After the first deploy, your site will be available at:

`https://<your-github-username>.github.io/the-signal-reader/`

## Local dev

```bash
# root deps (scripts)
npm install

# web app
cd web
npm install
npm run dev
```

## Tuning sources + scoring

Edit these files and push to `main`:

- `scripts/defaultConfig/sources.json` (enable/disable feeds, priority, credibility, digestType)
- `scripts/defaultConfig/settings.json` (weights + time budget)
- `scripts/defaultConfig/industries.json` (industry boosts + keywords)
- `scripts/defaultConfig/clients.json` (client name + aliases)

The scheduled job will regenerate `web/public/data/digest.json` and redeploy.

## Manual refresh

Run the workflow:

- **Actions → Refresh Digest Data → Run workflow**

or locally:

```bash
node scripts/buildDigest.mjs
```
