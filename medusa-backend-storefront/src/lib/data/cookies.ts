import "server-only"
import { revalidateTag } from "next/cache"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch (error) {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  // Base tag (e.g. "products") lets Medusa admin / subscribers call
  // revalidateTag("products") or GET /api/revalidate?tags=products for all visitors.
  // Session tag still scopes per-cookie invalidation (region/locale changes).
  const tags: string[] = [tag]
  if (cacheTag) {
    tags.push(cacheTag)
  }

  return { tags }
}

/**
 * Revalidates cache for `tag` the same way getCacheOptions tags fetches:
 * `tag-<session>` when _medusa_cache_id exists, otherwise the base `tag`.
 */
export const revalidateScopedTag = async (tag: string): Promise<void> => {
  if (typeof window !== "undefined") {
    return
  }

  const sessionTag = await getCacheTag(tag)
  revalidateTag(sessionTag || tag)
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    // Payment providers redirect back from a different origin (cross-site navigation).
    // "lax" keeps cookies on top-level GET returns (e.g. PayOS cancel/success URL).
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    // Keep cart cookie available after PayOS redirects back to storefront.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}
