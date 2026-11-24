import { HttpTypes } from "@medusajs/types"
import createIntlMiddleware from "next-intl/middleware"
import { NextRequest, NextResponse } from "next/server"

import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

const LOCALES = new Set(routing.locales)

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

function isLocaleSegment(segment: string | undefined) {
  return !!segment && LOCALES.has(segment as "en" | "vi")
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a MEDUSA_BACKEND_URL environment variable? Note that the variable is no longer named NEXT_PUBLIC_MEDUSA_BACKEND_URL."
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    console.log(`${BACKEND_URL}/store/regions`)
    const { regions } = await fetch(`${BACKEND_URL}/store/regions`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    }).then(async (response) => {
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.message)
      }

      return json
    })

    if (!regions?.length) {
      throw new Error(
        "No regions found. Please set up regions in your Medusa Admin."
      )
    }

    regionMapCache.regionMap.clear()
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = request.headers
      .get("x-vercel-ip-country")
      ?.toLowerCase()

    const pathname = request.nextUrl.pathname
    const segments = pathname.split("/").filter(Boolean)
    const first = segments[0]?.toLowerCase()
    const second = segments[1]?.toLowerCase()
    let localeFromPath = first && isLocaleSegment(first) ? first : undefined
    // `/` has no locale segment but redirects to `/{defaultLocale}/{country}/` — use default locale for region rules (e.g. vi → vn).
    if (pathname === "/" || pathname === "") {
      localeFromPath = routing.defaultLocale
    }

    let urlCountryCode: string | undefined
    if (first && isLocaleSegment(first) && second) {
      urlCountryCode = second
    } else if (first && !isLocaleSegment(first)) {
      urlCountryCode = first
    }

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (localeFromPath === "vi" && regionMap.has("vn")) {
      countryCode = "vn"
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Middleware.ts: Error getting the country code. Did you set up regions in your Medusa Admin and define a MEDUSA_BACKEND_URL environment variable? Note that the variable is no longer named NEXT_PUBLIC_MEDUSA_BACKEND_URL."
      )
    }
  }
}

async function baseMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next()
  }

  if (pathname.includes(".") && !pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  let cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)
  const countryCode =
    regionMap && (await getCountryCode(request, regionMap))

  const segments = pathname.split("/").filter(Boolean)
  const first = segments[0]?.toLowerCase()
  const second = segments[1]?.toLowerCase()

  const pathCountry =
    first && isLocaleSegment(first) ? second : first

  const urlHasCountryCode =
    !!countryCode && !!pathCountry && pathCountry === countryCode

  /** `/` → `/{defaultLocale}/{country}/` */
  if (pathname === "/" && countryCode) {
    const url = new URL(
      `/${routing.defaultLocale}/${countryCode}/`,
      request.url
    )
    url.search = request.nextUrl.search
    return NextResponse.redirect(url)
  }

  /**
   * Legacy URLs `/us/store` (country first) → `/vi/us/store`
   */
  if (
    first &&
    !isLocaleSegment(first) &&
    regionMap.has(first) &&
    countryCode
  ) {
    const rest = segments.slice(1).join("/")
    const url = new URL(
      `/${routing.defaultLocale}/${first}${rest ? `/${rest}` : ""}`,
      request.url
    )
    url.search = request.nextUrl.search
    return NextResponse.redirect(url)
  }

  /**
   * Missing locale/country prefix (e.g. `/products/handle`) →
   * `/{defaultLocale}/{country}/products/handle`
   */
  if (
    first &&
    !isLocaleSegment(first) &&
    !regionMap.has(first) &&
    countryCode
  ) {
    const url = new URL(
      `/${routing.defaultLocale}/${countryCode}${pathname.startsWith("/") ? pathname : `/${pathname}`}`,
      request.url
    )
    url.search = request.nextUrl.search
    return NextResponse.redirect(url)
  }

  /**
   * `/vi` or `/en` only → add country segment
   */
  if (
    first &&
    isLocaleSegment(first) &&
    !second &&
    pathname !== "/" &&
    countryCode
  ) {
    const url = new URL(`/${first}/${countryCode}/`, request.url)
    url.search = request.nextUrl.search
    return NextResponse.redirect(url)
  }

  /**
   * Path still contains a removed / invalid country (e.g. bookmarks to `/en/dk/...`
   * after DK was removed from regions). `getCountryCode()` already resolves a fallback,
   * but `[countryCode]` page params come from the URL segment — redirect so RSC gets
   * the live country code and product pricing uses the correct region.
   */
  if (
    first &&
    isLocaleSegment(first) &&
    second &&
    countryCode &&
    !regionMap.has(second)
  ) {
    const looksLikeCountryCode = /^[a-z]{2}$/.test(second)
    const restSegments = looksLikeCountryCode ? segments.slice(2) : segments.slice(1)
    const tail = restSegments.length ? `/${restSegments.join("/")}` : ""
    const url = new URL(`/${first}/${countryCode}${tail}`, request.url)
    url.search = request.nextUrl.search
    return NextResponse.redirect(url)
  }

  if (!countryCode) {
    return new NextResponse(
      "No valid regions configured. Please set up regions with countries in your Medusa Admin.",
      { status: 500 }
    )
  }

  const response = intlMiddleware(request)

  if (urlHasCountryCode && !cacheIdCookie) {
    response.cookies.set("_medusa_cache_id", cacheId, {
      maxAge: 60 * 60 * 24,
    })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|media/|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}

