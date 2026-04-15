import { cookies } from "next/headers"

import { routing } from "@/i18n/routing"

/**
 * UI locale from next-intl cookie (set by middleware), for server actions / redirects.
 */
export async function getUiLocale(): Promise<string> {
  const store = await cookies()
  const fromCookie = store.get("NEXT_LOCALE")?.value
  if (
    fromCookie &&
    routing.locales.includes(fromCookie as (typeof routing.locales)[number])
  ) {
    return fromCookie
  }
  return routing.defaultLocale
}

export function localizedPath(
  locale: string,
  countryCode: string,
  path: string
) {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `/${locale}/${countryCode}${normalized}`
}
