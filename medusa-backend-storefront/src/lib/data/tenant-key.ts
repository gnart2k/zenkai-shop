"use server"

import { cookies, headers } from "next/headers"

const BACKEND = (process.env.MEDUSA_BACKEND_URL || "http://localhost:4300").replace(/\/$/, "")
const DEFAULT_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
const PORTAL_HOST = (process.env.PORTAL_HOST || "").toLowerCase()

async function lookup(query: string): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND}/portal-api/tenant?${query}`, {
      // Short cache: a new domain or key shows up within seconds, and requests do not
      // each pay a round trip to the backend.
      next: { revalidate: 30, tags: ["tenant"] },
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.publishable_key === "string" ? data.publishable_key : null
  } catch {
    return null
  }
}

/**
 * The publishable key of the store this request belongs to. One storefront app serves many
 * stores: each store has its own domain(s) (set in the Medusa admin, Portals page), and each
 * store has its own sales channel + publishable key, which is what scopes products, prices,
 * carts and orders in Medusa. Unknown hosts (localhost, the portal host) use the default key.
 * The editor's /preview pages use the key of the store being previewed.
 */
export async function getTenantKey(): Promise<string> {
  try {
    const h = await headers()
    if (h.get("x-sf-preview") === "1") {
      const token = (await cookies()).get("_sf_preview")?.value
      if (token) {
        const key = await lookup(`preview=${encodeURIComponent(token)}`)
        if (key) return key
      }
      return DEFAULT_KEY
    }
    const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase().replace(/:\d+$/, "")
    if (!host || host === PORTAL_HOST) return DEFAULT_KEY
    return (await lookup(`host=${encodeURIComponent(host)}`)) ?? DEFAULT_KEY
  } catch {
    // No request context (build, static): the default store.
    return DEFAULT_KEY
  }
}
