import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  return (
    <div id="product-info">
      {product.collection && (
        <LocalizedClientLink
          href={`/collections/${product.collection.handle}`}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {product.collection.title}
        </LocalizedClientLink>
      )}
      <h1
        className="mt-2 font-serif text-3xl font-light leading-tight tracking-tight text-foreground"
        data-testid="product-title"
      >
        {product.title}
      </h1>
      {product.description && (
        <p
          className="mt-4 text-sm leading-relaxed text-muted-foreground"
          data-testid="product-description"
        >
          {product.description}
        </p>
      )}
    </div>
  )
}

export default ProductInfo
