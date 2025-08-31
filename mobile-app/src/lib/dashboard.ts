import { API_BASE_URL } from "@src/config"

export type Feature = {
  type: "Feature"
  geometry: { type: "Point" | "Polygon" | "MultiPolygon"; coordinates: any }
  properties?: Record<string, any>
}
export type FeatureCollection = { type: "FeatureCollection"; features: Feature[] }

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchReports(bbox: [number, number, number, number], signal?: AbortSignal) {
  const url = `${API_BASE_URL}/api/dashboard/reports?bbox=${bbox.join(",")}`
  return getJSON<FeatureCollection>(url, signal)
}

export async function fetchHotspots(bbox: [number, number, number, number], signal?: AbortSignal) {
  const url = `${API_BASE_URL}/api/dashboard/hotspots?bbox=${bbox.join(",")}`
  return getJSON<FeatureCollection>(url, signal)
}

export async function fetchAlerts(bbox: [number, number, number, number], signal?: AbortSignal) {
  const url = `${API_BASE_URL}/api/dashboard/alerts?bbox=${bbox.join(",")}`
  return getJSON<FeatureCollection>(url, signal)
}
