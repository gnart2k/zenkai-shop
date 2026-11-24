import { retrieveCart } from "@lib/data/cart"
import { listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { getStoreBranding } from "@lib/data/store-branding"
import { getStorefront } from "@lib/data/storefront-config"
import { pickText } from "@lib/storefront/templates"
import { getLocale, getTranslations } from "next-intl/server"

import NavClient from "@modules/layout/components/nav-client"

export default async function Nav() {
  const regions = await listRegions()
  const branding = await getStoreBranding()
  const { layout, branding: owner } = await getStorefront()
  const cart = await retrieveCart().catch(() => null)
  const t = await getTranslations("Nav")
  const locale = await getLocale()
  // Owner-set name (portal) first, then the Medusa-admin branding, then the translation default.
  const storeName =
    pickText(owner.store_name, locale) || branding.store_name?.trim() || t("storeName")
  const categories = ((await listCategories().catch(() => null)) ?? [])
    .filter((c) => !c.parent_category_id)
    .map((c) => ({ name: c.name, handle: c.handle }))

  return (
    <NavClient
      regions={regions}
      storeName={storeName}
      cart={cart}
      categories={categories}
      variant={layout.header}
      logoUrl={owner.logo || undefined}
      logoHeight={owner.logo_height}
      showName={owner.show_name}
    />
  )
}
