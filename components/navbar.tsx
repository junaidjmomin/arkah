"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useI18n } from "./i18n-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function Navbar() {
  const { t, locale, setLocale } = useI18n()
  const pathname = usePathname()

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={cn(
          "px-3 py-2 rounded-md text-sm font-medium",
          active ? "bg-secondary text-foreground" : "text-foreground/80 hover:text-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        {children}
      </Link>
    )
  }

  return (
    <header className="w-full border-b bg-card">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              {t("app.name")}
            </Link>
            <nav aria-label={t("nav.main")} className="hidden md:flex items-center gap-1">
              <NavLink href="/report">{t("nav.report")}</NavLink>
              <NavLink href="/dashboard">{t("nav.dashboard")}</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label={t("nav.language")}>
                  {t(`locale.${locale}`)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLocale("en")}>{t("locale.en")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale("es")}>{t("locale.es")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale("fr")}>{t("locale.fr")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
