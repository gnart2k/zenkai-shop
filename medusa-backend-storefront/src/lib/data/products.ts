"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { storefrontDebugLog } from "@lib/util/storefront-debug"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

export const getInventoryQuantity = async (variantId: string): Promise<number> => {
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

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }
  const isHandleLookup = !!queryParams?.handle
  const shouldBypassCache =
    process.env.NODE_ENV === "development" || isHandleLookup

  storefrontDebugLog("products.listProducts", "fetch /store/products", {
    backendUrl: process.env.MEDUSA_BACKEND_URL ?? "http://localhost:4300",
    regionId: region?.id,
    countryCode: countryCode ?? null,
    limit,
    offset,
    pageParam: _pageParam,
    isHandleLookup,
    shouldBypassCache,
    cacheTags: "tags" in next ? (next as { tags: string[] }).tags : [],
    queryExtras: queryParams ?? {},
  })

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,",
          ...queryParams,
        },
        headers,
        // In dev or when querying by handle, bypass Data Cache so renamed/new handles
        // don't keep stale links/404s.
        next: shouldBypassCache ? undefined : next,
        cache: shouldBypassCache ? "no-store" : "force-cache",
      }
    )
    .then(async ({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      // Only fetch inventory when variants are explicitly requested
      const requestedFields = (queryParams?.fields || "").toLowerCase()
      const wantsVariants = requestedFields.includes("variant")
      // When no explicit fields (default) or variants are requested, do inventory
      const shouldFetchInventory = !requestedFields || wantsVariants

      if (shouldFetchInventory) {
        const variantIds = products.flatMap((p) => (p.variants || []).map((v) => v.id))
        const inventoryMap: Record<string, number> = {}

        const batchSize = 20
        for (let i = 0; i < variantIds.length; i += batchSize) {
          const batch = variantIds.slice(i, i + batchSize)
          const promises = batch.map(async (variantId) => {
            const qty = await getInventoryQuantity(variantId)
            inventoryMap[variantId] = qty
          })
          await Promise.all(promises)
        }

        for (const product of products) {
          if (product.variants) {
            for (const variant of product.variants) {
              variant.inventory_quantity = inventoryMap[variant.id] ?? 0
            }
          }
        }
      }

      storefrontDebugLog("products.listProducts", "response /store/products", {
        count,
        productIds: products.map((p) => p.id),
        handles: products.map((p) => p.handle),
        titles: products.map((p) => p.title),
      })

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  storefrontDebugLog("products.listProductsWithSort", "after sort + slice", {
    sortBy,
    page,
    sliceStart: pageParam,
    sliceEnd: pageParam + limit,
    totalFromApi: count,
    sortedLength: sortedProducts.length,
    pageProductIds: paginatedProducts.map((p) => p.id),
  })

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}
