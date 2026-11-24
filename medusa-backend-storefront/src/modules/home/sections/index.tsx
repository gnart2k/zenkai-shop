import type { HttpTypes } from "@medusajs/types"

import type { HeroSlideData } from "@lib/data/hero"
import type { StoreBrandingPublic } from "@lib/data/store-branding"
import { readSelect, type SectionInstance } from "@lib/storefront/templates"

import AnimatedHero from "../components/animated-hero"
import CategoryListSection from "../components/category-list-section"
import CategoryPills from "../components/category-pills"
import CollectionHighlights from "../components/collection-highlights"
import FeaturedProducts from "../components/featured-products"
import HeroMinimal from "../components/hero-minimal"
import HeroSplit from "../components/hero-split"
import HomeFeaturedProductsSection from "../components/home-featured-products-section"
import ImageWithText from "../components/image-with-text"
import { Reveal } from "../components/motion-primitives"
import RichText from "../components/rich-text"
import Testimonials from "../components/testimonials"
import TiktokReel from "../components/tiktok-reel"
import ValueProps from "../components/value-props"

export type HomeContext = {
  countryCode: string
  locale: string
  region: HttpTypes.StoreRegion
  collections: HttpTypes.StoreCollection[]
  slides: HeroSlideData[]
  branding: StoreBrandingPublic
  /** Header is transparent over the hero, so the hero slides under it. */
  overlayHeader: boolean
}

/** Renders one home section instance. Section types map 1:1 to the portal editor's list. */
export default function HomeSection({ section, ctx }: { section: SectionInstance; ctx: HomeContext }) {
  switch (section.type) {
    case "hero": {
      const style = readSelect(section, "style", ["carousel", "split", "text"] as const, "carousel")
      if (style === "split") {
        return (
          <HeroSplit section={section} countryCode={ctx.countryCode} locale={ctx.locale} slides={ctx.slides} branding={ctx.branding} />
        )
      }
      if (style === "text") {
        return <HeroMinimal section={section} countryCode={ctx.countryCode} locale={ctx.locale} branding={ctx.branding} />
      }
      return (
        <div className={ctx.overlayHeader ? "-mt-16" : undefined}>
          <AnimatedHero countryCode={ctx.countryCode} slides={ctx.slides} />
        </div>
      )
    }
    case "categories":
      return readSelect(section, "style", ["cards", "pills"] as const, "cards") === "pills" ? (
        <CategoryPills section={section} countryCode={ctx.countryCode} locale={ctx.locale} />
      ) : (
        <CategoryListSection countryCode={ctx.countryCode} />
      )
    case "featured":
      return (
        <Reveal>
          <HomeFeaturedProductsSection section={section} locale={ctx.locale} countryCode={ctx.countryCode} region={ctx.region} />
        </Reveal>
      )
    case "reel":
      return (
        <Reveal>
          <TiktokReel />
        </Reveal>
      )
    case "collections":
      return (
        <Reveal>
          <CollectionHighlights collections={ctx.collections} countryCode={ctx.countryCode} />
        </Reveal>
      )
    case "values":
      return <ValueProps />
    case "shop":
      return (
        <Reveal className="scroll-mt-24" id="shop">
          <ul className="flex flex-col gap-0">
            <FeaturedProducts collections={ctx.collections} region={ctx.region} />
          </ul>
        </Reveal>
      )
    case "image-with-text":
      return <ImageWithText section={section} countryCode={ctx.countryCode} locale={ctx.locale} />
    case "rich-text":
      return <RichText section={section} locale={ctx.locale} />
    case "testimonials":
      return <Testimonials section={section} locale={ctx.locale} />
    default:
      return null
  }
}
