// Tiny, fast-as-possible response for latency/jitter measurement.
// Runs as a Node serverless function pinned to the Cape Town region (see vercel.json)
// so round-trip time actually reflects the user's real path to CircleTel infrastructure.
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).send('{}');
};
