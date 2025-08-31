/* NLP classification endpoint using OpenAI via AI SDK */
import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"

const InputSchema = z.object({
  text: z.string().min(1),
  hintLanguage: z.string().optional(),
})

const OutputSchema = z.object({
  lang: z.string(), // ISO code guess
  relevance: z.number().min(0).max(1),
  category: z.string(), // e.g., flood, storm, wildfire, landslide, outage
  severity: z.number().int().min(0).max(5),
  keywords: z.array(z.string()).max(20),
  reasoning: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, hintLanguage } = InputSchema.parse(body)

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: OutputSchema,
      prompt: `
You are a hazard post classifier for emergency management. 
Tasks:
- Detect language (ISO code).
- Rate relevance to hazards (0..1).
- Classify category (flood, storm, wildfire, earthquake, landslide, heat, tsunami, outage, civil-unrest, other).
- Estimate severity 0 (info) .. 5 (critical).
- Extract up to 12 keywords. 
Consider multilingual text. If hintLanguage is provided, use as a prior but verify.

Return only the JSON object. 
Text:
${text}
Hint language (may be empty): ${hintLanguage ?? "none"}
`,
      // Keep cost stable
      temperature: 0.2,
    })

    return NextResponse.json(object)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "classification_failed" }, { status: 400 })
  }
}
