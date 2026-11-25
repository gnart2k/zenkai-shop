import { publicUrl } from "@lib/util/public-url"
import { NextRequest, NextResponse } from "next/server"

/**
 * Cookies can only be cleared from a route handler or server action, not while a page
 * renders. Pages redirect here when the portal session is missing, expired or rejected;
 * the stale cookies are removed and the user lands on the login page with a notice.
 */
export async function GET(request: NextRequest) {
  // Where to land: the portal login page (same-site paths only).
  const to = request.nextUrl.searchParams.get("to") ?? ""
  const target = /^\/portal\/login(\?expired=1)?$/.test(to) ? to : "/portal/login?expired=1"
  const res = NextResponse.redirect(publicUrl(request, target))
  res.cookies.set("_portal_jwt", "", { maxAge: 0, path: "/" })
  res.cookies.set("_portal_actor", "", { maxAge: 0, path: "/" })
  return res
}
