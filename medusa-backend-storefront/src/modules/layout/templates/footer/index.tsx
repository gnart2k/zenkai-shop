import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { getStorefront } from "@lib/data/storefront-config"
import { pickText } from "@lib/storefront/templates"
import { getLocale, getTranslations } from "next-intl/server"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SmartLink from "@modules/storefront/smart-link"

const linkCls = "text-sm text-muted-foreground transition-colors hover:text-foreground"

export default async function Footer({ countryCode }: { countryCode: string }) {
  const t = await getTranslations("Footer")
  const tNav = await getTranslations("Nav")
  const tl = await getTranslations("ShopLayout")
  const locale = await getLocale()
  const { layout, footer, branding } = await getStorefront()

  const { collections } = footer.show_collections ? await listCollections({ fields: "*products" }) : { collections: [] }
  const productCategories = footer.show_categories ? await listCategories() : []
  const rootCategories = productCategories?.filter((c) => !c.parent_category_id) ?? []

  const tagline = pickText(footer.tagline, locale)
  const copyright = tl("copyright", { year: new Date().getFullYear(), name: tNav("storeName") })

  const brandMark = branding.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={branding.logo} alt="" style={{ height: 28 }} className="mb-3 w-auto object-contain" />
  ) : null

  const contact = footer.contact.map((c) => (
    <li key={c.href + c.label}>
      <SmartLink href={c.href} countryCode={countryCode} className={linkCls}>
        {c.label}
      </SmartLink>
    </li>
  ))

  if (layout.footer === "minimal") {
    return (
      <footer className="border-t bg-background" data-footer="minimal">
        <div className="content-container flex flex-col items-center gap-5 py-10 text-center">
          {brandMark}
          <LocalizedClientLink href="/" className="font-serif text-base tracking-widest text-foreground">
            {tNav("storeName")}
          </LocalizedClientLink>
          {tagline ? <p className="max-w-md text-sm text-muted-foreground">{tagline}</p> : null}
          {rootCategories.length ? (
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {rootCategories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <LocalizedClientLink href={`/categories/${c.handle}`} className={linkCls}>
                    {c.name}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          ) : null}
          {contact.length ? <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">{contact}</ul> : null}
          <p className="text-xs text-muted-foreground">{copyright}</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-border/40 bg-background" data-footer="columns">
      <div className="content-container py-16 small:py-20">
        <div className="grid gap-10 small:grid-cols-4">
          <div>
            {brandMark}
            <LocalizedClientLink href="/" className="font-serif text-sm font-light tracking-widest text-foreground">
              {tNav("storeName")}
            </LocalizedClientLink>
            {tagline ? <p className="mt-3 max-w-xs text-sm text-muted-foreground">{tagline}</p> : null}
            <p className="mt-3 text-xs text-muted-foreground">{copyright}</p>
          </div>

          {rootCategories.length > 0 && (
            <div>
              <h4 className="mb-4 text-xs font-medium text-muted-foreground">{t("categories")}</h4>
              <ul className="space-y-2">
                {rootCategories.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <LocalizedClientLink href={`/categories/${c.handle}`} className={linkCls}>
                      {c.name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {collections && collections.length > 0 && (
            <div>
              <h4 className="mb-4 text-xs font-medium text-muted-foreground">{t("collections")}</h4>
              <ul className="space-y-2">
                {collections.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <LocalizedClientLink href={`/collections/${c.handle}`} className={linkCls}>
                      {c.title}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contact.length > 0 && (
            <div>
              <h4 className="mb-4 text-xs font-medium text-muted-foreground">{t("contact")}</h4>
              <ul className="space-y-2">{contact}</ul>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
