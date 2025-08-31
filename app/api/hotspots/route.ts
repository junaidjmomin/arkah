import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"

type Hotspot = {
  id: string
  centroid: { lat: number; lng: number }
  count: number
  verified: number
  severityAvg: number | null
}

function keyFor(params: Record<string, string | number>) {
  const base = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}:${v}`)
    .join("|")
  return `hotspots:${base}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const noCache = searchParams.get("no_cache") === "1"
  const swLat = Number.parseFloat(searchParams.get("sw_lat") || "")
  const swLng = Number.parseFloat(searchParams.get("sw_lng") || "")
  const neLat = Number.parseFloat(searchParams.get("ne_lat") || "")
  const neLng = Number.parseFloat(searchParams.get("ne_lng") || "")
  const sinceHours = Number.parseInt(searchParams.get("since_hours") || "12", 10)
  const grid = Number.parseFloat(searchParams.get("grid_deg") || "0.05") // ~5.5km N-S per 0.05 deg
  const threshold = Number.parseInt(searchParams.get("min_count") || "5", 10)

  if ([swLat, swLng, neLat, neLng].some((v) => !Number.isFinite(v))) {
    return new Response(JSON.stringify({ error: "Missing or invalid bbox" }), { status: 400 })
  }

  const cacheKey = keyFor({ swLat, swLng, neLat, neLng, sinceHours, grid, threshold })

  if (!noCache) {
    const cached = await kvGetJSON<{ hotspots: Hotspot[] }>(cacheKey)
    if (cached) {
      return new Response(JSON.stringify(cached), { status: 200, headers: { "x-cache": "hit" } })
    }
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: () => cookieStore },
  )

  let q = supabase
    .from("reports")
    .select("id, lat, lng, status, severity")
    .eq("consent", true)
    .gte("lat", swLat)
    .lte("lat", neLat)
    .gte("lng", swLng)
    .lte("lng", neLng)

  if (!Number.isNaN(sinceHours)) {
    const iso = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString()
    q = q.gte("created_at", iso)
  }

  const { data, error } = await q.limit(5000)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  // Grid clustering
  type Bucket = {
    ids: string[]
    sumLat: number
    sumLng: number
    count: number
    verified: number
    severitySum: number
    severityCount: number
  }
  const buckets = new Map<string, Bucket>()
  const snap = (v: number) => Math.floor(v / grid) * grid

  for (const r of data ?? []) {
    const gx = snap(r.lat)
    const gy = snap(r.lng)
    const key = `${gx.toFixed(5)},${gy.toFixed(5)}`
    const b = buckets.get(key) ?? {
      ids: [],
      sumLat: 0,
      sumLng: 0,
      count: 0,
      verified: 0,
      severitySum: 0,
      severityCount: 0,
    }
    b.ids.push(r.id)
    b.sumLat += r.lat
    b.sumLng += r.lng
    b.count += 1
    if (r.status === "verified") b.verified += 1
    if (typeof r.severity === "number") {
      b.severitySum += r.severity
      b.severityCount += 1
    }
    buckets.set(key, b)
  }

  const hotspots: Hotspot[] = []
  for (const [key, b] of buckets) {
    if (b.count < threshold && b.verified === 0) continue
    const centroidLat = b.sumLat / b.count
    const centroidLng = b.sumLng / b.count
    hotspots.push({
      id: key,
      centroid: { lat: Number(centroidLat.toFixed(6)), lng: Number(centroidLng.toFixed(6)) },
      count: b.count,
      verified: b.verified,
      severityAvg: b.severityCount > 0 ? Number((b.severitySum / b.severityCount).toFixed(2)) : null,
    })
  }

  const payload = { hotspots }
  if (!noCache) {
    await kvSetJSON(cacheKey, payload, { ttlSeconds: 30 })
  }

  return new Response(JSON.stringify(payload), { status: 200, headers: { "x-cache": noCache ? "bypass" : "miss" } })
}
