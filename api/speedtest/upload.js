// Consumes the uploaded body and reports how many bytes were received,
// for upload-speed measurement. Runs as a Node serverless function pinned to the
// Cape Town region (see vercel.json) so it measures the user's real upload path.
module.exports = async (req, res) => {
  let received = 0;
  for await (const chunk of req) received += chunk.length;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).send(JSON.stringify({ received }));
};
