"use client"

import { View, Text, StyleSheet, Switch, ActivityIndicator } from "react-native"
import MapView, { Marker, Circle, type Region as RNRegion } from "react-native-maps"
import { useTranslation } from "react-i18next"
import { Colors, Spacing, Typography } from "@src/theme"
import { useEffect, useMemo, useRef, useState } from "react"
import { bboxFromRegion } from "@src/lib/maps"
import { fetchReports, fetchHotspots, fetchAlerts, type FeatureCollection } from "@src/lib/dashboard"

type LayerState = {
  reports: boolean
  hotspots: boolean
  alerts: boolean
}

const INITIAL_REGION: RNRegion = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
}

export default function MapScreen() {
  const { t } = useTranslation()
  const [region, setRegion] = useState<RNRegion>(INITIAL_REGION)
  const [layers, setLayers] = useState<LayerState>({ reports: true, hotspots: true, alerts: false })

  const [reports, setReports] = useState<FeatureCollection | null>(null)
  const [hotspots, setHotspots] = useState<FeatureCollection | null>(null)
  const [alerts, setAlerts] = useState<FeatureCollection | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const bbox = useMemo(() => bboxFromRegion(region), [region])

  function toggleLayer(key: keyof LayerState) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function loadLayers() {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    try {
      const promises: Promise<any>[] = []
      if (layers.reports) promises.push(fetchReports(bbox, ac.signal).then(setReports))
      else setReports(null)
      if (layers.hotspots) promises.push(fetchHotspots(bbox, ac.signal).then(setHotspots))
      else setHotspots(null)
      if (layers.alerts) promises.push(fetchAlerts(bbox, ac.signal).then(setAlerts))
      else setAlerts(null)
      await Promise.all(promises)
    } catch {
      // ignore fetch errors for now
    } finally {
      if (abortRef.current === ac) abortRef.current = null
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox[0], bbox[1], bbox[2], bbox[3], layers.reports, layers.hotspots, layers.alerts])

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={(r) => setRegion(r)}
      >
        {layers.reports &&
          reports?.features?.map((f, idx) => {
            if (f.geometry?.type !== "Point") return null
            const [lng, lat] = f.geometry.coordinates as [number, number]
            const title = f.properties?.category || "Report"
            const description = f.properties?.severity ? `Severity: ${f.properties.severity}` : undefined
            return (
              <Marker
                key={`rep-${idx}`}
                coordinate={{ latitude: lat, longitude: lng }}
                title={title}
                description={description}
              />
            )
          })}

        {layers.hotspots &&
          hotspots?.features?.map((f, idx) => {
            if (f.geometry?.type !== "Point") return null
            const [lng, lat] = f.geometry.coordinates as [number, number]
            const count = Number(f.properties?.count || 1)
            // radius in meters scaled by sqrt(count)
            const radius = Math.min(1500, 300 * Math.sqrt(count))
            return (
              <Circle
                key={`hot-${idx}`}
                center={{ latitude: lat, longitude: lng }}
                radius={radius}
                strokeColor="rgba(234, 88, 12, 0.9)"
                fillColor="rgba(251, 146, 60, 0.25)"
              />
            )
          })}

        {layers.alerts &&
          alerts?.features?.map((f, idx) => {
            // Alerts may be points for now
            if (f.geometry?.type === "Point") {
              const [lng, lat] = f.geometry.coordinates as [number, number]
              const title = f.properties?.title || "Alert"
              return (
                <Marker
                  key={`al-${idx}`}
                  coordinate={{ latitude: lat, longitude: lng }}
                  pinColor={Colors.alert}
                  title={title}
                />
              )
            }
            return null
          })}
      </MapView>

      <View style={styles.panel} accessibilityRole="summary">
        <Text style={styles.panelTitle}>{t("map.title")}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Reports</Text>
          <Switch value={layers.reports} onValueChange={() => toggleLayer("reports")} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Hotspots</Text>
          <Switch value={layers.hotspots} onValueChange={() => toggleLayer("hotspots")} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Alerts</Text>
          <Switch value={layers.alerts} onValueChange={() => toggleLayer("alerts")} />
        </View>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  panel: {
    position: "absolute",
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: Spacing.md,
  },
  panelTitle: { ...Typography.body, fontWeight: "600", color: Colors.foreground, marginBottom: Spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.xs },
  label: { ...Typography.body, color: Colors.foreground },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: Spacing.sm },
  loadingText: { ...Typography.small, color: Colors.muted, marginLeft: 8 },
})