/** Seconds left on a JWT (edge-safe decode), or null if it is not a readable JWT. */
function secondsLeft(token: string): number | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const { exp } = JSON.parse(atob(payload))
    return typeof exp === "number" ? exp - Math.floor(Date.now() / 1000) : null
  } catch {
    return null
  }
}

const REFRESH_WHEN_LEFT = 3 * 24 * 3600
const PORTAL_COOKIE_MAX_AGE = 7 * 24 * 3600

/**
 * Sliding portal session: when a signed-in portal user opens a portal page with less than 3
 * days left on their token, ask the backend for a fresh one (POST /auth/token/refresh) and
 * replace the cookie. Active users never get logged out; idle ones expire after 7 days.
 * Failures are ignored: the old token keeps working until it really expires.
 */
async function refreshedPortalToken(request: NextRequest): Promise<string | null> {
  if (!/^\/(en|vi)\/[a-z]{2}\/portal(\/|$)/.test(request.nextUrl.pathname)) return null
  if (request.method !== "GET") return null
  const token = request.cookies.get("_portal_jwt")?.value
  if (!token) return null
  const left = secondsLeft(token)
  if (left === null || left <= 0 || left > REFRESH_WHEN_LEFT) return null
  try {
    const res = await fetch(`${BACKEND_URL}/auth/token/refresh`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const { token: fresh } = await res.json()
    return typeof fresh === "string" ? fresh : null
  } catch {
    return null
  }
}

/**
 * Draft preview lives under its own URL prefix, /preview/{locale}/{country}/..., and its token
 * cookie is scoped to Path=/preview. The live storefront routes therefore never receive the
 * cookie and can never show a draft to a real customer. The request is rewritten internally to
 * the normal page with an `x-sf-preview` header; the browser address stays on /preview/....
 */
function previewMiddleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl
  const inner = pathname.replace(/^\/preview/, "") || "/"
  const [, loc, country] = inner.split("/")
  if (!isLocaleSegment(loc) || !/^[a-z]{2}$/.test(country ?? "")) {
    return NextResponse.redirect(new URL(`/preview/${routing.defaultLocale}/${DEFAULT_REGION}`, request.url))
  }

  // Signed token from the portal (button or editor frame) -> cookie for /preview only.
  const token = searchParams.get("_preview")
  if (token && token.length < 2000) {
    const clean = request.nextUrl.clone()
    clean.searchParams.delete("_preview")
    const res = NextResponse.redirect(clean)
    res.cookies.set("_sf_preview", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
      path: "/preview",
    })
    return res
  }

  const headers = new Headers(request.headers)
  headers.set("x-sf-preview", "1")
  headers.set("x-next-intl-locale", loc)
  const url = request.nextUrl.clone()
  url.pathname = inner
  const res = NextResponse.rewrite(url, { request: { headers } })
  res.headers.set("x-robots-tag", "noindex, nofollow")
  res.headers.set("cache-control", "no-store")
  return res
}

const PORTAL_LOCALE_COOKIE = "portal_locale"
const PORTAL_REGION = process.env.PORTAL_STOREFRONT_REGION || "vn"

