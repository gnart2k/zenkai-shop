/** Raw translation catalogs (base file + feature parts), before any owner overrides. */
const PARTS = ["account", "checkout", "misc", "portal"] as const

export async function loadRawMessages(locale: string): Promise<Record<string, any>> {
  const base = (await import(`../../messages/${locale}.json`)).default
  const parts = await Promise.all(
    PARTS.map(async (p) => (await import(`../../messages/parts/${p}.${locale}.json`)).default)
  )
  return Object.assign({}, base, ...parts)
}
