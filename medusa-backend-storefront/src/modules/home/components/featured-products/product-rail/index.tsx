import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"
import { getTranslations } from "next-intl/server"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"

export default async function ProductRail({
  collection,
  region,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
}) {
  const t = await getTranslations("Home")

  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: "*variants.calculated_price",
    },
  })

  const products = pricedProducts ?? []
  const isEmpty = products.length === 0

  return (
    <div className="content-container py-12 small:py-24">
      <div className="mb-8 flex flex-col gap-3 small:flex-row small:items-end small:justify-between">
        <div className="flex flex-col gap-2">
          <Text className="txt-xlarge">{collection.title}</Text>
          {isEmpty ? (
            <Badge variant="secondary" className="w-fit rounded-full">
              {t("productsComingSoon")}
            </Badge>
          ) : null}
        </div>
        <InteractiveLink href={`/collections/${collection.handle}`}>
          {t("viewAll")}
        </InteractiveLink>
      </div>
      {isEmpty ? (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-12 small:grid-cols-3 small:gap-y-16">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-3">
              <AspectRatio ratio={3 / 4} className="overflow-hidden rounded-xl border border-border bg-muted/40">
                <Skeleton className="size-full rounded-xl" />
              </AspectRatio>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 small:grid-cols-3 gap-x-6 gap-y-24 small:gap-y-36">
          {products.map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} isFeatured />
            </li>
          ))}
        </ul>
      )}
      {isEmpty ? (
        <p className="mt-10 max-w-lg text-sm text-muted-foreground">
          {t("collectionRailEmpty")}
        </p>
      ) : null}
    </div>
  )
}
