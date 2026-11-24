import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <span className="flex items-center gap-2">
      {price.price_type === "sale" && (
        <span
          className="text-sm text-muted-foreground line-through"
          data-testid="original-price"
        >
          {price.original_price}
        </span>
      )}
      <span
        className={price.price_type === "sale" ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground"}
        data-testid="price"
      >
        {price.calculated_price}
      </span>
    </span>
  )
}
