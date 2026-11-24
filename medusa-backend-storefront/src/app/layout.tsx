import { getStorefront } from "@lib/data/storefront-config"
import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { headers } from "next/headers"
import "styles/globals.css"

import { routing } from "@/i18n/routing"

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getStorefront()
  return {
    metadataBase: new URL(getBaseURL()),
    ...(branding.favicon ? { icons: { icon: branding.favicon } } : {}),
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
