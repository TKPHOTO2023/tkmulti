const { verifySession } = require('./_auth');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderDashboard({ username }) {
  const embedUrl = process.env.LOOKER_STUDIO_EMBED_URL;

  const reportBlock = embedUrl
    ? `<iframe class="report" src="${escapeHtml(embedUrl)}" allowfullscreen></iframe>`
    : `<div class="placeholder">
        <h2>No report connected yet</h2>
        <p>
          Create a report in <a href="https://lookerstudio.google.com" target="_blank" rel="noopener">Looker Studio</a>
          connected to the GA4 property for <code>G-K0DF5N91SG</code>, then in the report use
          <strong>File → Embed report</strong> to get an embed URL, and set it as the
          <code>LOOKER_STUDIO_EMBED_URL</code> environment variable in your Vercel project settings.
        </p>
        <p>In the meantime you can view live data directly in
          <a href="https://analytics.google.com" target="_blank" rel="noopener">Google Analytics</a>.
        </p>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Analytics — tkmulti.com Admin</title>
<style>
  :root{ --ink:#0b0730; --indigo:#241866; --blue:#4f7dff; --bg:#f5f6fb; }
  *{box-sizing:border-box}
  body{margin:0; font-family:'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--ink)}
  header{
    display:flex; align-items:center; justify-content:space-between;
    padding:1rem 1.5rem; background:linear-gradient(120deg,var(--ink),var(--indigo)); color:#fff;
  }
  header h1{font-size:1.1rem; margin:0}
  header .user{font-size:.85rem; opacity:.85; margin-right:1rem}
  header form{display:inline}
  header button{
    background:rgba(255,255,255,.12); color:#fff; border:1px solid rgba(255,255,255,.3);
    border-radius:6px; padding:.4rem .8rem; cursor:pointer; font-size:.85rem;
  }
  header button:hover{background:rgba(255,255,255,.22)}
  main{padding:1.5rem}
  .report{width:100%; height:80vh; min-height:520px; border:0; border-radius:12px; background:#fff; box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .placeholder{
    max-width:640px; margin:2rem auto; background:#fff; border-radius:12px; padding:2rem;
    box-shadow:0 4px 20px rgba(0,0,0,.08); line-height:1.6;
  }
  .placeholder code{background:#f0f1f8; padding:.15rem .4rem; border-radius:4px; font-size:.9em}
</style>
</head>
<body>
  <header>
    <h1>tkmulti.com — Analytics</h1>
    <div>
      <span class="user">Signed in as ${escapeHtml(username)}</span>
      <form method="POST" action="/admin/logout"><button type="submit">Sign out</button></form>
    </div>
  </header>
  <main>
    ${reportBlock}
  </main>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const session = verifySession(req);
  if (!session) {
    res.setHeader('Location', '/admin/login');
    res.status(302).send('');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(renderDashboard({ username: session.u }));
};
