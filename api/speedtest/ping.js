// Edge function: tiny, fast-as-possible response for latency/jitter measurement.
export const config = { runtime: 'edge' };

export default function handler() {
  return new Response('{}', {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}
