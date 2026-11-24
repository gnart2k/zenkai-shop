"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"
import { storefrontDebugLog } from "@lib/util/storefront-debug"
import { HttpTypes } from "@medusajs/types"

export const listCartPaymentMethods = async (regionId: string) => {
  if (!regionId) {
    storefrontDebugLog("payment-providers", "listCartPaymentMethods: empty regionId", {})
    return []
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  storefrontDebugLog("payment-providers", "fetch /store/payment-providers", {
    region_id: regionId,
    has_auth_header: Boolean((headers as { authorization?: string }).authorization),
  })

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        cache: "no-store",
      }
    )
    .then(({ payment_providers }) => {
      const sorted = [...payment_providers].sort((a, b) =>
        a.id > b.id ? 1 : -1
      )
      storefrontDebugLog(
        "payment-providers",
        "payment providers loaded",
        {
          region_id: regionId,
          count: sorted.length,
          ids: sorted.map((p) => p.id),
        }
      )
      return sorted
    })
    .catch((err) => {
      storefrontDebugLog("payment-providers", "fetch failed", {
        region_id: regionId,
        message: err instanceof Error ? err.message : String(err),
      })
      return null
    })
}
