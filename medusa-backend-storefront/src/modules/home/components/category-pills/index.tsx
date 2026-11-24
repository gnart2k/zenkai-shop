import { HttpTypes } from "@medusajs/types"
import { getTranslations } from "next-intl/server"

import { listCategories } from "@lib/data/categories"
import { readText, type SectionInstance } from "@lib/storefront/templates"
import { Link } from "@/i18n/navigation"

import { Reveal } from "../motion-primitives"

/** Template variant of the category section: a compact row of pill links. */
export default async function CategoryPills({
  countryCode,
  section,
  locale,
}: {
  countryCode: string
  section: SectionInstance
  locale: string
}) {
  const t = await getTranslations("Home")
  let categories: HttpTypes.StoreProductCategory[] = []
  try {
    categories = (await listCategories({ limit: 100 })) ?? []
  } catch {
    categories = []
  }
  const roots = categories.filter((c) => !c.parent_category_id)
  const items = roots.length ? roots : categories
  if (!items.length) return null

  return (
    <section className="bg-background py-8 small:py-10">
      <div className="content-container">
        <Reveal className="flex flex-wrap items-center justify-center gap-3">
          <span className="mr-1 text-sm font-medium text-muted-foreground">{readText(section, "heading", locale) || t("categoryEyebrowLive")}</span>
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/${countryCode}/categories/${c.handle}`}
              className="rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
