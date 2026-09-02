// Edge function: consumes the uploaded body and reports how many bytes were received,
// for upload-speed measurement.
export const config = { runtime: 'edge' };

export default async function handler(req) {
  let received = 0;

  if (req.body) {
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) received += value.byteLength;
    }
  }

  return new Response(JSON.stringify({ received }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}
