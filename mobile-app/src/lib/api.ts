import { API_BASE_URL } from "@src/config"

export type MediaAsset = {
  uri: string
  mimeType?: string | null
  fileName?: string | null
}

export type ReportPayload = {
  category: string
  severity: string
  notes?: string
  lat: number
  lng: number
  accuracy?: number | null
  consent: boolean
  media?: MediaAsset[]
}

export async function submitReport(
  payload: ReportPayload,
  opts?: { idempotencyKey?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const form = new FormData()
    form.append("category", payload.category)
    form.append("severity", payload.severity)
    if (payload.notes) form.append("notes", payload.notes)
    form.append("lat", String(payload.lat))
    form.append("lng", String(payload.lng))
    if (payload.accuracy != null) form.append("accuracy", String(payload.accuracy))
    form.append("consent", payload.consent ? "true" : "false")

    if (payload.media && payload.media.length) {
      for (const [i, m] of payload.media.entries()) {
        const name = m.fileName || `report-media-${i}.jpg`
        const type = m.mimeType || "image/jpeg"
        form.append("files", { uri: m.uri, name, type } as any)
      }
    }

    const headers: Record<string, string> = { Accept: "application/json" }
    if (opts?.idempotencyKey) headers["X-Idempotency-Key"] = opts.idempotencyKey

    const res = await fetch(`${API_BASE_URL}/api/reports`, {
      method: "POST",
      headers,
      body: form,
    })

    if (!res.ok) {
      const msg = await safeText(res)
      return { ok: false, error: msg || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" }
  }
}

async function safeText(res: Response) {
  try {
    return await res.text()
  } catch {
    return undefined
  }
}
