import { HttpTypes } from "@medusajs/types"
import { getTranslations } from "next-intl/server"

import { listProducts } from "@lib/data/products"
import { getStorefront } from "@lib/data/storefront-config"
import { readNumber, readText, type SectionInstance } from "@lib/storefront/templates"
import ProductPreview from "@modules/products/components/product-preview"
import { Link } from "@/i18n/navigation"

import { Reveal } from "../motion-primitives"

export default async function HomeFeaturedProductsSection({
  countryCode,
  region,
  section,
  locale,
}: {
  countryCode: string
  region: HttpTypes.StoreRegion
  section?: SectionInstance
  locale?: string
}) {
  const t = await getTranslations("Home")
  const { layout } = await getStorefront()

  const { response } = await listProducts({
    countryCode,
    queryParams: {
      limit: section ? Math.min(Math.max(readNumber(section, "count", 8), 4), 12) : 8,
    },
  })

  const products = response?.products ?? []
  if (!products.length) return null

  return (
    <section className="bg-background py-16 small:py-20">
      <div className="content-container">
        <Reveal className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {(section && locale && readText(section, "subheading", locale)) || t("collectionsEyebrow")}
          </p>
          <h2 className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">
            {(section && locale && readText(section, "heading", locale)) || t("featuredTitle")}
          </h2>
          <Link
            href={`/${countryCode}/store`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            {t("viewAllProducts")} →
          </Link>
        </Reveal>

        <Reveal className="mt-12" delay={0.06}>
          <div
            className={`grid grid-cols-2 gap-x-6 gap-y-16 small:grid-cols-3 ${
              layout.grid === 4 ? "large:grid-cols-4" : "large:grid-cols-3"
            }`}
          >
            {products.map((product) => (
              <div key={product.id} className="group block">
                <ProductPreview product={product} region={region} isFeatured />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
