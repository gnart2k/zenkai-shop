import { HttpTypes } from "@medusajs/types"

/** Stored on product `metadata` in Admin. Omitted or true = physical (needs shipping). */
export const PRODUCT_METADATA_IS_PHYSICAL = "is_physical" as const

/** @deprecated Prefer product metadata; still read for older data. */
export const VARIANT_METADATA_IS_PHYSICAL = PRODUCT_METADATA_IS_PHYSICAL

type VariantLike =
  | HttpTypes.StoreProductVariant
  | HttpTypes.StoreCartLineItem["variant"]
  | null
  | undefined

type ProductLike =
  | HttpTypes.StoreCartLineItem["product"]
  | HttpTypes.StoreProduct
  | null
  | undefined

function readIsPhysicalFromMeta(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== "object") {
    return true
  }

  const v = metadata[PRODUCT_METADATA_IS_PHYSICAL]
  if (v === false) {
    return false
  }
  if (v === true) {
    return true
  }
  if (v === "false") {
    return false
  }
  if (v === "true") {
    return true
  }

  return true
}

/**
 * Whether this variant represents a physical good (legacy: variant metadata only).
 * @deprecated Use `isLineItemPhysical` for carts; product-level `metadata.is_physical` is authoritative.
 */
export function isVariantPhysical(variant: VariantLike): boolean {
  if (!variant) {
    return true
  }

  const meta = variant.metadata as Record<string, unknown> | null | undefined
  return readIsPhysicalFromMeta(meta)
}

function isProductPhysical(product: ProductLike): boolean | null {
  if (!product) {
    return null
  }
  const meta = product.metadata as Record<string, unknown> | null | undefined
  if (!meta || typeof meta !== "object") {
    return null
  }
  if (!(PRODUCT_METADATA_IS_PHYSICAL in meta)) {
    return null
  }
  return readIsPhysicalFromMeta(meta)
}

/**
 * Whether a storefront product is physical.
 * Defaults to true when metadata is missing (backward compatible).
 */
export function isStoreProductPhysical(product: HttpTypes.StoreProduct | null | undefined): boolean {
  const fromProduct = isProductPhysical(product)
  if (fromProduct !== null) {
    return fromProduct
  }
  return true
}

/**
 * Whether a cart line requires shipping, using product `metadata.is_physical` when set,
 * otherwise falling back to variant metadata for backward compatibility.
 */
export function isLineItemPhysical(item: HttpTypes.StoreCartLineItem): boolean {
  const fromProduct = isProductPhysical(item.product)
  if (fromProduct !== null) {
    return fromProduct
  }
  return isVariantPhysical(item.variant)
}

/** True if any line item is physical (needs shipping / delivery step). */
export function cartRequiresShipping(cart: HttpTypes.StoreCart): boolean {
  if (!cart.items?.length) {
    return true
  }

  return cart.items.some((item) => isLineItemPhysical(item))
}
