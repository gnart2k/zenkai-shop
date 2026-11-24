"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listRegions = async () => {
  const next = {
    ...(await getCacheOptions("regions")),
  }

  return sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
    .catch(medusaError)
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  }

  return sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
    .catch(medusaError)
}

/** Returns null if the region does not exist (e.g. removed in Admin). */
export const tryRetrieveRegion = async (
  id: string
): Promise<HttpTypes.StoreRegion | null> => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  }

  return sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
    .catch(() => null)
}

/**
 * Resolves a region for a country from the current `/store/regions` list.
 * Do not cache regions in module scope: if a region is removed/recreated in Admin,
 * stale IDs cause "Region ... not found when populating the pricing context" on the API.
 * Rely on Next.js fetch caching on `listRegions()` instead.
 */
export const getRegion = async (countryCode: string) => {
  try {
    const regions = await listRegions()

    if (!regions) {
      return null
    }

    const regionByCountry = new Map<string, HttpTypes.StoreRegion>()
    regions.forEach((region) => {
      region.countries?.forEach((c) => {
        const iso = c?.iso_2 ?? ""
        if (iso) {
          regionByCountry.set(iso, region)
        }
      })
    })

    return countryCode
      ? regionByCountry.get(countryCode)
      : regionByCountry.get("us")
  } catch (e: any) {
    return null
  }
}
