import { cookies, headers as requestHeaders } from "next/headers"

import { getTenantKey } from "@lib/data/tenant-key"
import {
  DEFAULT_CHOICE,
  resolveStorefront,
  type ResolvedStorefront,
  type StorefrontChoice,
} from "@lib/storefront/templates"

/**
 * Signed preview token (portal admins only). The cookie is scoped to Path=/preview and only
 * read for requests the middleware rewrote from /preview/... (x-sf-preview header), so the
 * live storefront never shows a draft.
 */
export const PREVIEW_COOKIE = "_sf_preview"

const BACKEND = (process.env.MEDUSA_BACKEND_URL || "http://localhost:4300").replace(/\/$/, "")

/**
 * The store owner's theme/branding/text choices (backend: GET /store/storefront-config).
 * Plain fetch on purpose: the i18n request config calls this to apply text overrides, and
 * the Medusa SDK wrapper asks next-intl for the locale, which would recurse.
 */
export async function getStorefrontChoice(): Promise<StorefrontChoice> {
  const headers = { "x-publishable-api-key": await getTenantKey() }

  // Preview mode: a visitor holding a valid signed token sees the owner's draft. The backend
  // verifies the token; an invalid or expired one just falls through to the published config.
  let token: string | undefined
  try {
    if ((await requestHeaders()).get("x-sf-preview") === "1") {
      token = (await cookies()).get(PREVIEW_COOKIE)?.value
    }
  } catch {
    // Static contexts (no request) have no cookies: always the published config.
  }
  if (token) {
    try {
      const res = await fetch(`${BACKEND}/store/storefront-config?preview=${encodeURIComponent(token)}`, {
        headers,
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.preview) return { ...DEFAULT_CHOICE, ...data }
      }
    } catch {
      // fall back to published
    }
  }

  try {
    const res = await fetch(`${BACKEND}/store/storefront-config`, {
      headers,
      next: { tags: ["storefront-config"], revalidate: 60 },
    })
    if (!res.ok) return DEFAULT_CHOICE
    return { ...DEFAULT_CHOICE, ...(await res.json()) }
  } catch {
    return DEFAULT_CHOICE
  }
}

export async function getStorefront(): Promise<ResolvedStorefront> {
  return resolveStorefront(await getStorefrontChoice())
}
