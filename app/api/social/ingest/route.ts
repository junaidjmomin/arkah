/* social ingestion endpoint: classify via Grok and upsert to Supabase, optionally index to Upstash Search */
import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { xai } from "@ai-sdk/xai"
import { getServiceSupabase } from "@/lib/supabase"
import { indexSocialDocuments } from "@/lib/search"

const PostSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  platform: z.string().min(1),
  createdAt: z.coerce.date().optional(),
  engagement: z.coerce.number().int().nonnegative().default(0),
  lat: z.number().optional(),
  lng: z.number().optional(),
  hintLanguage: z.string().optional(),
})

const InputSchema = z.object({
  posts: z.array(PostSchema).min(1).max(20), // limit to control cost
})

const ClassSchema = z.object({
  lang: z.string(),
  relevance: z.number().min(0).max(1),
  category: z.string(),
  severity: z.number().int().min(0).max(5),
  keywords: z.array(z.string()).max(20),
})

async function classifyOne(text: string, hintLanguage?: string) {
  const { object } = await generateObject({
    model: xai("grok-4"),
    schema: ClassSchema,
    prompt: `
Hazard post classification for emergency management.
Return JSON with fields: lang, relevance (0..1), category, severity (0..5), keywords[].
Text:
${text}
Hint language: ${hintLanguage ?? "none"}
`,
    temperature: 0.2,
  })
  return object
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { posts } = InputSchema.parse(body)

    // Run classifications (sequential to control rate; could batch/parallel with limits)
    const results: {
      post: z.infer<typeof PostSchema>
      cls: z.infer<typeof ClassSchema> | null
      error?: string
    }[] = []

    for (const p of posts) {
      try {
        const cls = await classifyOne(p.text, p.hintLanguage)
        results.push({ post: p, cls })
      } catch (e: any) {
        results.push({ post: p, cls: null, error: e?.message ?? "classify_failed" })
      }
    }

    // Upsert into DB
    const supabase = getServiceSupabase()
    const rows = results
      .filter((r) => r.cls)
      .map((r) => ({
        id: r.post.id,
        platform: r.post.platform,
        text: r.post.text,
        lang: r.cls!.lang,
        keywords: r.cls!.keywords,
        relevance: r.cls!.relevance,
        category: r.cls!.category,
        severity: r.cls!.severity,
        engagement: r.post.engagement ?? 0,
        lat: r.post.lat ?? null,
        lng: r.post.lng ?? null,
        created_at: r.post.createdAt ? new Date(r.post.createdAt) : new Date(),
      }))

    if (rows.length) {
      const { error } = await supabase.from("social_posts").upsert(rows, { onConflict: "id" })
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
    }

    // Optional indexing to Upstash Search for keyword/fulltext
    void indexSocialDocuments(
      rows.map((r) => ({
        id: r.id,
        text: r.text,
        platform: r.platform,
        lang: r.lang,
        keywords: r.keywords,
        relevance: r.relevance,
        category: r.category,
        severity: r.severity,
        engagement: r.engagement,
        lat: r.lat,
        lng: r.lng,
        created_at: r.created_at,
      })),
    )

    return NextResponse.json({
      ok: true,
      ingested: rows.length,
      failed: results.length - rows.length,
      errors: results.filter((r) => r.error).map((r) => ({ id: r.post.id, error: r.error })),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "ingest_failed" }, { status: 400 })
  }
}
