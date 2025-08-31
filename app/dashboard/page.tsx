"use client"

import { useI18n } from "@/components/i18n-provider"
import { DashboardMap } from "@/components/dashboard-map"

function DashboardContent() {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
      <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <DashboardContent />
      <div className="mt-6">
        <DashboardMap />
      </div>
    </main>
  )
}
