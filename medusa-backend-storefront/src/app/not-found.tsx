import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { routing } from "@/i18n/routing"

async function getLocale() {
  const h = await headers()
  return h.get("x-next-intl-locale") ?? routing.defaultLocale
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: await getLocale(),
    namespace: "ShopNotFound",
  })
  return { title: t("metaTitle"), description: t("metaDescription") }
}

export default async function NotFound() {
  const t = await getTranslations({
    locale: await getLocale(),
    namespace: "ShopNotFound",
  })

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">{t("title")}</h1>
      <p className="text-small-regular text-ui-fg-base">{t("description")}</p>
      <Link
        className="flex gap-x-1 items-center group"
        href="/"
      >
        <Text className="text-ui-fg-interactive">{t("backHome")}</Text>
        <ArrowUpRightMini
          className="group-hover:rotate-45 ease-in-out duration-150"
          color="var(--fg-interactive)"
        />
      </Link>
    </div>
  )
}
