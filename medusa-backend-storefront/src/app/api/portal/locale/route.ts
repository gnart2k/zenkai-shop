import { NextRequest, NextResponse } from "next/server"

/** Switches the portal UI language (a cookie, since the portal URL has no locale) and goes back. */
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to")
  const next = request.nextUrl.searchParams.get("next") ?? "/portal"
  // Only same-site portal paths.
  const safe = /^\/portal(\/[^?#]*)?(\?[^#]*)?$/.test(next) ? next : "/portal"
  const res = NextResponse.redirect(new URL(safe, request.url))
  if (to === "vi" || to === "en") {
    res.cookies.set("portal_locale", to, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
  }
  return res
}
