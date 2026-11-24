import { NextRequest, NextResponse } from "next/server"

/**
 * Cookies can only be cleared from a route handler or server action, not while a page
 * renders. Pages redirect here when the portal session is missing, expired or rejected;
 * the stale cookies are removed and the user lands on the login page with a notice.
 * The middleware adds the locale and country to /portal/login.
 */
export async function GET(request: NextRequest) {
  // Where to land: this user's own /{locale}/{country}/portal/login (same-site paths only).
  const to = request.nextUrl.searchParams.get("to") ?? ""
  const target = /^\/(en|vi)\/[a-z]{2}\/portal\/login(\?expired=1)?$/.test(to) ? to : "/portal/login?expired=1"
  const res = NextResponse.redirect(new URL(target, request.url))
  res.cookies.set("_portal_jwt", "", { maxAge: 0, path: "/" })
  res.cookies.set("_portal_actor", "", { maxAge: 0, path: "/" })
  return res
}
