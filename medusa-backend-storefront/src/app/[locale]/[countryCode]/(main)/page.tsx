import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { getStorefront, getStorefrontChoice } from "@lib/data/storefront-config"
import { pickText } from "@lib/storefront/templates"
import HomeSection from "@modules/home/sections"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { getStoreBranding } from "@lib/data/store-branding"
import { getHeroSlides } from "@lib/data/hero"

export async function generateMetadata(props: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const params = await props.params
  const branding = await getStoreBranding()
  const choice = await getStorefrontChoice()
  const owner = choice.branding
  // The owner's own name/tagline win over the Medusa-admin branding widget.
  const name = pickText(owner?.store_name, params.locale) || branding.store_name?.trim()
  const tagline = pickText(owner?.tagline, params.locale) || branding.tagline?.trim()
  const customTitle = pickText(choice.texts["Metadata.defaultTitle"], params.locale)
  const t = await getTranslations({
    locale: params.locale,
    namespace: "Metadata",
  })

  return {
    title: customTitle || name || t("defaultTitle"),
    description: tagline || t("defaultDescription"),
  }
}

export default async function Home(props: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)
  const heroSlides = await getHeroSlides()

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }


  const { layout, home, branding: owner } = await getStorefront()
  const medusaBranding = await getStoreBranding()
  const branding = {
    ...medusaBranding,
    store_name: pickText(owner.store_name, params.locale) || medusaBranding.store_name,
    tagline: pickText(owner.tagline, params.locale) || medusaBranding.tagline,
  }
  const ctx = {
    countryCode,
    locale: params.locale,
    region,
    collections,
    slides: heroSlides,
    branding,
    // The transparent header only works over a full-width hero.
    overlayHeader: layout.header === "overlay",
  }

  return (
    <div className="flex flex-col bg-background">
      {home.map((section) => (
        <div key={section.id}>
          <HomeSection section={section} ctx={ctx} />
        </div>
      ))}
    </div>
  )
}
