// Parse bounds from URLSearchParams as "south,west,north,east"
export function parseBounds(searchParams: URLSearchParams) {
  const b = searchParams.get("bounds")
  if (!b) return null
  const [south, west, north, east] = b.split(",").map((n) => Number(n))
  if ([south, west, north, east].some((v) => Number.isNaN(v))) return null
  return { south, west, north, east }
}

// generate n random points within bounds
export function randomPointsWithin(bounds: { south: number; west: number; north: number; east: number }, n: number) {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const lat = bounds.south + Math.random() * (bounds.north - bounds.south)
    const lng = bounds.west + Math.random() * (bounds.east - bounds.west)
    pts.push([lat, lng])
  }
  return pts
}
