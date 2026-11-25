import { publicUrl } from "@lib/util/public-url"
import { PortalError, portalFetch } from "@lib/portal/api"
import { buildStorefrontConfig } from "@lib/portal/storefront-save"
import { NextRequest, NextResponse } from "next/server"

/**
 * Preview button target. The editor posts its form here with formTarget="_blank", so the
 * draft is saved and the real storefront opens in a NEW tab, while the editor tab keeps its
 * unsaved state. A session problem redirects (portalFetch); other errors show a small page.
 */
export async function POST(request: NextRequest) {
  const f = await request.formData()
  // The storefront being previewed (/{locale}/{country}), sent by the editor. The portal URL
  // itself no longer says which storefront it is about.
  const rawSite = String(f.get("site") ?? "")
  const site = /^\/(en|vi)\/[a-z]{2}$/.test(rawSite) ? rawSite : "/"

  // Open the page the owner was looking at in the editor, not always the home page.
  const rawPath = String(f.get("previewPath") ?? "")
  const path = /^\/(store|products\/[\w-]+)$/.test(rawPath) ? rawPath : ""

  try {
    const cfg = await buildStorefrontConfig(f)
    await portalFetch("/portal-api/admin/storefront/draft", { method: "PUT", body: cfg })
    const { token } = await portalFetch<{ token: string }>("/portal-api/admin/storefront/preview", { body: {} })
    return NextResponse.redirect(publicUrl(request, `/preview${site}${path}?_preview=${encodeURIComponent(token)}`), 303)
  } catch (e) {
    if (e instanceof PortalError) {
      const msg = e.message.replace(/[<>&]/g, "")
      return new NextResponse(
        `<!doctype html><meta charset="utf-8"><title>Preview</title><body style="font-family:system-ui;padding:2rem"><p>${msg}</p><p><a href="javascript:window.close()">Close</a></p>`,
        { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
      )
    }
    throw e
  }
}

/** The editor posts here. A GET (e.g. a form without an explicit method) is refused. */
export async function GET() {
  return new NextResponse("Use POST from the storefront editor.", { status: 405, headers: { Allow: "POST" } })
}
