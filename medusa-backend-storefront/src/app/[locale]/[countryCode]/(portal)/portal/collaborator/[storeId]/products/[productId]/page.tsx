import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { portalBase, portalFetch } from "@lib/portal/api"
import { CopyButton } from "@modules/portal/copy-button"
import { money } from "@modules/portal/ui"
import { ArrowLeft, Download, ImageOff } from "lucide-react"
import { getTranslations } from "next-intl/server"

type Detail = {
  currency_code: string
  product: {
    id: string
    title: string
    description: string | null
    thumbnail: string | null
    images: string[]
    video_url: string | null
    categories: { id: string; name: string }[]
    variants: {
      id: string
      sku: string | null
      title: string | null
      suggested_price: number | null
      original_price: number | null
    }[]
  }
}

/** Everything a collaborator needs to promote and sell one product. */
export default async function CollaboratorProductDetail({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string; storeId: string; productId: string }>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const { product, currency_code } = await portalFetch<Detail>(
    `/portal-api/collaborator/stores/${p.storeId}/products/${p.productId}`
  )
  const m = (n: number | null) => money(n, currency_code, p.locale)
  const images = product.images.length ? product.images : product.thumbnail ? [product.thumbnail] : []
  const slug =
    product.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "product"

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <a href={`${base}/collaborator/${p.storeId}`}>
          <ArrowLeft />
          {t("products.backToProducts")}
        </a>
      </Button>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {product.video_url ? (
            <video
              src={product.video_url}
              controls
              preload="metadata"
              poster={images[0]}
              className="aspect-video w-full rounded-lg border bg-black"
            />
          ) : null}
          {images.length === 0 && !product.video_url ? (
            <div className="grid aspect-[4/3] place-items-center rounded-lg border bg-muted text-muted-foreground">
              <ImageOff className="size-8" />
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {images.map((url, i) => (
                <li key={url} className="space-y-2">
                  <a href={url} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden rounded-lg border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${product.title} ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" loading={i < 2 ? "eager" : "lazy"} />
                  </a>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={url} download={`${slug}-${i + 1}`}>
                      <Download />
                      {t("products.downloadImage")}
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {product.video_url ? (
            <Button asChild variant="outline" size="sm">
              <a href={product.video_url} download={`${slug}-video`}>
                <Download />
                {t("products.downloadVideo")}
              </a>
            </Button>
          ) : null}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div>
            <h1 className="text-2xl font-semibold leading-snug">{product.title}</h1>
            {product.categories.length ? (
              <p className="mt-1 text-sm text-muted-foreground">{product.categories.map((c) => c.name).join(" · ")}</p>
            ) : null}
          </div>

          {product.description ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{t("products.description")}</CardTitle>
                <CopyButton text={product.description} label={t("products.copy")} doneLabel={t("products.copied")} />
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("products.variantsAndPrices")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.variants.map((v) => {
                const potential =
                  v.suggested_price !== null && v.original_price !== null ? v.suggested_price - v.original_price : null
                return (
                  <div key={v.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{v.title ?? "-"}</p>
                        {v.sku ? <p className="text-xs text-muted-foreground">SKU: {v.sku}</p> : null}
                      </div>
                      {v.sku ? <CopyButton text={v.sku} label={t("products.copySku")} doneLabel={t("products.copied")} /> : null}
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
                      <p className="text-xs font-medium text-emerald-700">{t("products.potential", { amount: m(potential) })}</p>
                    ) : null}
                    {v.original_price !== null ? (
                      <Button asChild className="w-full">
                        <a href={`${base}/collaborator/${p.storeId}/requests/new?variant_id=${v.id}`}>{t("products.createRequest")}</a>
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
