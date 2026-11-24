import { NextRequest, NextResponse } from "next/server"

/** Leaves preview mode (clears the draft cookie) and returns to a same-site path. */
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to") ?? "/"
  // Only same-site paths, never an absolute or protocol-relative URL.
  const safe = /^\/(?!\/)/.test(to) ? to : "/"
  const res = NextResponse.redirect(new URL(safe, request.url))
  res.cookies.set("_sf_preview", "", { maxAge: 0, path: "/" })
  return res
}
