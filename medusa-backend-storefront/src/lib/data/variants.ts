"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"

import { getAuthHeaders, getCacheOptions } from "./cookies"

const getInventoryQuantity = async (variantId: string): Promise<number> => {
  try {
    const response = await sdk.client.fetch<{ inventory_quantity: number }>(
      `/store/product-inventory`,
      {
        method: "GET",
        query: { variant_id: variantId },
      }
    )
    return response.inventory_quantity ?? 0
  } catch {
    return 0
  }
}

export const retrieveVariant = async (
  variant_id: string
): Promise<HttpTypes.StoreProductVariant | null> => {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders) return null

  const headers = {
    ...authHeaders,
  }

  const next = {
    ...(await getCacheOptions("variants")),
  }

  return await sdk.client
    .fetch<{ variant: HttpTypes.StoreProductVariant }>(
      `/store/product-variants/${variant_id}`,
      {
        method: "GET",
        query: {
          fields: "*images",
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(async (result) => {
      const inventoryQuantity = await getInventoryQuantity(variant_id)
      return {
        ...result.variant,
        inventory_quantity: inventoryQuantity,
      }
    })
    .catch(() => null)
}
