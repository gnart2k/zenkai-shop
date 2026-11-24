"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

import { HttpTypes, StoreRegion } from "@medusajs/types"
import type { HeaderVariant } from "@lib/storefront/templates"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartDropdown from "@modules/layout/components/cart-dropdown"
import SideMenu, { SideMenuCategory } from "@modules/layout/components/side-menu"

type NavClientProps = {
  regions: StoreRegion[] | null
  storeName: string
  cart?: HttpTypes.StoreCart | null
  categories?: SideMenuCategory[]
  /**
   * Theme header layout:
   *  overlay  - transparent over the hero, menu button / logo / icons in one row
   *  bar      - solid bar: logo left, category links in the middle, icons right
   *  centered - big centered logo, category links in a second row underneath
   */
  variant?: HeaderVariant
  /** Owner's logo (from the portal). When set it replaces the plain text name. */
  logoUrl?: string
  logoHeight?: number
  showName?: boolean
}

function AccountIcon({ className, label }: { className: string; label: string }) {
  return (
    <LocalizedClientLink
      href="/account"
      className={`hidden transition-colors duration-300 small:inline ${className}`}
      data-testid="nav-account-link"
      aria-label={label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </LocalizedClientLink>
  )
}

export default function NavClient({
  regions,
  storeName,
  cart,
  categories = [],
  variant = "overlay",
  logoUrl,
  logoHeight = 32,
  showName = true,
}: NavClientProps) {
  const [scrolled, setScrolled] = useState(false)
  const t = useTranslations("Nav")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Only the overlay header is transparent; the others are always solid.
  const light = variant !== "overlay" || scrolled

  const linkClass = light
    ? "text-muted-foreground hover:text-foreground"
    : "text-white/70 hover:text-white"
  const storeClass = light ? "text-foreground" : "text-white"

  // Logo image (and optionally the name beside it), or just the name.
  const brand = logoUrl ? (
    <span className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={storeName} style={{ height: logoHeight }} className="w-auto max-w-[220px] object-contain" />
      {showName ? <span>{storeName}</span> : null}
    </span>
  ) : (
    storeName
  )

  const icons = (
    <div className="flex flex-1 items-center justify-end gap-x-6">
      <AccountIcon className={linkClass} label={t("account")} />
      <CartDropdown cart={cart} scrolled={light} />
    </div>
  )
  const menu = (
    <div className="flex flex-1 items-center">
      <SideMenu regions={regions} scrolled={light} storeName={storeName} categories={categories} />
    </div>
  )
  const inlineLinks = (
    <ul className="hidden items-center gap-x-7 small:flex" data-testid="nav-category-links">
      {categories.slice(0, 7).map((c) => (
        <li key={c.handle}>
          <LocalizedClientLink
            href={`/categories/${c.handle}`}
            className={`text-sm transition-colors duration-300 ${linkClass}`}
          >
            {c.name}
          </LocalizedClientLink>
        </li>
      ))}
    </ul>
  )

  if (variant === "bar") {
    return (
      <header className="sticky top-0 inset-x-0 z-50 border-b bg-background/95 backdrop-blur" data-header="bar">
        <nav className="content-container flex h-16 items-center gap-x-8">
          <div className="small:hidden">{menu}</div>
          <LocalizedClientLink
            href="/"
            className={`font-serif text-lg font-semibold tracking-tight ${storeClass}`}
            data-testid="nav-store-link"
          >
            {brand}
          </LocalizedClientLink>
          <div className="flex flex-1 justify-center">{inlineLinks}</div>
          <div className="ml-auto small:ml-0">{icons}</div>
        </nav>
      </header>
    )
  }

  if (variant === "centered") {
    return (
      <header className="sticky top-0 inset-x-0 z-50 border-b bg-background" data-header="centered">
        <nav className="content-container flex h-16 items-center small:h-20">
          {menu}
          <LocalizedClientLink
            href="/"
            className={`font-serif text-xl font-light tracking-[0.25em] small:text-2xl ${storeClass}`}
            data-testid="nav-store-link"
          >
            {brand}
          </LocalizedClientLink>
          {icons}
        </nav>
        <div className="hidden border-t small:block">
          <div className="content-container flex h-11 items-center justify-center">{inlineLinks}</div>
        </div>
      </header>
    )
  }

  return (
    <header
      data-header="overlay"
      className={`sticky top-0 inset-x-0 z-50 h-16 transition-colors duration-300 ${
        light ? "bg-background shadow-sm" : "bg-transparent"
      }`}
    >
      <nav className="content-container flex h-full items-center justify-between">
        {menu}
        <LocalizedClientLink
          href="/"
          className={`font-serif text-lg font-light tracking-widest transition-colors duration-300 ${storeClass}`}
          data-testid="nav-store-link"
        >
          {brand}
        </LocalizedClientLink>
        {icons}
      </nav>
    </header>
  )
}
