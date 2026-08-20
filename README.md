# tkmulti.com International — Website

A single self-contained `index.html` (styles, scripts, and images all inline — no build step, no dependencies).

## Deploy to Vercel

**Easiest way (no account setup needed for a quick preview):**
1. Go to https://vercel.com/new
2. Drag this folder (or the unzipped contents) onto the page
3. Click **Deploy**

**Or with the Vercel CLI:**
```bash
npm i -g vercel
cd tkmulti-site
vercel
```

No framework, build command, or environment variables are needed — Vercel will detect it as a static site automatically since `index.html` sits at the root.

## Notes
- All data (cart, currency, theme) is in-memory only and resets on page reload.
- The domain search and hosting plans are a demo storefront, not connected to a real registrar.
- The contact form confirms locally but doesn't send anywhere yet — you'll want to wire it up to an email service or form handler (e.g. Formspree, Resend) before going live.

## Admin analytics dashboard

`index.html` includes the Google tag (gtag.js) for GA4 property `G-K0DF5N91SG`. A small
login-gated dashboard at `/admin` embeds a Looker Studio report of that data, backed by
serverless functions in `api/` (Vercel Node functions, no external dependencies).

**Set these environment variables in your Vercel project** (Project Settings → Environment Variables):

| Variable | Description |
|---|---|
| `ADMIN_USERNAME` | Login username for the dashboard. |
| `ADMIN_PASSWORD` | Login password for the dashboard. Pick something strong — it's compared server-side and never sent to the browser. |
| `SESSION_SECRET` | Random long string used to sign the login session cookie (e.g. `openssl rand -hex 32`). |
| `LOOKER_STUDIO_EMBED_URL` | The embed URL for a Looker Studio report connected to GA4 property `G-K0DF5N91SG`. In Looker Studio: **File → Embed report**, enable embedding, and copy the URL. Optional — until set, `/admin` shows setup instructions instead. |

Once those are set, visit `/admin`, sign in, and the Looker Studio report renders inline. Sessions
last 12 hours and are stored in an `HttpOnly` cookie, not localStorage — nothing sensitive touches
client-side JS.
