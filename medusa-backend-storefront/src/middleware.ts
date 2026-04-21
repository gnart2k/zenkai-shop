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

export async function middleware(request: NextRequest) {
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
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
