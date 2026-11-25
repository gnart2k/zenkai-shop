import { portalFetch, portalLocale, requireActor } from "@lib/portal/api"
import ExcelJS from "exceljs"
import { getTranslations } from "next-intl/server"
import { NextResponse } from "next/server"

type Variant = {
  title: string
  sku: string | null
  suggested_price: number | null
  original_price: number | null
  original_cost: number | null
  manage_inventory: boolean
  quantity: number | null
}
type Product = {
  title: string
  handle: string
  status: string
  thumbnail: string | null
  categories: { name: string }[]
  variants: Variant[]
}

/**
 * Excel export of the signed-in portal admin's own store products (all of them, one row per
 * variant, drafts included). Includes the three prices and the private original cost; only a
 * portal admin can reach it (same session check as the products page).
 */
export async function GET() {
  await requireActor("portal_admin", "/portal")
  const locale = await portalLocale()
  const t = await getTranslations({ locale, namespace: "Portal.adminProducts" })

  const products: Product[] = []
  let currency = "vnd"
  for (let offset = 0; ; offset += 100) {
    const page = await portalFetch<{ products: Product[]; count: number; currency_code: string }>(
      `/portal-api/admin/products?limit=100&offset=${offset}`
    )
    currency = page.currency_code
    products.push(...page.products)
    if (!page.products.length || products.length >= page.count) break
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = "Zenkai Shop"
  wb.created = new Date()
  const ws = wb.addWorksheet(t("title"), { views: [{ state: "frozen", ySplit: 1 }] })
  const money = '#,##0'
  ws.columns = [
    { header: t("product"), key: "title", width: 38 },
    { header: t("variant"), key: "variant", width: 18 },
    { header: t("sku"), key: "sku", width: 30 },
    { header: "Handle", key: "handle", width: 30 },
    { header: t("status"), key: "status", width: 12 },
    { header: t("category"), key: "categories", width: 28 },
    { header: `${t("suggestedPrice")} (${currency.toUpperCase()})`, key: "suggested", width: 20, style: { numFmt: money } },
    { header: `${t("originalPrice")} (${currency.toUpperCase()})`, key: "original", width: 20, style: { numFmt: money } },
    { header: `${t("originalCost")} (${currency.toUpperCase()})`, key: "cost", width: 20, style: { numFmt: money } },
    { header: t("stock"), key: "stock", width: 10, style: { numFmt: "#,##0" } },
    { header: t("image"), key: "image", width: 50 },
  ]
  for (const p of products) {
    for (const v of p.variants.length ? p.variants : [null]) {
      ws.addRow({
        title: p.title,
        variant: v?.title ?? "",
        sku: v?.sku ?? "",
        handle: p.handle,
        status: p.status,
        categories: p.categories.map((c) => c.name).join(", "),
        suggested: v?.suggested_price ?? null,
        original: v?.original_price ?? null,
        cost: v?.original_cost ?? null,
        stock: v && v.manage_inventory ? v.quantity : null,
        image: p.thumbnail ?? "",
      })
    }
  }
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: "FFFFFFFF" } }
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } }
  head.alignment = { vertical: "middle", wrapText: true }
  head.height = 28
  ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columns.length } }

  const buffer = new Uint8Array(await wb.xlsx.writeBuffer())
  const day = new Date().toISOString().slice(0, 10)
  return new NextResponse(buffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="products-${day}.xlsx"`,
      "cache-control": "private, no-store",
    },
  })
}
