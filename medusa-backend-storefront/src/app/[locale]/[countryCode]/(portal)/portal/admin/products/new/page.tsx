import { portalBase, portalFetch } from "@lib/portal/api"
import { ProductForm } from "@modules/portal/product-form"
import { Notice, PageHeader } from "@modules/portal/ui"
import { getTranslations } from "next-intl/server"

export default async function NewProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const sp = await searchParams
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.productForm" })
  const [{ categories }, list] = await Promise.all([
    portalFetch<{ categories: { id: string; name: string }[] }>("/portal/admin/categories"),
    portalFetch<{ currency_code: string }>("/portal/admin/products?limit=1"),
  ])
  return (
    <>
      <PageHeader title={t("titleNew")} />
      <Notice error={sp.error} />
      <ProductForm
        categories={categories}
        currency={list.currency_code}
        locale={p.locale}
        base={base}
        returnTo={`${base}/admin/products/new`}
      />
    </>
  )
}
