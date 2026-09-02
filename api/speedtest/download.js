// Edge function: streams pseudo-random, uncompressible bytes for download-speed measurement.
export const config = { runtime: 'edge' };

const DEFAULT_BYTES = 4 * 1024 * 1024; // 4MB per chunk
const MAX_BYTES = 32 * 1024 * 1024; // 32MB safety cap
const PIECE = 65536; // fill in 64KB pieces

function fillRandom(buf) {
  // crypto.getRandomValues is capped at 65536 bytes per call.
  for (let offset = 0; offset < buf.length; offset += PIECE) {
    const end = Math.min(offset + PIECE, buf.length);
    crypto.getRandomValues(buf.subarray(offset, end));
  }
  return buf;
}

export default function handler(req) {
  const url = new URL(req.url);
  let bytes = parseInt(url.searchParams.get('bytes') || '', 10);
  if (!Number.isFinite(bytes) || bytes <= 0) bytes = DEFAULT_BYTES;
  bytes = Math.min(bytes, MAX_BYTES);

  const body = fillRandom(new Uint8Array(bytes));

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(bytes),
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-content-type-options': 'nosniff',
    },
  });
}
