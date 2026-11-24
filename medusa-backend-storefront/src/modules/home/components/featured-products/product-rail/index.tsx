import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"
import { getTranslations } from "next-intl/server"


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
  if (products.length === 0) return null

  return (
    <div className="content-container py-12 small:py-24">
      <div className="mb-8 flex flex-col gap-3 small:flex-row small:items-end small:justify-between">
        <div className="flex flex-col gap-2">
          <Text className="txt-xlarge">{collection.title}</Text>
        </div>
        <InteractiveLink href={`/collections/${collection.handle}`}>
          {t("viewAll")}
        </InteractiveLink>
      </div>
      <ul className="grid grid-cols-2 small:grid-cols-3 gap-x-6 gap-y-24 small:gap-y-36">
        {products.map((product) => (
          <li key={product.id}>
            <ProductPreview product={product} region={region} isFeatured />
          </li>
        ))}
      </ul>
    </div>
  )
}
