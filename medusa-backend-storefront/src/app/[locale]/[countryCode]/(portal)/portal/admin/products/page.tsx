import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteProduct } from "@lib/portal/actions"
import { portalBase, portalFetch } from "@lib/portal/api"
import { ConfirmDelete } from "@modules/portal/confirm-delete"
import { Empty, Notice, PageHeader, Pager, StatusBadge, money } from "@modules/portal/ui"
import { Download, ImageOff, Lock, Package, Pencil, Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { AdminProduct } from "@modules/portal/product-form"

type List = { currency_code: string; count: number; products: AdminProduct[] }

export default async function AdminProducts({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const sp = await searchParams
  const page = Math.max(Number(sp.page) || 1, 1)
  const limit = 15
  const c = await portalFetch<List>(`/portal-api/admin/products?limit=${limit}&offset=${(page - 1) * limit}`)
  const pages = Math.max(Math.ceil(c.count / limit), 1)
  const returnTo = `${base}/admin/products`
  const m = (n: number | null) => money(n, c.currency_code, p.locale)

  return (
    <>
      <PageHeader title={t("adminProducts.title")} description={t("adminProducts.subtitle")}>
        {c.products.length > 0 ? (
          <Button asChild variant="outline">
            {/* a plain link: the response is a file download */}
            <a href={`${base}/admin/products/export`} download>
              <Download />
              {t("adminProducts.exportExcel")}
            </a>
          </Button>
        ) : null}
        <Button asChild>
          <a href={`${base}/admin/products/new`}>
            <Plus />
            {t("adminProducts.newProduct")}
          </a>
        </Button>
      </PageHeader>
      <Notice
        error={sp.error}
        ok={sp.ok === "created" ? t("adminProducts.created") : sp.ok === "deleted" ? t("adminProducts.deleted") : undefined}
      />
      {c.products.length === 0 ? (
        <Empty icon={Package} title={t("adminProducts.empty")} hint={t("adminProducts.emptyHint")}>
          <Button asChild>
            <a href={`${base}/admin/products/new`}>
              <Plus />
              {t("adminProducts.newProduct")}
            </a>
          </Button>
        </Empty>
      ) : (
        <Card className="overflow-hidden">
          <Table className="rt">
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminProducts.product")}</TableHead>
                <TableHead>{t("adminProducts.status")}</TableHead>
                <TableHead className="text-right">{t("adminProducts.suggestedPrice")}</TableHead>
                <TableHead className="text-right">{t("adminProducts.originalPrice")}</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3" />
                    {t("adminProducts.originalCost")}
                  </span>
                </TableHead>
                <TableHead className="text-right">{t("adminProducts.stock")}</TableHead>
                <TableHead className="w-28 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.products.map((prod) => {
                const v = prod.variants[0]
                return (
                  <TableRow key={prod.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
                          {prod.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={prod.thumbnail} alt="" className="size-full object-cover" loading="lazy" />
                          ) : (
                            <ImageOff className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <a href={`${base}/admin/products/${prod.id}`} className="font-medium hover:underline">
                            {prod.title}
                          </a>
                          <div className="truncate text-xs text-muted-foreground">
                            {[
                              v?.sku,
                              prod.variants.length > 1 ? `+${prod.variants.length - 1}` : null,
                              prod.categories.map((x) => x.name).join(", ") || t("adminProducts.uncategorized"),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-label={t("adminProducts.status")}>
                      <StatusBadge status={prod.status} label={t(`status.${prod.status}` as never)} />
                    </TableCell>
                    <TableCell data-label={t("adminProducts.suggestedPrice")} className="text-right">{m(v?.suggested_price ?? null)}</TableCell>
                    <TableCell data-label={t("adminProducts.originalPrice")} className="text-right">{m(v?.original_price ?? null)}</TableCell>
                    <TableCell data-label={t("adminProducts.originalCost")} className="text-right text-muted-foreground">{m(v?.original_cost ?? null)}</TableCell>
                    <TableCell data-label={t("adminProducts.stock")} className="text-right">
                      {v?.quantity === null || v?.quantity === undefined ? (
                        <span className="text-xs text-muted-foreground">{t("adminProducts.notTracked")}</span>
                      ) : (
                        v.quantity
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="icon" aria-label={t("adminProducts.edit")}>
                          <a href={`${base}/admin/products/${prod.id}`}>
                            <Pencil />
                          </a>
                        </Button>
                        <ConfirmDelete
                          iconOnly
                          action={deleteProduct}
                          fields={{ id: prod.id, base, returnTo }}
                          title={t("adminProducts.deleteTitle")}
                          text={t("adminProducts.deleteText", { title: prod.title })}
                          triggerLabel={t("adminProducts.delete")}
                          confirmLabel={t("adminProducts.delete")}
                          cancelLabel={t("common.cancel")}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
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
