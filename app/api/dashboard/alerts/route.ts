import { parseBounds, randomPointsWithin } from "../_utils"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const b = parseBounds(url.searchParams)
  const points = b ? randomPointsWithin(b, 2) : [[14.59, 121.01]]
  const features = points.map(([lat, lng], i) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      id: `a-${i}`,
      source: ["NOAA", "GDACS"][i % 2],
      headline: i % 2 === 0 ? "Coastal flood advisory" : "Severe storm watch",
      effective: Date.now() - i * 120_000,
    },
  }))
  return Response.json({ type: "FeatureCollection", features })
}
