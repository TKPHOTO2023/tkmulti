// Minimal Google Analytics Data API (GA4) client using a service account.
// No external dependencies: signs its own JWT with Node's built-in crypto
// and calls the REST API directly with the global fetch.
const crypto = require('crypto');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

let cachedToken = null; // { token, expiresAt } — reused across warm invocations

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function getCredentials() {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!raw || !propertyId) return null;
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON is missing client_email or private_key');
  }
  return { clientEmail: creds.client_email, privateKey: creds.private_key, propertyId };
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const { clientEmail, privateKey } = getCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey).toString('base64url');
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GA4 auth failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

async function batchRunReports(requests) {
  const { propertyId } = getCredentials();
  const token = await getAccessToken();
  const res = await fetch(`${DATA_API}/properties/${propertyId}:batchRunReports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GA4 Data API failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const json = await res.json();
  return json.reports || [];
}

async function runRealtimeReport() {
  const { propertyId } = getCredentials();
  const token = await getAccessToken();
  const res = await fetch(`${DATA_API}/properties/${propertyId}:runRealtimeReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const value = json.rows?.[0]?.metricValues?.[0]?.value;
  return value != null ? Number(value) : 0;
}

module.exports = { getCredentials, batchRunReports, runRealtimeReport };
