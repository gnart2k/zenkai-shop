const PREFIX = "[medusa-storefront]"

/**
 * Server-side trace logs for products/cache/revalidate.
 *
 * - On by default in development (same idea as Medusa JS SDK `debug: NODE_ENV === "development"`).
 * - In production, only when MEDUSA_STOREFRONT_DEBUG=true.
 * - Set MEDUSA_STOREFRONT_DEBUG=false to silence in development.
 */
export function isStorefrontDebugEnabled(): boolean {
  if (process.env.MEDUSA_STOREFRONT_DEBUG === "false") {
    return false
  }
  if (process.env.MEDUSA_STOREFRONT_DEBUG === "true") {
    return true
  }
  return process.env.NODE_ENV === "development"
}

export function storefrontDebugLog(
  scope: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!isStorefrontDebugEnabled()) {
    return
  }
  const payload = data !== undefined ? ` ${JSON.stringify(data)}` : ""
  console.info(`${PREFIX} [${scope}] ${message}${payload}`)
}
