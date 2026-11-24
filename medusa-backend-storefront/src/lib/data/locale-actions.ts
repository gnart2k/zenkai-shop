"use server"

import { sdk } from "@lib/config"
import { cookies as nextCookies } from "next/headers"
import { getAuthHeaders, getCartId, revalidateScopedTag } from "./cookies"

const LOCALE_COOKIE_NAME = "_medusa_locale"

/**
 * Gets the current locale from cookies
 */
export const getLocale = async (): Promise<string | null> => {
  try {
    const cookies = await nextCookies()
    return cookies.get(LOCALE_COOKIE_NAME)?.value ?? null
  } catch {
    return null
  }
}

/**
 * Sets the locale cookie
 */
export const setLocaleCookie = async (locale: string) => {
  const cookies = await nextCookies()
  cookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false, // Allow client-side access
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
  })
}

/**
 * Updates the locale preference via SDK and stores in cookie.
 * Also updates the cart with the new locale if one exists.
 */
export const updateLocale = async (localeCode: string): Promise<string> => {
  await setLocaleCookie(localeCode)

  // Update cart with the new locale if a cart exists
  const cartId = await getCartId()
  if (cartId) {
    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.cart.update(cartId, { locale: localeCode }, {}, headers)

    await revalidateScopedTag("carts")
  }

  // Revalidate relevant caches to refresh content
  await revalidateScopedTag("products")
  await revalidateScopedTag("categories")
  await revalidateScopedTag("collections")

  return localeCode
}
