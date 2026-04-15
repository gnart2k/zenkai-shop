import { storefrontDebugLog } from "@lib/util/storefront-debug"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * Purges Next.js Data Cache entries tagged from sdk.client.fetch / getCacheOptions.
 * Wire a Medusa subscriber (e.g. product.updated) to:
 * fetch(`${process.env.STOREFRONT_URL}/api/revalidate?tags=products`)
 * Set REVALIDATE_SECRET and pass secret=... when exposing this URL.
 * @see https://docs.medusajs.com/resources/nextjs-starter/guides/revalidate-cache
 */
export async function GET(request: NextRequest) {
  const tagsParam = request.nextUrl.searchParams.get("tags")
  const secret = request.nextUrl.searchParams.get("secret")
  const expected = process.env.REVALIDATE_SECRET

  if (expected && secret !== expected) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  if (!tagsParam?.trim()) {
    return NextResponse.json({ error: "No tags provided" }, { status: 400 })
  }

  const tags = tagsParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  for (const tag of tags) {
    revalidateTag(tag)
  }

  storefrontDebugLog("api.revalidate", "revalidated tags", {
    tags,
    hadSecret: Boolean(secret),
  })

  return NextResponse.json({ revalidated: true, tags })
}
