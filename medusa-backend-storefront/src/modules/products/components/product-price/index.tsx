import { useTranslations } from "next-intl"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const t = useTranslations("ShopProduct")
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="h-9 w-32 animate-pulse bg-neutral-100" />
  }

  return (
    <div className="flex flex-col">
      <span className="text-xl font-light text-foreground">
        {!variant && `${t("from")} `}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
      </span>
      {selectedPrice.price_type === "sale" && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted-foreground line-through">
            {selectedPrice.original_price}
          </span>
          <span className="text-sm font-medium text-red-500">
            -{selectedPrice.percentage_diff}%
          </span>
        </div>
      )}
    </div>
  )
}
