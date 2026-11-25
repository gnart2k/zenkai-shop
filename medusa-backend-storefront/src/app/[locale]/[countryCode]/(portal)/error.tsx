"use client"

import { Button } from "@/components/ui/button"
import { TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

/** Any unexpected portal error: a clear message and a way out, never the raw "Application error". */
export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Portal.errors")
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="text-lg font-semibold">{t("pageFailed")}</h1>
      <p className="text-sm text-muted-foreground">{t("pageFailedHint")}</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>{t("retry")}</Button>
        <Button asChild variant="outline">
          <a href="/portal">{t("goHome")}</a>
        </Button>
      </div>
    </div>
  )
}
