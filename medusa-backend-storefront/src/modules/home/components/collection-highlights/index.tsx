import { HttpTypes } from "@medusajs/types"
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"

type Props = {
  collections: HttpTypes.StoreCollection[]
  countryCode: string
}

export default async function CollectionHighlights({
  collections,
  countryCode,
}: Props) {
  const t = await getTranslations("Home")

  if (!collections.length) return null

  return (
    <section className="bg-background py-12 small:py-16">
      <div className="content-container">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t("collectionsEyebrow")}
          </p>
          <h2 className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">
            {t("collectionsTitle")}
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/${countryCode}/collections/${c.handle}`}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
            >
              {c.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
