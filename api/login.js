const { createSessionCookie, timingSafeEqualStr } = require('./_auth');

function renderLoginPage({ error } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login — tkmulti.com</title>
<style>
  :root{ --ink:#0b0730; --indigo:#241866; --blue:#4f7dff; --bg:#f5f6fb; }
  *{box-sizing:border-box}
  body{
    margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:linear-gradient(160deg,var(--ink),var(--indigo));
    font-family:'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  }
  .card{
    background:#fff; border-radius:16px; padding:2.5rem; width:min(360px,90vw);
    box-shadow:0 20px 60px rgba(0,0,0,.35);
  }
  h1{margin:0 0 .35rem; font-size:1.4rem; color:var(--ink)}
  p.sub{margin:0 0 1.5rem; color:#666; font-size:.9rem}
  label{display:block; font-size:.8rem; font-weight:600; color:var(--ink); margin:0 0 .3rem}
  input{
    width:100%; padding:.65rem .75rem; margin-bottom:1rem; border:1px solid #ddd;
    border-radius:8px; font-size:1rem;
  }
  input:focus{outline:2px solid var(--blue); border-color:transparent}
  button{
    width:100%; padding:.75rem; border:none; border-radius:8px; background:var(--blue);
    color:#fff; font-weight:700; font-size:1rem; cursor:pointer;
  }
  button:hover{filter:brightness(1.08)}
  .error{
    background:#fdecea; color:#a4262c; padding:.6rem .8rem; border-radius:8px;
    font-size:.85rem; margin-bottom:1rem;
  }
</style>
</head>
<body>
  <form class="card" method="POST" action="/admin/login" autocomplete="off">
    <h1>Admin Dashboard</h1>
    <p class="sub">Sign in to view site analytics.</p>
    ${error ? `<div class="error">${error}</div>` : ''}
    <label for="username">Username</label>
    <input id="username" name="username" type="text" autocomplete="username" required>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`;
}

async function readBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return Object.fromEntries(new URLSearchParams(raw));
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(renderLoginPage());
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass || !process.env.SESSION_SECRET) {
    res.status(500).send('Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and SESSION_SECRET.');
    return;
  }

  const { username, password } = await readBody(req);
  const ok =
    typeof username === 'string' &&
    typeof password === 'string' &&
    timingSafeEqualStr(username, adminUser) &&
    timingSafeEqualStr(password, adminPass);

  if (!ok) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(401).send(renderLoginPage({ error: 'Invalid username or password.' }));
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie(username));
  res.setHeader('Location', '/admin');
  res.status(302).send('');
};
