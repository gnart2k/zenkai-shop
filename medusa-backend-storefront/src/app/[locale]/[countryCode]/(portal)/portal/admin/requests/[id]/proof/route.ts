import { BACKEND_URL, JWT_COOKIE } from "@lib/portal/api"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

/** Proxies the proof file with the admin's JWT so the browser can open it directly. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; locale: string; countryCode: string }> }
) {
  const { id, locale, countryCode } = await params
  const token = (await cookies()).get(JWT_COOKIE)?.value
  if (!token) {
    return NextResponse.redirect(
      new URL(`/${locale}/${countryCode}/portal/login`, _req.url)
    )
  }
  const upstream = await fetch(`${BACKEND_URL}/portal/admin/requests/${id}/proof`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Proof not available", { status: upstream.status === 404 ? 404 : 502 })
  }
  return new NextResponse(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "private, no-store",
    },
  })
}