/**
 * The portal has ONE fixed URL space, /portal/..., independent of storefront, region and
 * language (a collaborator can work for several stores; there will be several storefronts).
 * It is served from the internal pages under /[locale]/[countryCode]/(portal)/portal, with the
 * language taken from a cookie. The old /{locale}/{country}/portal/... URLs redirect here.
 */
// Host of the portal (the same host as the Medusa admin), e.g. admin.example.com. When set, the
// portal is served ONLY there and store domains (any number, added dynamically later) never
// serve /portal. Unset in development: every host serves both.
const PORTAL_HOST = (process.env.PORTAL_HOST || "").toLowerCase()

function portalMiddleware(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl
  if (PORTAL_HOST) {
    const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase()
    const onPortalHost = host === PORTAL_HOST
    const isPortalPath = pathname === "/portal" || pathname.startsWith("/portal/")
    if (isPortalPath && !onPortalHost) return new NextResponse("Not found", { status: 404 })
    if (onPortalHost && !isPortalPath && !/^\/(preview|api|_next)(\/|$)/.test(pathname)) {
      return NextResponse.redirect(new URL("/portal/login", request.url))
    }
  }
  const old = /^\/(en|vi)\/[a-z]{2}(\/portal(?:\/.*)?)$/.exec(pathname)
  if (old) {
    const res = NextResponse.redirect(new URL(`${old[2]}${search}`, request.url), 308)
    res.cookies.set(PORTAL_LOCALE_COOKIE, old[1], { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
    return res
  }
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    const c = request.cookies.get(PORTAL_LOCALE_COOKIE)?.value
    const locale = c === "en" ? "en" : routing.defaultLocale
    const headers = new Headers(request.headers)
    headers.set("x-next-intl-locale", locale)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/${PORTAL_REGION}${pathname}`
    const res = NextResponse.rewrite(url, { request: { headers } })
    res.headers.set("x-robots-tag", "noindex, nofollow")
    return res
  }
  return null
}

// Hosts that serve the default store without a lookup (development, or the primary domain).
// Every other host must be a store's own address (<slug>.<base domain>) or a verified custom
// domain; anything else gets a 404 instead of some other store's pages.
const DEFAULT_HOSTS = new Set(
  (process.env.DEFAULT_STOREFRONT_HOSTS || "localhost,127.0.0.1")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
)
const tenantCache = new Map<string, { ok: boolean; at: number }>()

async function hostIsKnownStore(host: string): Promise<boolean> {
  const hit = tenantCache.get(host)
  if (hit && Date.now() - hit.at < 30_000) return hit.ok
  let ok = false
  try {
    const res = await fetch(`${BACKEND_URL}/portal-api/tenant?host=${encodeURIComponent(host)}`, {
      cache: "no-store",
    })
    ok = res.ok
  } catch {
    // Backend unreachable: fail open for hosts we already knew, closed otherwise.
    ok = hit?.ok ?? false
  }
  tenantCache.set(host, { ok, at: Date.now() })
  return ok
}

export async function middleware(request: NextRequest) {
  const portal = portalMiddleware(request)
  if (portal) return portal

  const { pathname } = request.nextUrl
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .toLowerCase()
    .replace(/:\d+$/, "")
  if (
    host &&
    host !== PORTAL_HOST.replace(/:\d+$/, "") &&
    !DEFAULT_HOSTS.has(host) &&
    !/^\/(preview|api|_next)(\/|$)/.test(pathname) &&
    !(await hostIsKnownStore(host))
  ) {
    return new NextResponse("Store not found", { status: 404 })
  }

  if (request.nextUrl.pathname === "/preview" || request.nextUrl.pathname.startsWith("/preview/")) {
    return previewMiddleware(request)
  }
  const fresh = await refreshedPortalToken(request)
  const response = await baseMiddleware(request)
  if (fresh) {
    for (const name of ["_portal_jwt", "_portal_actor"]) {
      const value = name === "_portal_jwt" ? fresh : request.cookies.get(name)?.value
      if (value) {
        response.cookies.set(name, value, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: PORTAL_COOKIE_MAX_AGE,
          path: "/",
        })
      }
    }
  }
  return response
}
