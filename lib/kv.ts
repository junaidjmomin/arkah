const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

if (!KV_URL || !KV_TOKEN) {
  // It's okay if KV isn't configured for local dev; we guard calls at runtime.
}

type KVGetOptions = { fallbackTTL?: number }
type KVSetOptions = { ttlSeconds?: number }

export async function kvGetJSON<T = unknown>(key: string, opts?: KVGetOptions): Promise<T | null> {
  if (!KV_URL || !KV_TOKEN) return null
  const url = new URL(`${KV_URL}/get/${encodeURIComponent(key)}`)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  })
  if (!res.ok) return null
  const data = (await res.json()) as { result: string | null }
  if (!data?.result) return null
  try {
    return JSON.parse(data.result) as T
  } catch {
    return null
  }
}

export async function kvSetJSON(key: string, value: unknown, opts?: KVSetOptions) {
  if (!KV_URL || !KV_TOKEN) return
  const body = JSON.stringify(value)
  const ttl = opts?.ttlSeconds
  const path = ttl ? `set/${encodeURIComponent(key)}/${ttl}` : `set/${encodeURIComponent(key)}`
  const url = new URL(`${KV_URL}/${path}`)
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body,
  })
}
