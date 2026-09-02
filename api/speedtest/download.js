// Streams pseudo-random, uncompressible bytes for download-speed measurement.
// Runs as a Node serverless function pinned to the Cape Town region (see vercel.json)
// so throughput reflects the user's real path, not whichever edge node happened
// to answer the request.
const crypto = require('crypto');

const DEFAULT_BYTES = 4 * 1024 * 1024; // 4MB per chunk
const MAX_BYTES = 32 * 1024 * 1024; // 32MB safety cap

module.exports = (req, res) => {
  let bytes = parseInt((req.query && req.query.bytes) || '', 10);
  if (!Number.isFinite(bytes) || bytes <= 0) bytes = DEFAULT_BYTES;
  bytes = Math.min(bytes, MAX_BYTES);

  const buf = Buffer.allocUnsafe(bytes);
  crypto.randomFillSync(buf);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', String(bytes));
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).send(buf);
};
