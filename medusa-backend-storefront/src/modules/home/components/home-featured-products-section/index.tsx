import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { Sparkles } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { listProducts } from "@lib/data/products"
import { MOCK_FEATURED_PRODUCTS } from "@modules/home/data/home-mocks"
import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"

import { Reveal } from "../motion-primitives"

function MockFeaturedCard({
  product,
  countryCode,
  demoLabel,
}: {
  product: (typeof MOCK_FEATURED_PRODUCTS)[number]
  countryCode: string
  demoLabel: string
}) {
  return (
    <Card className="group h-full overflow-hidden border-border/80 bg-card/90 shadow-sm transition-all hover:shadow-md">
      <Link
        href={`/${countryCode}/store`}
        className="flex flex-col"
        aria-label={`${product.title} (${demoLabel})`}
      >
        <AspectRatio ratio={3 / 4} className="bg-muted">
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </AspectRatio>
        <div className="flex flex-col gap-1 border-t border-border/60 px-4 py-4">
          <span className="line-clamp-2 font-medium leading-snug text-foreground">
            {product.title}
          </span>
          <span className="text-sm text-muted-foreground">{product.priceLabel}</span>
          <Badge variant="secondary" className="mt-2 w-fit rounded-full text-[10px] uppercase tracking-wide">
            {demoLabel}
          </Badge>
        </div>
      </Link>
    </Card>
  )
}

export default async function HomeFeaturedProductsSection({
  countryCode,
  region,
}: {
  countryCode: string
  region: HttpTypes.StoreRegion
}) {
  const t = await getTranslations("Home")

  const { response } = await listProducts({
    countryCode,
    queryParams: {
      limit: 8,
    },
  })

  const products = response?.products ?? []
  const useMock = products.length === 0

  return (
    <section className="border-b border-border bg-muted/20 py-16 small:py-24">
      <div className="content-container">
        <Reveal className="flex flex-col gap-4 text-center small:flex-row small:items-end small:justify-between small:text-left">
          <div className="flex flex-col items-center gap-3 small:items-start">
            <Badge
              variant={useMock ? "secondary" : "outline"}
              className="w-fit gap-1.5 rounded-full"
            >
              <Sparkles className="size-3.5" aria-hidden />
              {useMock ? t("featuredBadgeMock") : t("featuredBadgeLive")}
            </Badge>
            <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground small:text-4xl">
              {t("featuredTitle")}
            </h2>
            <p className="max-w-xl text-muted-foreground">
              {useMock
                ? t("featuredDescriptionMock")
                : t("featuredDescriptionLive")}
            </p>
          </div>
          <InteractiveLink href="/store">{t("viewAllProducts")}</InteractiveLink>
        </Reveal>

        <Reveal className="mt-12" delay={0.06}>
          {useMock ? (
            <ul className="grid grid-cols-2 gap-4 gap-y-10 small:grid-cols-3 large:grid-cols-4">
              {MOCK_FEATURED_PRODUCTS.map((p) => (
                <li key={p.id}>
                  <MockFeaturedCard
                    product={p}
                    countryCode={countryCode}
                    demoLabel={t("demoProduct")}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-16 small:grid-cols-3 large:grid-cols-4">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductPreview
                    product={product}
                    region={region}
                    isFeatured
                  />
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </section>
  )
}
