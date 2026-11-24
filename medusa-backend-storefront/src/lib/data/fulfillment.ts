"use server"

import { sdk } from "@lib/config"
import { resolveCalculatedAmountFromCalculateResponse } from "@lib/util/shipping-calculated-amount"
import { FetchError } from "@medusajs/js-sdk"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders } from "./cookies"

export type CalculateShippingOptionPriceResult = {
  shipping_option: HttpTypes.StoreCartShippingOption | null
  error: string | null
}

function formatCalculateShippingOptionError(err: unknown): string {
  if (err instanceof FetchError) {
    const base = err.message || err.statusText || "Request failed"
    return `${base} (HTTP ${err.status})`
  }
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

export const listCartShippingMethods = async (cartId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    const shipping_options =
      await sdk.client.fetch<HttpTypes.StoreShippingOptionListResponse>(
        `/store/shipping-options`,
        {
          method: "GET",
          query: {
            cart_id: cartId,
          },
          headers,
          cache: "no-store",
        }
      ).then(({ shipping_options }) => shipping_options)

    console.info("[GHN][trace] listCartShippingMethods", {
      cartId,
      count: shipping_options?.length ?? 0,
      options:
        shipping_options?.map((o) => ({
          id: o.id,
          name: o.name,
          price_type: o.price_type,
          provider_id: o.provider_id,
        })) ?? [],
    })

    return shipping_options
  } catch (err) {
    console.warn("[GHN][trace] listCartShippingMethods:error", {
      cartId,
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export const calculatePriceForShippingOption = async (
  optionId: string,
  cartId: string,
  data?: Record<string, unknown>
): Promise<CalculateShippingOptionPriceResult> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const body = { cart_id: cartId, data }

  if (data) {
    body.data = data
  }

  console.info("[GHN][trace] calculatePriceForShippingOption:request", {
    optionId,
    cartId,
    hasCalculationData: Boolean(data),
    calculationKeys: data ? Object.keys(data) : [],
    to_district_id: data?.to_district_id ?? null,
    to_ward_code: data?.to_ward_code ?? null,
  })

  try {
    const shipping_option = await sdk.client
      .fetch<{ shipping_option: HttpTypes.StoreCartShippingOption }>(
        `/store/shipping-options/${optionId}/calculate`,
        {
          method: "POST",
          body,
          headers,
          cache: "no-store",
        }
      )
      .then(({ shipping_option }) => shipping_option)

    const resolved = resolveCalculatedAmountFromCalculateResponse(shipping_option)

    console.info("[GHN][trace] calculatePriceForShippingOption:success", {
      optionId,
      cartId,
      amount: shipping_option?.amount ?? null,
      calculated_price: shipping_option?.calculated_price ?? null,
      resolvedAmount: resolved,
    })

    if (typeof resolved !== "number") {
      return {
        shipping_option,
        error:
          "Medusa returned no price for this option (missing amount and calculated_price.calculated_amount).",
      }
    }

    return { shipping_option, error: null }
  } catch (err) {
    const message = formatCalculateShippingOptionError(err)
    console.warn("[GHN][trace] calculatePriceForShippingOption:error", {
      optionId,
      cartId,
      message,
    })
    return { shipping_option: null, error: message }
  }
}
