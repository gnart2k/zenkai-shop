import { BACKEND_URL, PortalError, portalFetch, portalLocale, requireActor } from "@lib/portal/api"
import JSZip from "jszip"
import { getTranslations } from "next-intl/server"
import { NextResponse } from "next/server"

type Detail = {
  currency_code: string
  product: {
    title: string
    description: string | null
    images: string[]
    video_url: string | null
    categories: { name: string }[]
    variants: { sku: string | null; title: string | null; suggested_price: number | null; original_price: number | null }[]
  }
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
}

const ascii = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "product"

/** Fetches one of our own /media/<id> files (the only kind stored by the portal). */
async function ownMedia(url: string): Promise<{ data: ArrayBuffer; type: string } | null> {
  if (!/^\/media\/[A-Za-z0-9._-]+$/.test(url)) return null
  const res = await fetch(`${BACKEND_URL}${url}`, { cache: "no-store" })
  if (!res.ok) return null
  return { data: await res.arrayBuffer(), type: (res.headers.get("content-type") ?? "").split(";")[0] }
}

/**
 * One ZIP with every image, the video and a text file with the product information, for the
 * collaborator to take to their own channels. Same access rules as the product page: the store
 * membership and the published product are enforced by the backend call below.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ storeId: string; productId: string }> }) {
  await requireActor("collaborator", "/portal")
  const { storeId, productId } = await params
  const locale = await portalLocale()
  const t = await getTranslations({ locale, namespace: "Portal.products" })

  let detail: Detail
  try {
    detail = await portalFetch<Detail>(`/portal-api/collaborator/stores/${storeId}/products/${productId}`)
  } catch (e) {
    if (e instanceof PortalError && (e.status === 403 || e.status === 404)) {
      return new NextResponse("Not found", { status: 404 })
    }
    throw e
  }
  const { product, currency_code } = detail
  const slug = ascii(product.title)
  const zip = new JSZip()
  const links: string[] = []

  const images = product.images
  for (let i = 0; i < images.length; i++) {
    const file = await ownMedia(images[i])
    if (file) zip.file(`images/${slug}-${String(i + 1).padStart(2, "0")}.${EXT[file.type] ?? "jpg"}`, file.data)
    else links.push(images[i])
  }
  if (product.video_url) {
    const file = await ownMedia(product.video_url)
    if (file) zip.file(`video/${slug}.${EXT[file.type] ?? "mp4"}`, file.data)
    else links.push(product.video_url)
  }

  const money = (n: number | null) =>
    n === null ? "-" : `${new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(n)} ${currency_code.toUpperCase()}`
  const info = [
    product.title,
    "=".repeat(Math.min(product.title.length, 60)),
    product.categories.length ? `${t("categories")}: ${product.categories.map((c) => c.name).join(", ")}` : "",
    "",
    product.description ?? "",
    "",
    ...product.variants.flatMap((v) => [
      `${v.title ?? "-"}${v.sku ? `  (SKU: ${v.sku})` : ""}`,
      `  ${t("originalPrice")}: ${money(v.original_price)}`,
      `  ${t("suggestedPrice")}: ${money(v.suggested_price)}`,
    ]),
    ...(links.length ? ["", t("externalLinks"), ...links] : []),
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
  zip.file("info.txt", info)

  const buffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${slug}.zip"`,
      "cache-control": "private, no-store",
    },
  })
}
