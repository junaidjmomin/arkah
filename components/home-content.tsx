"use client"

import Link from "next/link"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"

export function HomeContent() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-semibold text-balance">{t("home.title")}</h1>
      <p className="text-muted-foreground leading-relaxed">{t("home.subtitle")}</p>
      <div className="flex items-center gap-3 pt-2">
        <Button asChild>
          <Link href="/report">{t("home.cta.report")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">{t("home.cta.dashboard")}</Link>
        </Button>
      </div>
    </div>
  )
}
