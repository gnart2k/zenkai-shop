import { getStorefront } from "@lib/data/storefront-config"
import { pickText } from "@lib/storefront/templates"
import { getLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"

/** Thin bar above the header with a message the owner controls (shipping, promo, notice). */
export default async function AnnouncementBar({ countryCode }: { countryCode: string }) {
  const { header } = await getStorefront()
  const locale = await getLocale()
  const a = header.announcement
  const text = pickText(a.text, locale)
  if (!a.enabled || !text) return null

  const cls =
    "block bg-primary px-4 py-2 text-center text-xs font-medium tracking-wide text-primary-foreground"
  if (a.link) {
    return /^\/(?!\/)/.test(a.link) ? (
      <Link href={`/${countryCode}${a.link}`} className={cls} data-testid="announcement-bar">
        {text}
      </Link>
    ) : (
      <a href={a.link} className={cls} data-testid="announcement-bar">
        {text}
      </a>
    )
  }
  return (
    <div className={cls} data-testid="announcement-bar">
      {text}
    </div>
  )
}
