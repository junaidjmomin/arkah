"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"

import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl } from "react-leaflet"
import L from "leaflet"
import { useI18n } from "@/components/i18n-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getBrowserSupabase } from "@/lib/supabase-browser"

// Fix Leaflet default icons in bundlers by pointing to CDN assets
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

type Bounds = { south: number; west: number; north: number; east: number }

type PointFeature = {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] } // [lng, lat]
  properties: Record<string, any>
}

type FeatureCollection = {
  type: "FeatureCollection"
  features: PointFeature[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function DashboardMap() {
  const { t } = useI18n()
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [showReports, setShowReports] = useState(true)
  const [showSocial, setShowSocial] = useState(true)
  const [showHotspots, setShowHotspots] = useState(true)
  const [showAlerts, setShowAlerts] = useState(true)
  const [hotspotBust, setHotspotBust] = useState(0)
  const mapRef = useRef<L.Map | null>(null)

  // Build query key from bounds
  const query = useMemo(() => {
    if (!bounds) return null
    const q = `bounds=${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    return {
      reports: `/api/dashboard/reports?${q}`,
      social: `/api/dashboard/social?${q}`,
      hotspots: `/api/dashboard/hotspots?${q}&ts=${hotspotBust}`,
      alerts: `/api/dashboard/alerts?${q}`,
    }
  }, [bounds, hotspotBust])

  const { data: reports, mutate: mutateReports } = useSWR<FeatureCollection>(query?.reports ?? null, fetcher, {
    refreshInterval: 10000,
  })
  const { data: social } = useSWR<FeatureCollection>(query?.social ?? null, fetcher, { refreshInterval: 15000 })
  const { data: hotspots } = useSWR<FeatureCollection>(query?.hotspots ?? null, fetcher, { refreshInterval: 20000 })
  const { data: alerts } = useSWR<FeatureCollection>(query?.alerts ?? null, fetcher, { refreshInterval: 30000 })

  useEffect(() => {
    // Initialize bounds on first render if map is available
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    setBounds({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() })
  }, [])

  useEffect(() => {
    if (!query?.reports) return
    const supabase = getBrowserSupabase()

    const channel = supabase
      .channel("reports-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        // refresh reports layer when new report arrives or status changes
        mutateReports()
        setHotspotBust(Date.now())
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [query?.reports, mutateReports])

  function handleMoveEnd() {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    setBounds({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("dashboard.title")}</span>
          <span className="sr-only">{t("dashboard.legend")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-4" aria-label={t("dashboard.legend")}>
          <div className="flex items-center gap-2">
            <Checkbox id="layer-reports" checked={showReports} onCheckedChange={(v) => setShowReports(!!v)} />
            <Label htmlFor="layer-reports">{t("dashboard.layers.reports")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="layer-social" checked={showSocial} onCheckedChange={(v) => setShowSocial(!!v)} />
            <Label htmlFor="layer-social">{t("dashboard.layers.social")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="layer-hotspots" checked={showHotspots} onCheckedChange={(v) => setShowHotspots(!!v)} />
            <Label htmlFor="layer-hotspots">{t("dashboard.layers.hotspots")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="layer-alerts" checked={showAlerts} onCheckedChange={(v) => setShowAlerts(!!v)} />
            <Label htmlFor="layer-alerts">{t("dashboard.layers.alerts")}</Label>
          </div>
        </div>

        <div className="h-[540px] w-full overflow-hidden rounded-md border">
          <MapContainer
            center={[14.5995, 120.9842]} // Manila as a coastal default; can be changed
            zoom={11}
            className="h-full w-full"
            whenCreated={(m) => (mapRef.current = m)}
            onmoveend={handleMoveEnd}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <LayersControl position="topright">
              {showReports &&
                (reports?.features ?? []).map((f, idx) => {
                  const [lng, lat] = f.geometry.coordinates
                  return (
                    <Marker position={[lat, lng]} key={`r-${idx}`}>
                      <Popup>
                        <strong>{t("dashboard.layers.reports")}</strong>
                        <div className="text-sm">
                          <div>{f.properties?.category}</div>
                          <div>{f.properties?.severity}</div>
                          <div>{new Date(f.properties?.createdAt ?? Date.now()).toLocaleString()}</div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

              {showSocial &&
                (social?.features ?? []).map((f, idx) => {
                  const [lng, lat] = f.geometry.coordinates
                  return (
                    <Marker position={[lat, lng]} key={`s-${idx}`}>
                      <Popup>
                        <strong>{t("dashboard.layers.social")}</strong>
                        <div className="text-sm">
                          <div>{f.properties?.platform}</div>
                          <div>{f.properties?.text}</div>
                          <div>{t("dashboard.engagement", { n: String(f.properties?.engagement ?? 0) })}</div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

              {showHotspots &&
                (hotspots?.features ?? []).map((f, idx) => {
                  const [lng, lat] = f.geometry.coordinates
                  const radius = Number(f.properties?.radius ?? 500)
                  return (
                    <Circle
                      key={`h-${idx}`}
                      center={[lat, lng]}
                      radius={radius}
                      pathOptions={{ color: "red", fillColor: "red", fillOpacity: 0.2 }}
                    >
                      <Popup>
                        <strong>{t("dashboard.layers.hotspots")}</strong>
                        <div className="text-sm">
                          <div>{t("dashboard.reportsCount", { n: String(f.properties?.count ?? 0) })}</div>
                          <div>{t("dashboard.verified", { v: String(!!f.properties?.verified) })}</div>
                        </div>
                      </Popup>
                    </Circle>
                  )
                })}

              {showAlerts &&
                (alerts?.features ?? []).map((f, idx) => {
                  const [lng, lat] = f.geometry.coordinates
                  return (
                    <Marker position={[lat, lng]} key={`a-${idx}`}>
                      <Popup>
                        <strong>{t("dashboard.layers.alerts")}</strong>
                        <div className="text-sm">
                          <div>{f.properties?.source}</div>
                          <div>{f.properties?.headline}</div>
                          <div>{new Date(f.properties?.effective ?? Date.now()).toLocaleString()}</div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
            </LayersControl>
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  )
}
