import { HttpTypes } from "@medusajs/types"

/**
 * POST /store/shipping-options/:id/calculate usually sets `amount`, but some
 * responses only expose the fee on `calculated_price.calculated_amount`.
 */
export function resolveCalculatedAmountFromCalculateResponse(
  shippingOption: HttpTypes.StoreCartShippingOption | null | undefined
): number | null {
  if (!shippingOption) {
    return null
  }

  if (
    typeof shippingOption.amount === "number" &&
    Number.isFinite(shippingOption.amount)
  ) {
    return shippingOption.amount
  }

  const cap = shippingOption.calculated_price?.calculated_amount

  if (typeof cap === "number" && Number.isFinite(cap)) {
    return cap
  }

  return null
}
