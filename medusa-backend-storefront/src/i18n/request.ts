import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import { getStorefrontChoice } from "@lib/data/storefront-config"
import { loadRawMessages } from "@lib/storefront/messages"
import { applyTextOverrides } from "@lib/storefront/texts"

import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale
  }

  const choice = await getStorefrontChoice()
  // The owner's store name is just another text override: every place that prints
  // Nav.storeName (header, footer, checkout, emails' storefront pages) picks it up.
  const texts = { ...choice.texts }
  const name = choice.branding?.store_name
  if (name && (name.vi || name.en)) {
    texts["Nav.storeName"] = name
  }

  const messages = applyTextOverrides(await loadRawMessages(locale), texts, locale)
  return { locale, messages }
})
