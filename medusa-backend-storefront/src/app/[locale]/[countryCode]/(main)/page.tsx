import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import FeaturedProducts from "@modules/home/components/featured-products"
import AnimatedHero from "@modules/home/components/animated-hero"
import CategoryListSection from "@modules/home/components/category-list-section"
import CollectionHighlights from "@modules/home/components/collection-highlights"
import HomeFeaturedProductsSection from "@modules/home/components/home-featured-products-section"
import { Reveal } from "@modules/home/components/motion-primitives"
import NewsletterPlaceholder from "@modules/home/components/newsletter-placeholder"
import ValueProps from "@modules/home/components/value-props"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { getStoreBranding } from "@lib/data/store-branding"

export async function generateMetadata(props: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const params = await props.params
  const branding = await getStoreBranding()
  const name = branding.store_name?.trim()
  const tagline = branding.tagline?.trim()
  const t = await getTranslations({
    locale: params.locale,
    namespace: "Metadata",
  })

  return {
    title: name || t("defaultTitle"),
    description: tagline || t("defaultDescription"),
  }
}

export default async function Home(props: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)
  const branding = await getStoreBranding()

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  const highlightCollectionHandle = collections[0]?.handle ?? null

  return (
    <div className="flex flex-col bg-background">
      <AnimatedHero
        branding={branding}
        countryCode={countryCode}
        highlightCollectionHandle={highlightCollectionHandle}
      />

      <Reveal>
        <CategoryListSection countryCode={countryCode} />
      </Reveal>

      <Reveal>
        <HomeFeaturedProductsSection
          countryCode={countryCode}
          region={region}
        />
      </Reveal>

      <Reveal>
        <CollectionHighlights
          collections={collections}
          countryCode={countryCode}
        />
      </Reveal>

      <ValueProps />

      <Reveal className="scroll-mt-24" id="shop">
        <ul className="flex flex-col gap-0">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </Reveal>

      <NewsletterPlaceholder />
    </div>
  )
}
