import { getLocaleHeader } from "@lib/util/get-locale-header"
import { isStorefrontDebugEnabled } from "@lib/util/storefront-debug"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:4300"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
  }

  if (isStorefrontDebugEnabled()) {
    const path = typeof input === "string" ? input : String(input)
    const cache = init?.cache
    const nextTags =
      init && typeof init === "object" && "next" in init && init.next
        ? (init.next as { tags?: string[] }).tags
        : undefined
    console.info(
      `[medusa-storefront] [sdk.fetch] ${path} cache=${String(cache)} tags=${JSON.stringify(nextTags ?? [])}`
    )
  }

  return originalFetch(input, init)
}
