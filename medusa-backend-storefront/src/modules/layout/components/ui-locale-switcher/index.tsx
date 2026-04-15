"use client"

import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

import { useRouter, usePathname } from "@/i18n/navigation"

/**
 * Switches UI language between English and Vietnamese (URL segment + next-intl messages).
 */
export default function UiLocaleSwitcher() {
  const t = useTranslations("Nav")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const countryCode = params.countryCode as string | undefined

  const otherLocale = locale === "vi" ? "en" : "vi"
  const label =
    otherLocale === "vi" ? t("switchToVietnamese") : t("switchToEnglish")

  return (
    <button
      type="button"
      className="txt-compact-small w-full text-left py-2 hover:text-ui-fg-disabled"
      onClick={() => {
        router.replace(pathname, { locale: otherLocale })
      }}
      data-testid="ui-locale-switch"
      disabled={!countryCode}
    >
      <span className="block text-ui-fg-subtle">{t("uiLanguage")}</span>
      <span className="font-medium text-ui-fg-base">{label}</span>
    </button>
  )
}
