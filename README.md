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
- All data (cart, currency, theme) is in-memory only and resets on page reload — there's no backend yet.
- The domain search and hosting plans are a demo storefront, not connected to a real registrar.
- The contact form confirms locally but doesn't send anywhere yet — you'll want to wire it up to an email service or form handler (e.g. Formspree, Resend) before going live.
