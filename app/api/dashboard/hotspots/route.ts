import { parseBounds } from "../_utils"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const b = parseBounds(url.searchParams)

  // If no bounds provided, short-circuit with empty collection (UI will handle)
  if (!b) {
    return Response.json({ type: "FeatureCollection", features: [] })
  }

  const params = new URLSearchParams({
    sw_lat: String(b.south),
    sw_lng: String(b.west),
    ne_lat: String(b.north),
    ne_lng: String(b.east),
    since_hours: "12",
    grid_deg: "0.05",
    min_count: "5",
  })
  if (url.searchParams.get("ts")) {
    params.set("no_cache", "1")
  }

  const res = await fetch(`${url.origin}/api/hotspots?${params.toString()}`, { cache: "no-store" })
  if (!res.ok) {
    return Response.json({ type: "FeatureCollection", features: [] }, { status: 200 })
  }
  const data = (await res.json()) as {
    hotspots: {
      id: string
      centroid: { lat: number; lng: number }
      count: number
      verified: number
      severityAvg: number | null
    }[]
  }

  // Map to FeatureCollection expected by the dashboard
  const features = (data.hotspots ?? []).map((h) => {
    // simple radius scaling: base 300m + 60m per report, clamped
    const radius = Math.min(1200, Math.max(300, 300 + h.count * 60))
    return {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [h.centroid.lng, h.centroid.lat] },
      properties: {
        id: h.id,
        radius,
        count: h.count,
        verified: h.verified > 0,
        severityAvg: h.severityAvg,
      },
    }
  })

  return Response.json({ type: "FeatureCollection", features })
}
