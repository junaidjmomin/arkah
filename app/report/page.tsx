"use client"

import { useI18n } from "@/components/i18n-provider"
import ReportForm from "@/components/report-form"

function ReportContent() {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("report.title")}</h1>
      <p className="text-muted-foreground">
        {"Coming soon: media upload, location, category, notes, and offline queue."}
      </p>
    </div>
  )
}

export default function ReportPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <ReportContent />
      <div className="mt-6">
        <ReportForm />
      </div>
    </main>
  )
}
