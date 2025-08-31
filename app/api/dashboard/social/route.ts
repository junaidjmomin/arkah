import { parseBounds } from "../_utils"
import { getServerSupabase } from "@/lib/supabase"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const b = parseBounds(url.searchParams)
  const supabase = getServerSupabase()

  let query = supabase
    .from("social_posts")
    .select("id, platform, text, engagement, created_at, lat, lng")
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
        platform: r.platform,
        text: r.text,
        engagement: r.engagement ?? 0,
        createdAt: r.created_at,
      },
    }))

  return Response.json({ type: "FeatureCollection", features })
}
