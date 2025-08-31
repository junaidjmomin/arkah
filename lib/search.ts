/* minimal Upstash Search helpers (best-effort, optional) */
const SEARCH_URL = process.env.UPSTASH_SEARCH_REST_URL
const SEARCH_TOKEN = process.env.UPSTASH_SEARCH_REST_TOKEN

function headers() {
  return SEARCH_TOKEN ? { Authorization: `Bearer ${SEARCH_TOKEN}`, "Content-Type": "application/json" } : undefined
}

export async function indexSocialDocuments(docs: Array<Record<string, any>>) {
  if (!SEARCH_URL || !SEARCH_TOKEN || !docs.length) return
  try {
    // Upstash Search REST API shape can vary; this is a minimal best-effort indexer.
    const res = await fetch(`${SEARCH_URL}/indexes/social-posts/docs`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ docs }),
    })
    // Ignore non-OK silently; logging can be added if desired
    void res
  } catch {
    // ignore
  }
}
