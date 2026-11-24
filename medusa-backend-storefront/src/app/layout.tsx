import { sdk } from "@lib/config"
import { getHeroSlides } from "@lib/data/hero"
import { getStoreBranding } from "@lib/data/store-branding"
import { getStorefront } from "@lib/data/storefront-config"
import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { headers } from "next/headers"
import "styles/globals.css"

import { routing } from "@/i18n/routing"

/** The share-preview image (WhatsApp, Zalo, Facebook, ...): the store's own picture, never a template. */
async function shareImage(logo: string): Promise<string | null> {
  // Presigned (expiring) URLs would break once crawlers cache the page: only stable URLs.
  const stable = (u?: string | null) => (u && !/X-Amz-Signature/i.test(u) ? u : null)
  const slides = await getHeroSlides()
  const poster = stable(slides.find((s) => stable(s.poster_url))?.poster_url)
  if (poster) return poster
  try {
    const { products } = await sdk.client.fetch<{ products: { thumbnail?: string | null }[] }>("/store/products", {
      query: { limit: 1, fields: "id,thumbnail" },
      next: { tags: ["products"], revalidate: 300 },
    })
    const thumb = stable(products?.[0]?.thumbnail)
    if (thumb) return thumb
  } catch {}
  return stable(logo) ?? stable((await getStoreBranding()).hero_url)
}

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getStorefront()
  // Links must point at the host being visited: one app serves many stores/domains.
  const h = await headers()
  const host = h.get("x-forwarded-host") || h.get("host")
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https")
  const base = host ? `${proto.split(",")[0]}://${host}` : getBaseURL()
  const image = await shareImage(branding.logo)
  return {
    metadataBase: new URL(base),
    ...(branding.favicon ? { icons: { icon: branding.favicon } } : {}),
    openGraph: { type: "website", ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", ...(image ? { images: [image] } : {}) },
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const h = await headers()
  const locale = h.get("x-next-intl-locale") ?? routing.defaultLocale

  return (
    <html lang={locale} data-mode="light" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
