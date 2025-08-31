import { parseBounds } from "../_utils"
import { getServerSupabase } from "@/lib/supabase"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const b = parseBounds(url.searchParams)
  const supabase = getServerSupabase()

  let query = supabase
    .from("reports")
    .select("id, category, severity, lat, lng, created_at, verified, consent")
    .eq("consent", true)
    .order("created_at", { ascending: false })
    .limit(200)

  if (b) {
    query = query.gte("lat", b.south).lte("lat", b.north).gte("lng", b.west).lte("lng", b.east)
  }

  const { data, error } = await query

  if (error || !data) {
    return Response.json({ type: "FeatureCollection", features: [] })
  }

  const features = data
    .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
    .map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [Number(r.lng), Number(r.lat)] },
      properties: {
        id: r.id,
        category: r.category,
        severity: r.severity,
        createdAt: r.created_at,
        verified: r.verified ?? false,
      },
    }))

  return Response.json({ type: "FeatureCollection", features })
}
