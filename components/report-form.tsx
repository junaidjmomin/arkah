"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/components/i18n-provider"
import {
  addQueuedReport,
  countQueuedReports,
  deleteQueuedReport,
  getQueuedReports,
  type QueuedReport,
} from "@/lib/offline-db"
import { useToast } from "@/hooks/use-toast"

type MediaPreview = { url: string; type: string; name: string; size: number; file: File }

export default function ReportForm() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [category, setCategory] = useState<string>("flood")
  const [severity, setSeverity] = useState<string>("moderate")
  const [notes, setNotes] = useState<string>("")
  const [consent, setConsent] = useState<boolean>(false)
  const [lat, setLat] = useState<number | undefined>(undefined)
  const [lng, setLng] = useState<number | undefined>(undefined)
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined)
  const [media, setMedia] = useState<MediaPreview[]>([])
  const [queueCount, setQueueCount] = useState<number>(0)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // reflect online/offline state
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    refreshQueueCount()
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  async function refreshQueueCount() {
    const c = await countQueuedReports()
    setQueueCount(c)
  }

  function onFilesSelected(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files).slice(0, 10) // cap to 10 items
    const previews: MediaPreview[] = arr.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type,
      name: f.name,
      size: f.size,
      file: f,
    }))
    setMedia(previews)
  }

  async function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast({ title: t("report.toasts.noGeolocationTitle"), description: t("report.toasts.noGeolocationDesc") })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setAccuracy(pos.coords.accuracy)
      },
      () => {
        toast({ title: t("report.toasts.locationFailTitle"), description: t("report.toasts.locationFailDesc") })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  const canSubmit = useMemo(() => {
    return !!category && !!severity && consent && media.length > 0 && typeof lat === "number" && typeof lng === "number"
  }, [category, severity, consent, media, lat, lng])

  async function queueReportLocally() {
    const id = crypto.randomUUID()
    const files = await Promise.all(
      media.map(async (m) => {
        const blob = m.file // already a Blob
        return {
          name: m.name,
          type: m.type,
          size: m.size,
          data: blob,
        }
      }),
    )
    const report: QueuedReport = {
      id,
      createdAt: Date.now(),
      category,
      severity,
      notes: notes || undefined,
      location: typeof lat === "number" && typeof lng === "number" ? { lat, lng, accuracy } : undefined,
      consent,
      files,
    }
    await addQueuedReport(report)
    await refreshQueueCount()
    toast({ title: t("report.toasts.queuedTitle"), description: t("report.toasts.queuedDesc") })
    resetForm(false)
  }

  function resetForm(clearLocation = false) {
    setNotes("")
    setMedia([])
    setConsent(false)
    if (clearLocation) {
      setLat(undefined)
      setLng(undefined)
      setAccuracy(undefined)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function sendToAPI(report: Omit<QueuedReport, "id"> & { id?: string }) {
    const fd = new FormData()
    fd.set(
      "payload",
      JSON.stringify({ ...report, files: report.files.map((f) => ({ name: f.name, type: f.type, size: f.size })) }),
    )
    report.files.forEach((f, idx) => {
      fd.append("file" + idx, f.data, f.name)
    })
    const res = await fetch("/api/reports", { method: "POST", body: fd })
    if (!res.ok) throw new Error("API rejected")
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) {
      toast({ title: t("report.toasts.incompleteTitle"), description: t("report.toasts.incompleteDesc") })
      return
    }
    setSubmitting(true)
    try {
      if (!online) {
        await queueReportLocally()
      } else {
        // Try to send immediately; if fails, queue locally
        const base = {
          createdAt: Date.now(),
          category,
          severity,
          notes: notes || undefined,
          location: typeof lat === "number" && typeof lng === "number" ? { lat, lng, accuracy } : undefined,
          consent,
          files: await Promise.all(
            media.map(async (m) => ({ name: m.name, type: m.type, size: m.size, data: m.file as Blob })),
          ),
        }
        try {
          await sendToAPI(base)
          toast({ title: t("report.toasts.sentTitle"), description: t("report.toasts.sentDesc") })
          resetForm()
        } catch {
          await queueReportLocally()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function syncNow() {
    const queued = await getQueuedReports()
    if (queued.length === 0) {
      toast({ title: t("report.toasts.nothingToSyncTitle"), description: t("report.toasts.nothingToSyncDesc") })
      return
    }
    let success = 0
    for (const r of queued) {
      try {
        const { id, ...rest } = r
        await sendToAPI(rest)
        await deleteQueuedReport(r.id)
        success++
      } catch {
        // stop on first failure to avoid burning battery/data
        break
      }
    }
    await refreshQueueCount()
    if (success > 0) {
      toast({ title: t("report.toasts.syncOkTitle"), description: t("report.toasts.syncOkDesc") })
    } else {
      toast({ title: t("report.toasts.syncFailTitle"), description: t("report.toasts.syncFailDesc") })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("report.title")}</CardTitle>
        <CardDescription>{t("report.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">{t("report.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder={t("report.category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flood">{t("report.categories.flood")}</SelectItem>
                  <SelectItem value="storm">{t("report.categories.storm")}</SelectItem>
                  <SelectItem value="fire">{t("report.categories.fire")}</SelectItem>
                  <SelectItem value="landslide">{t("report.categories.landslide")}</SelectItem>
                  <SelectItem value="infrastructure">{t("report.categories.infrastructure")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="severity">{t("report.severity")}</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="severity">
                  <SelectValue placeholder={t("report.severity")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t("report.severities.info")}</SelectItem>
                  <SelectItem value="minor">{t("report.severities.minor")}</SelectItem>
                  <SelectItem value="moderate">{t("report.severities.moderate")}</SelectItem>
                  <SelectItem value="severe">{t("report.severities.severe")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">{t("report.notes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("report.notesPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="media">{t("report.media")}</Label>
            <Input
              ref={fileInputRef}
              id="media"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => onFilesSelected(e.target.files)}
            />
            {media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {media.map((m, i) => (
                  <div key={i} className="rounded-md overflow-hidden border">
                    {m.type.startsWith("image/") ? (
                      <img src={m.url || "/placeholder.svg"} alt={m.name} className="h-24 w-full object-cover" />
                    ) : (
                      <video src={m.url} className="h-24 w-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("report.mediaHint")}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation}>
                {t("report.useLocation")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {online ? t("report.status.online") : t("report.status.offline")} •{" "}
                {t("report.queue.count", { n: queueCount.toString() })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="lat">{t("report.lat")}</Label>
                <Input
                  id="lat"
                  type="number"
                  value={lat ?? ""}
                  onChange={(e) => setLat(e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="lng">{t("report.lng")}</Label>
                <Input
                  id="lng"
                  type="number"
                  value={lng ?? ""}
                  onChange={(e) => setLng(e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </div>
            </div>
            {typeof accuracy === "number" && (
              <p className="text-xs text-muted-foreground">
                {t("report.accuracy", { n: Math.round(accuracy).toString() })}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="consent"
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-describedby="consent-desc"
            />
            <div>
              <Label htmlFor="consent">{t("report.consentTitle")}</Label>
              <p id="consent-desc" className="text-sm text-muted-foreground">
                {t("report.consentDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSubmit || submitting}>
              {online ? t("report.submit") : t("report.queue")}
            </Button>
            <Button type="button" variant="secondary" onClick={syncNow} disabled={!online}>
              {t("report.syncNow")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
