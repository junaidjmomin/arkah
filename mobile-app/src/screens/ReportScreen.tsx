"use client"

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, Image, ScrollView, Alert } from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"
import { useTranslation } from "react-i18next"
import { Colors, Spacing, Typography } from "@src/theme"
import { useEffect, useState } from "react"
import { enqueue, count as queueCount, processAll } from "@src/lib/offlineQueue"
import { submitReport } from "@src/lib/api"

type MediaUI = { uri: string; mimeType?: string | null; fileName?: string | null }

export default function ReportScreen() {
  const { t } = useTranslation()
  const [category, setCategory] = useState("flood")
  const [severity, setSeverity] = useState("moderate")
  const [notes, setNotes] = useState("")
  const [consent, setConsent] = useState(false)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [media, setMedia] = useState<MediaUI[]>([])
  const [queued, setQueued] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const MAX_BYTES = 10 * 1024 * 1024 // 10 MB media size limit

  useEffect(() => {
    refreshQueueCount()
  }, [])

  async function refreshQueueCount() {
    setQueued(await queueCount())
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(t("report.perms.mediaDeniedTitle"), t("report.perms.mediaDeniedBody"))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!result.canceled) {
      let tooLarge = false // track oversized files
      const next = result.assets
        .filter((a) => {
          if (a.fileSize != null && a.fileSize > MAX_BYTES) {
            tooLarge = true
            return false
          }
          return true
        })
        .map((a) => ({ uri: a.uri, mimeType: a.mimeType, fileName: a.fileName }))
      setMedia((prev) => [...prev, ...next])
      if (tooLarge) {
        Alert.alert(
          t("report.validation.mediaTooLargeTitle"),
          t("report.validation.mediaTooLargeBody", { limitMB: 10 }),
        )
      }
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(t("report.perms.cameraDeniedTitle"), t("report.perms.cameraDeniedBody"))
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled) {
      const a = result.assets[0]
      if (a?.fileSize != null && a.fileSize > MAX_BYTES) {
        Alert.alert(
          t("report.validation.mediaTooLargeTitle"),
          t("report.validation.mediaTooLargeBody", { limitMB: 10 }),
        )
        return
      }
      setMedia((prev) => [...prev, { uri: a.uri, mimeType: a.mimeType, fileName: a.fileName }])
    }
  }

  async function getLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(t("report.perms.locationDeniedTitle"), t("report.perms.locationDeniedBody"))
      return
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    setLat(pos.coords.latitude)
    setLng(pos.coords.longitude)
    setAccuracy(pos.coords.accuracy ?? null)
  }

  async function onSubmit() {
    if (!consent) {
      Alert.alert(t("report.validation.title"), t("report.validation.consent"))
      return
    }
    if (lat == null || lng == null) {
      Alert.alert(t("report.validation.title"), t("report.validation.location"))
      return
    }
    setSubmitting(true)
    const payload = {
      category,
      severity,
      notes: notes.trim() || undefined,
      lat,
      lng,
      accuracy,
      consent: true,
      media,
    }
    const res = await submitReport(payload)
    if (!res.ok) {
      // enqueue for offline sync
      await enqueue(payload)
      await refreshQueueCount()
      Alert.alert(t("report.offlineQueuedTitle"), t("report.offlineQueuedBody"))
    } else {
      Alert.alert(t("report.submittedTitle"), t("report.submittedBody"))
      // reset form
      setNotes("")
      setMedia([])
    }
    setSubmitting(false)
  }

  async function onSyncNow() {
    const result = await processAll()
    await refreshQueueCount()
    if (result.sent > 0) {
      Alert.alert(t("report.syncDoneTitle"), t("report.syncDoneBody", { count: result.sent }))
    } else {
      Alert.alert(t("report.syncNoneTitle"), t("report.syncNoneBody"))
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("report.title")}</Text>
      <Text style={styles.subtitle}>{t("report.subtitle")}</Text>

      <Text style={styles.label}>{t("report.form.category")}</Text>
      <View style={styles.chips}>
        {["flood", "storm", "wildfire", "earthquake"].map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, category === c && styles.chipActive]}
            onPress={() => setCategory(c)}
            accessibilityRole="button"
            accessibilityLabel={t("report.form.categoryOption", { category: c })}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t("report.form.severity")}</Text>
      <View style={styles.chips}>
        {["low", "moderate", "high"].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, severity === s && styles.chipActive]}
            onPress={() => setSeverity(s)}
            accessibilityRole="button"
            accessibilityLabel={t("report.form.severityOption", { severity: s })}
          >
            <Text style={[styles.chipText, severity === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t("report.form.notes")}</Text>
      <TextInput
        style={styles.input}
        value={notes}
        onChangeText={setNotes}
        placeholder={t("report.form.notesPlaceholder")}
        placeholderTextColor={Colors.muted}
        multiline
      />

      <Text style={styles.label}>{t("report.form.media")}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>{t("report.form.takePhoto")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={pickFromLibrary}>
          <Text style={styles.buttonTextSecondary}>{t("report.form.pickLibrary")}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mediaGrid}>
        {media.map((m, idx) => (
          <Image key={idx} source={{ uri: m.uri }} style={styles.media} />
        ))}
      </View>

      <Text style={styles.label}>{t("report.form.location")}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={getLocation}>
          <Text style={styles.buttonText}>{t("report.form.useLocation")}</Text>
        </TouchableOpacity>
        <Text style={styles.coords}>
          {lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : t("report.form.noLocation")}
        </Text>
      </View>

      <View style={styles.consentRow}>
        <Switch value={consent} onValueChange={setConsent} />
        <Text style={styles.consentText}>{t("report.form.consentLabel")}</Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>{submitting ? t("report.form.submitting") : t("report.form.submit")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={onSyncNow}>
          <Text style={styles.buttonTextSecondary}>
            {t("report.form.syncNow")} {queued > 0 ? `(${queued})` : ""}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, backgroundColor: Colors.background },
  title: { ...Typography.title, color: Colors.foreground, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.muted, marginBottom: Spacing.lg },
  label: { ...Typography.small, color: Colors.foreground, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: Spacing.md,
    color: Colors.foreground,
    minHeight: 90,
  },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.sm },
  button: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontWeight: "600" as const },
  buttonSecondary: { backgroundColor: "#EEF2FF", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  buttonTextSecondary: { color: Colors.primary, fontWeight: "600" as const },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD" },
  chipText: { color: Colors.foreground },
  chipTextActive: { color: Colors.primary, fontWeight: "600" as const },
  mediaGrid: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap", marginTop: Spacing.sm },
  media: { width: 96, height: 96, borderRadius: 8, backgroundColor: "#F3F4F6" },
  coords: { ...Typography.small, color: Colors.muted },
  consentRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.md },
  consentText: { ...Typography.body, color: Colors.foreground },
})
