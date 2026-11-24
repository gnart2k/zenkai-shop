import { getTranslations } from "next-intl/server"

import type { HeroSlideData } from "@lib/data/hero"
import type { StoreBrandingPublic } from "@lib/data/store-branding"
import { readText, type SectionInstance } from "@lib/storefront/templates"
import SmartLink from "@modules/storefront/smart-link"

import { Reveal } from "../motion-primitives"

/** Hero, split style: text on one side, a large image on the other. */
export default async function HeroSplit({
  section,
  countryCode,
  locale,
  slides,
  branding,
}: {
  section: SectionInstance
  countryCode: string
  locale: string
  slides: HeroSlideData[]
  branding: StoreBrandingPublic
}) {
  const t = await getTranslations({ locale, namespace: "Home" })
  const slide = slides[0]
  const image = readText(section, "image", locale) || slide?.poster_url || branding.hero_url
  const title =
    readText(section, "heading", locale) ||
    (slide?.title?.[locale] ?? slide?.title?.vi ?? "").trim() ||
    branding.store_name?.trim() ||
    t("heroBadge")
  const subtitle = readText(section, "subheading", locale) || branding.tagline?.trim() || t("subtitleFallback")
  const label = readText(section, "button_label", locale) || t("heroCtaShop")
  const link = readText(section, "button_link", locale) || "/store"

  return (
    <section className="bg-secondary/60">
      <div className="content-container grid items-center gap-10 py-14 small:grid-cols-2 small:py-20">
        <Reveal className="order-2 space-y-6 small:order-1">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">{t("heroBadge")}</p>
          <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground small:text-5xl">
            {title}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">{subtitle}</p>
          <SmartLink
            href={link}
            countryCode={countryCode}
            className="inline-flex h-11 items-center rounded-[var(--radius)] bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {label}
          </SmartLink>
        </Reveal>
        <Reveal className="order-1 small:order-2" delay={0.08}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-muted small:aspect-[5/6]">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
