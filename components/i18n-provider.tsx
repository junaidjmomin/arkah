"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { dictionaries, type SupportedLocale, defaultLocale } from "@/lib/i18n"

type I18nContextType = {
  locale: SupportedLocale
  setLocale: (l: SupportedLocale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale)

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem("locale")) as SupportedLocale | null
    if (stored && dictionaries[stored]) {
      setLocaleState(stored)
    } else {
      // try navigator language on first run
      const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : undefined
      if (nav && ["en", "es", "fr"].includes(nav)) {
        setLocaleState(nav as SupportedLocale)
      }
    }
  }, [])

  const setLocale = (l: SupportedLocale) => {
    setLocaleState(l)
    try {
      window.localStorage.setItem("locale", l)
    } catch {}
  }

  const t = useMemo(() => {
    const dict = dictionaries[locale] || dictionaries[defaultLocale]
    return (key: string) => dict[key] ?? key
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
