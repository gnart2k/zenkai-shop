import { getTranslations } from "next-intl/server"

import type { StoreBrandingPublic } from "@lib/data/store-branding"
import { readText, type SectionInstance } from "@lib/storefront/templates"
import SmartLink from "@modules/storefront/smart-link"

import { Reveal } from "../motion-primitives"

/** Hero, text style: no image, a calm centered statement. */
export default async function HeroMinimal({
  section,
  countryCode,
  locale,
  branding,
}: {
  section: SectionInstance
  countryCode: string
  locale: string
  branding: StoreBrandingPublic
}) {
  const t = await getTranslations({ locale, namespace: "Home" })
  const title = readText(section, "heading", locale) || branding.store_name?.trim() || t("heroBadge")
  const subtitle = readText(section, "subheading", locale) || branding.tagline?.trim() || t("subtitleFallback")
  const label = readText(section, "button_label", locale) || t("heroCtaShop")
  const link = readText(section, "button_link", locale) || "/store"

  return (
    <section className="border-b bg-background">
      <Reveal className="content-container mx-auto flex max-w-3xl flex-col items-center gap-5 py-16 text-center small:py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">{t("heroBadge")}</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground small:text-6xl">{title}</h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{subtitle}</p>
        <SmartLink
          href={link}
          countryCode={countryCode}
          className="mt-2 inline-flex h-11 items-center rounded-[var(--radius)] bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {label}
        </SmartLink>
      </Reveal>
    </section>
  )
}
