import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { portalBase, portalFetch } from "@lib/portal/api"
import { Empty, PageHeader, Pager, money } from "@modules/portal/ui"
import { ImageOff, Package } from "lucide-react"
import { getTranslations } from "next-intl/server"

type Catalog = {
  currency_code: string
  count: number
  products: {
    id: string
    title: string
    thumbnail: string | null
    variants: {
      id: string
      sku: string | null
      title: string | null
      suggested_price: number | null
      original_price: number | null
    }[]
  }[]
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string; storeId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const page = Math.max(Number((await searchParams).page) || 1, 1)
  const limit = 12
  const catalog = await portalFetch<Catalog>(
    `/portal-api/collaborator/stores/${p.storeId}/products?limit=${limit}&offset=${(page - 1) * limit}`
  )
  const pages = Math.max(Math.ceil(catalog.count / limit), 1)
  const m = (n: number | null) => money(n, catalog.currency_code, p.locale)

  return (
    <>
      <PageHeader title={t("products.title")} description={t("products.priceHelp")} />
      {catalog.products.length === 0 ? (
        <Empty icon={Package} title={t("products.empty")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.products.flatMap((prod) =>
            prod.variants.map((v) => {
              const potential =
                v.suggested_price !== null && v.original_price !== null
                  ? v.suggested_price - v.original_price
                  : null
              return (
                <Card key={v.id} className="flex flex-col overflow-hidden">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    {prod.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.thumbnail} alt={prod.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                        <ImageOff className="size-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <p className="font-medium leading-snug">{prod.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[v.title, v.sku].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">{t("products.originalPrice")}</dt>
                        <dd className="font-semibold">{m(v.original_price)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">{t("products.suggestedPrice")}</dt>
                        <dd className="font-semibold">{m(v.suggested_price)}</dd>
                      </div>
                    </dl>
                    {potential !== null && potential > 0 ? (
                      <p className="text-xs font-medium text-emerald-700">
                        {t("products.potential", { amount: m(potential) })}
                      </p>
                    ) : null}
                    <div className="mt-auto pt-1">
                      {v.original_price === null ? null : (
                        <Button asChild className="w-full">
                          <a href={`${base}/collaborator/${p.storeId}/requests/new?variant_id=${v.id}`}>
                            {t("products.createRequest")}
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
      <Pager
        page={page}
        pages={pages}
        previous={t("common.previous")}
        next={t("common.next")}
        label={t("common.pageOf", { page, pages })}
      />
    </>
  )
}
