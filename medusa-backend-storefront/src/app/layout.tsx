import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { headers } from "next/headers"
import "styles/globals.css"

import { routing } from "@/i18n/routing"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const h = await headers()
  const locale = h.get("x-next-intl-locale") ?? routing.defaultLocale

  return (
    <html lang={locale} data-mode="light" suppressHydrationWarning>
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
