import { JWT_COOKIE, PortalError, portalFetch, tokenValid } from "@lib/portal/api"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

/**
 * Autosave for the storefront editor: stores the current editor state as the draft (JSON in,
 * `{ updated_at }` out). The browser cannot call the backend itself because the portal JWT is
 * an httpOnly cookie, so this forwards it. The backend sanitizes the config.
 */
export async function POST(request: NextRequest) {
  if (!tokenValid((await cookies()).get(JWT_COOKIE)?.value)) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  try {
    const { updated_at } = await portalFetch<{ updated_at: string }>("/portal/admin/storefront/draft", {
      method: "PUT",
      body,
    })
    return NextResponse.json({ updated_at })
  } catch (e) {
    if (e instanceof PortalError) {
      return NextResponse.json({ error: e.message }, { status: e.status === 401 ? 401 : 400 })
    }
    throw e
  }
}
