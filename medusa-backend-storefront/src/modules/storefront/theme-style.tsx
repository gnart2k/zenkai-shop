import { getStorefront } from "@lib/data/storefront-config"
import { cssText } from "@lib/storefront/templates"

/**
 * Puts the chosen template's design tokens on :root for storefront pages. It is rendered
 * by the storefront layouts only, so the portal (a different layout) keeps its own look.
 */
export default async function ThemeStyle() {
  const { cssVars } = await getStorefront()
  // eslint-disable-next-line react/no-danger
  return <style data-storefront-theme dangerouslySetInnerHTML={{ __html: cssText(cssVars) }} />
}
