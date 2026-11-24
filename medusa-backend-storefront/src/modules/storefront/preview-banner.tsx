import { getStorefrontChoice } from "@lib/data/storefront-config"
import { getLocale, getTranslations } from "next-intl/server"

import PreviewBannerView from "./preview-banner-view"

/** Shown only while the owner previews an unpublished draft (see PreviewBannerView). */
export default async function PreviewBanner({ countryCode }: { countryCode: string }) {
  const choice = await getStorefrontChoice()
  if (!choice.preview) return null
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: "Portal.preview" })

  return (
    <PreviewBannerView
      message={t("banner")}
      backLabel={t("backToEditor")}
      backHref="/portal/admin/appearance"
      exitLabel={t("exit")}
      exitHref={`/api/preview-exit?to=${encodeURIComponent(`/${locale}/${countryCode}`)}`}
    />
  )
}
