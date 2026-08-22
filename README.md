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
login-gated dashboard at `/admin` renders a custom Google-Analytics-style view of that
data (stat tiles, a trend chart, top pages, traffic channels, devices, top countries),
backed by serverless functions in `api/` that call the GA4 Data API directly — no
external npm dependencies, just Node's built-in `crypto` and `fetch`.

**1. Set the login/session variables in your Vercel project** (Project Settings → Environments → Production → Environment Variables):

| Variable | Description |
|---|---|
| `ADMIN_USERNAME` | Login username for the dashboard. |
| `ADMIN_PASSWORD` | Login password for the dashboard. Pick something strong — it's compared server-side and never sent to the browser. |
| `SESSION_SECRET` | Random long string used to sign the login session cookie (e.g. `openssl rand -hex 32`). |

**2. Connect GA4 data.** In [Google Cloud Console](https://console.cloud.google.com):
1. Create (or reuse) a project, then enable the **Google Analytics Data API**.
2. Create a **Service Account** (IAM & Admin → Service Accounts), then create a JSON key for it and download it.
3. In [Google Analytics](https://analytics.google.com), open **Admin → Property Access Management** for the property behind `G-K0DF5N91SG`, and add the service account's email (`...@...iam.gserviceaccount.com`) as a **Viewer**.
4. Find the numeric **GA4 Property ID** in Admin → Property Settings (not the same as the `G-XXXX` measurement ID).

Then set these in Vercel too:

| Variable | Description |
|---|---|
| `GA4_SERVICE_ACCOUNT_JSON` | The **entire contents** of the downloaded service account JSON key file, pasted as-is. |
| `GA4_PROPERTY_ID` | The numeric GA4 property ID from step 4 above. |

Once all five variables are set (and the project redeployed), visit `/admin`, sign in, and
the dashboard loads live data with 7/28/90-day range toggles. Until the GA4 variables are
set, `/admin` shows setup instructions instead of data — the login/session part still works
on its own. Sessions last 12 hours and are stored in an `HttpOnly` cookie, not localStorage —
nothing sensitive touches client-side JS.
