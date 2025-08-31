import { getServiceSupabase } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const ctype = req.headers.get("content-type") || ""
    if (!ctype.includes("multipart/form-data")) {
      return Response.json({ ok: false, error: "Expected multipart/form-data" }, { status: 400 })
    }

    const form = await req.formData()
    const payloadRaw = form.get("payload")
    if (typeof payloadRaw !== "string") {
      return Response.json({ ok: false, error: "Missing payload" }, { status: 400 })
    }

    const meta = JSON.parse(payloadRaw || "{}")
    const consent = !!meta.consent
    if (!consent) {
      return Response.json({ ok: false, error: "Consent required" }, { status: 400 })
    }

    const lat = Number(meta?.location?.lat)
    const lng = Number(meta?.location?.lng)
    const accuracy = meta?.location?.accuracy != null ? Number(meta.location.accuracy) : null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json({ ok: false, error: "Location required" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // 1) Insert report
    const { data: report, error: repErr } = await supabase
      .from("reports")
      .insert({
        category: String(meta.category || "unknown"),
        severity: String(meta.severity || "info"),
        notes: meta.notes ? String(meta.notes) : null,
        lat,
        lng,
        accuracy,
        consent: true,
      })
      .select("id, created_at")
      .single()

    if (repErr || !report) {
      return Response.json({ ok: false, error: repErr?.message || "Insert failed" }, { status: 500 })
    }

    const uploads: { path: string; type: string; size: number }[] = []

    // 2) Upload files and record metadata
    const entries = Array.from(form.entries()).filter(([k]) => k.startsWith("file"))
    for (let i = 0; i < entries.length; i++) {
      const [, value] = entries[i]
      if (!(value instanceof File)) continue
      const file = value
      const safeName = file.name?.replace(/[^\w.-]/g, "_") || `upload-${i}`
      const path = `${report.id}/${Date.now()}-${i}-${safeName}`

      const { error: upErr, data: upData } = await supabase.storage
        .from("report-media")
        .upload(path, file, { contentType: file.type, upsert: false })

      if (upErr || !upData?.path) {
        return Response.json({ ok: false, error: upErr?.message || "Upload failed" }, { status: 500 })
      }

      // insert media record
      const { error: medErr } = await supabase.from("report_media").insert({
        report_id: report.id,
        storage_path: upData.path,
        mime_type: file.type,
        size: file.size,
      })
      if (medErr) {
        return Response.json({ ok: false, error: medErr.message }, { status: 500 })
      }

      uploads.push({ path: upData.path, type: file.type, size: file.size })
    }

    return Response.json({ ok: true, id: report.id, uploads }, { status: 201 })
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
