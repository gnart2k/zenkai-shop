import { HttpTypes } from "@medusajs/types"
import { ChevronRight } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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

  if (!collections.length) {
    return (
      <section className="border-b border-border bg-background py-16 small:py-20">
        <div className="content-container flex flex-col items-center gap-4 text-center">
          <Badge variant="outline" className="rounded-full">
            {t("collectionsBadge")}
          </Badge>
          <p className="max-w-md text-muted-foreground">
            {t("collectionsEmpty")}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="border-b border-border bg-background py-16 small:py-20">
      <div className="content-container">
        <div className="flex flex-col gap-2 text-center small:text-left">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("collectionsEyebrow")}
          </p>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground small:text-4xl">
            {t("collectionsTitle")}
          </h2>
        </div>
        <Separator className="my-10 bg-border/80" />
        <ul className="flex flex-wrap justify-center gap-3 small:justify-start">
          {collections.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${countryCode}/collections/${c.handle}`}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-muted/50 hover:shadow"
              >
                {c.title}
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
