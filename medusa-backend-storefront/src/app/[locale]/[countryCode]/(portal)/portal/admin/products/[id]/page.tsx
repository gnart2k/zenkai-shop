import { portalBase, portalFetch } from "@lib/portal/api"
import { ProductForm, type AdminProduct } from "@modules/portal/product-form"
import { Notice, PageHeader, StatusBadge } from "@modules/portal/ui"
import { getTranslations } from "next-intl/server"

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string; id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const sp = await searchParams
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const [detail, { categories }] = await Promise.all([
    portalFetch<{ product: AdminProduct; currency_code: string }>(`/portal/admin/products/${p.id}`),
    portalFetch<{ categories: { id: string; name: string }[] }>("/portal/admin/categories"),
  ])
  return (
    <>
      <PageHeader title={t("productForm.titleEdit")}>
        <StatusBadge status={detail.product.status} label={t(`status.${detail.product.status}` as never)} />
      </PageHeader>
      <Notice error={sp.error} ok={sp.ok === "saved" ? t("common.saved") : undefined} />
      <ProductForm
        product={detail.product}
        categories={categories}
        currency={detail.currency_code}
        locale={p.locale}
        base={base}
        returnTo={`${base}/admin/products/${p.id}`}
      />
    </>
  )
}
