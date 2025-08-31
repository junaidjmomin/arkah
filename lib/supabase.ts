import { cookies } from "next/headers"
import { createBrowserClient, createServerClient } from "@supabase/ssr"

export const getServerSupabase = () =>
  createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value
      },
    },
  })

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export const getBrowserSupabase = () => {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return browserClient
}

const noopCookies = {
  get: (_name: string) => undefined,
  set: (_name: string, _value: string, _options?: any) => {},
  remove: (_name: string, _options?: any) => {},
}

export const getServiceSupabase = () =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Service role only on the server; never expose to client
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: noopCookies },
  )
