import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createRequest } from "@lib/portal/actions"
import { portalBase, portalFetch } from "@lib/portal/api"
import { RequestPricing } from "@modules/portal/request-pricing"
import { SubmitButton } from "@modules/portal/submit-button"
import { Field, Hidden, Notice, PageHeader, money } from "@modules/portal/ui"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getTranslations } from "next-intl/server"

type Catalog = {
  currency_code: string
  products: {
    title: string
    variants: {
      id: string
      sku: string | null
      title: string | null
      suggested_price: number | null
      original_price: number | null
    }[]
  }[]
}

export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string; storeId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const sp = await searchParams
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.newRequest" })
  const catalog = await portalFetch<Catalog>(
    `/portal-api/collaborator/stores/${p.storeId}/products?limit=100`
  )
  const variants = catalog.products.flatMap((prod) =>
    prod.variants
      .filter((v) => v.original_price !== null)
      .map((v) => ({
        ...v,
        label: `${prod.title}${v.title ? ` / ${v.title}` : ""}${v.sku ? ` (${v.sku})` : ""}`,
      }))
  )
  const selected = variants.find((v) => v.id === sp.variant_id) ?? variants[0]
  const returnTo = `${base}/collaborator/${p.storeId}/requests/new?variant_id=${selected?.id ?? ""}`

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("title")} />
      <Notice error={sp.error} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{selected?.label}</CardTitle>
          {selected ? (
            <CardDescription>
              {t("originalPrice")}: {money(selected.original_price, catalog.currency_code, p.locale)} ·{" "}
              {t("suggestedPrice")}: {money(selected.suggested_price, catalog.currency_code, p.locale)}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <form action={createRequest} className="space-y-5" encType="multipart/form-data">
            <Hidden name="base" value={base} />
            <Hidden name="storeId" value={p.storeId} />
            <Hidden name="returnTo" value={returnTo} />
            <div className="space-y-1.5">
              <Label htmlFor="variant_id">{t("product")}</Label>
              <select
                id="variant_id"
                name="variant_id"
                defaultValue={selected?.id}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {t("option", {
                      label: v.label,
                      price: money(v.original_price, catalog.currency_code, p.locale),
                    })}
                  </option>
                ))}
              </select>
            </div>
            {selected ? (
              <RequestPricing
                key={selected.id}
                currency={catalog.currency_code}
                locale={p.locale}
                originalPrice={selected.original_price ?? 0}
                initialPrice={selected.suggested_price ?? selected.original_price ?? 0}
                labels={{
                  quantity: t("quantity"),
                  sellingPrice: t("sellingPrice", { currency: catalog.currency_code.toUpperCase() }),
                  sellingPriceHint: t("sellingPriceHint"),
                  profit: t("previewProfit", { amount: "{amount}" }),
                  total: t("previewTotal", { amount: "{amount}" }),
                  tooLow: t("previewTooLow"),
                }}
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("customerName")} name="customer_name" required />
              <Field label={t("customerEmail")} name="customer_email" type="email" required />
            </div>
            <Field label={t("customerPhone")} name="customer_phone" type="tel" />
            <div className="space-y-1.5">
              <Label htmlFor="customer_address">{t("customerAddress")}</Label>
              <Textarea id="customer_address" name="customer_address" required minLength={5} maxLength={300} rows={3} placeholder={t("customerAddressPlaceholder")} />
              <p className="text-xs text-muted-foreground">{t("customerAddressHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proof">{t("proof")}</Label>
              <input
                id="proof"
                name="proof"
                type="file"
                required
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="block w-full cursor-pointer rounded-md border border-input bg-background text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              <p className="text-xs text-muted-foreground">{t("proofHint")}</p>
            </div>
            <SubmitButton>{t("send")}</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
