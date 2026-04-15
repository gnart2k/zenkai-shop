import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "vi",
  localePrefix: "always",
})

export type AppLocale = (typeof routing.locales)[number]
