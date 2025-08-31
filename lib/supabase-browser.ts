import { createBrowserClient } from "@supabase/ssr"

type SupabaseClient = ReturnType<typeof createBrowserClient>

let browserClient: SupabaseClient | null = null

export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabase must be called in the browser")
  }
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }
    browserClient = createBrowserClient(url, anon)
  }
  return browserClient
}
