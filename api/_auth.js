// Shared helpers for signing/verifying the admin session cookie.
// Uses HMAC-SHA256 with SESSION_SECRET so no external dependencies are needed.
const crypto = require('crypto');

const COOKIE_NAME = 'tkm_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSessionCookie(username) {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = base64url(JSON.stringify({ u: username, exp: expires }));
  const signature = sign(payload);
  const value = `${payload}.${signature}`;
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  return `${COOKIE_NAME}=${value}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; SameSite=Lax${isProd ? '; Secure' : ''}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function verifySession(req) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const value = cookies[COOKIE_NAME];
    if (!value) return null;
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;

    const expected = sign(payload);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function timingSafeEqualStr(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    // Still run a comparison to avoid leaking length via timing.
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

module.exports = {
  COOKIE_NAME,
  createSessionCookie,
  clearSessionCookie,
  verifySession,
  timingSafeEqualStr,
};
