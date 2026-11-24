import { HttpTypes } from "@medusajs/types"
import { getTranslations } from "next-intl/server"

import { getCategoryImages, listCategories } from "@lib/data/categories"
import { Link } from "@/i18n/navigation"

import { Reveal } from "../motion-primitives"

function rootCategories(
  categories: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  return categories.filter((c) => !c.parent_category_id)
}

async function getCategoryImageUrl(categoryId: string) {
  const images = await getCategoryImages(categoryId)
  const mainImage = images.find((img) => img.type === "image")
  const thumbnail = images.find((img) => img.type === "thumbnail")
  return mainImage?.url || thumbnail?.url || null
}

function CategoryCard({
  href,
  imageUrl,
  name,
  exploreLink,
  large,
}: {
  href: string
  imageUrl: string | null
  name: string
  exploreLink: string
  large?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-end overflow-hidden bg-neutral-100 ${
        large
          ? "col-span-2 aspect-[4/3] small:aspect-auto"
          : "aspect-[4/3] small:aspect-[4/3]"
      }`}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className={`relative z-10 ${large ? "p-6 small:p-10" : "p-6"}`}>
        <h3
          className={`font-serif font-light text-white ${
            large ? "text-2xl small:text-3xl" : "text-xl"
          }`}
        >
          {name}
        </h3>
        <span
          className={`mt-2 inline-flex items-center gap-1 font-medium tracking-wide text-white/80 transition-colors group-hover:text-white ${
            large ? "text-sm" : "text-xs"
          }`}
        >
          {exploreLink} →
        </span>
      </div>
    </Link>
  )
}

export default async function CategoryListSection({
  countryCode,
}: {
  countryCode: string
}) {
  const t = await getTranslations("Home")

  let categories: HttpTypes.StoreProductCategory[] = []
  try {
    const fetched = await listCategories({ limit: 100 })
    categories = fetched ?? []
  } catch {
    categories = []
  }

  const roots = rootCategories(categories)
  const displayCategories = roots.length > 0 ? roots : categories

  const items = await Promise.all(
    displayCategories.map(async (c) => ({
      key: c.id,
      name: c.name,
      href: `/${countryCode}/categories/${c.handle}`,
      imageUrl: await getCategoryImageUrl(c.id),
    }))
  )

  if (items.length === 0) return null

  const large = items[0]
  const small = items[1]

  return (
    <section className="bg-background py-12 small:py-16">
      <div className="content-container">
        <Reveal className="grid gap-4 small:grid-cols-3">
          {large && (
            <CategoryCard
              href={large.href}
              imageUrl={large.imageUrl}
              name={large.name}
              exploreLink={t("exploreLink")}
              large
            />
          )}

          <div className="flex flex-col gap-4">
            {small && (
              <CategoryCard
                href={small.href}
                imageUrl={small.imageUrl}
                name={small.name}
                exploreLink={t("exploreLink")}
              />
            )}

            {items[2] && (
              <CategoryCard
                href={items[2].href}
                imageUrl={items[2].imageUrl}
                name={items[2].name}
                exploreLink={t("exploreLink")}
              />
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
