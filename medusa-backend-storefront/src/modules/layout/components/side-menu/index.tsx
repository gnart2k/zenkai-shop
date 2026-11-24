"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { X } from "lucide-react"
import { Fragment } from "react"
import { useTranslations } from "next-intl"
import { useToggleState } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import UiLocaleSwitcher from "../ui-locale-switcher"
import { HttpTypes } from "@medusajs/types"

const SIDE_LINKS = [
  { labelKey: "home" as const, href: "/" },
  { labelKey: "store" as const, href: "/store" },
  { labelKey: "account" as const, href: "/account" },
  { labelKey: "cart" as const, href: "/cart" },
]

export type SideMenuCategory = { name: string; handle: string }

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  scrolled?: boolean
  storeName: string
  categories?: SideMenuCategory[]
}

const SideMenu = ({ regions, scrolled, storeName, categories = [] }: SideMenuProps) => {
  const t = useTranslations("SideMenu")
  const tl = useTranslations("ShopLayout")
  const tn = useTranslations("Nav")
  const countryToggleState = useToggleState()

  const iconClass = scrolled
    ? "text-muted-foreground hover:text-foreground"
    : "text-white/70 hover:text-white"

  return (
    <Popover className="h-full">
      {({ open, close }) => (
        <>
          <Popover.Button
            data-testid="nav-menu-button"
            className={`transition-colors duration-300 ${iconClass}`}
            aria-label={tn("menu")}
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
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </Popover.Button>

          <Transition
            show={open}
            as={Fragment}
            enter="transition duration-200 ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition duration-150 ease-in"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 z-40 bg-black/40" onClick={close} />
          </Transition>

          <Transition
            show={open}
            as={Fragment}
            enter="transition duration-300 ease-out"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition duration-200 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <PopoverPanel
              static
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white p-8 shadow-lg"
            >
              <div className="flex justify-end">
                <button
                  onClick={close}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={tl("closeMenu")}
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="mt-12 flex flex-1 flex-col gap-8">
                {SIDE_LINKS.map(({ labelKey, href }) => (
                  <LocalizedClientLink
                    key={labelKey}
                    href={href}
                    className="font-serif text-2xl font-light text-foreground transition-colors hover:text-foreground/60"
                    onClick={close}
                    data-testid={`${labelKey}-link`}
                  >
                    {t(labelKey)}
                  </LocalizedClientLink>
                ))}

                {categories.length > 0 && (
                  <div className="flex flex-col gap-3 border-t border-border/40 pt-6">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("categories")}
                    </p>
                    {categories.map((c) => (
                      <LocalizedClientLink
                        key={c.handle}
                        href={`/categories/${c.handle}`}
                        className="font-serif text-lg font-light text-foreground transition-colors hover:text-foreground/60"
                        onClick={close}
                        data-testid={`category-${c.handle}-link`}
                      >
                        {c.name}
                      </LocalizedClientLink>
                    ))}
                  </div>
                )}
              </nav>

              <div className="space-y-6 border-t border-border/40 pt-6">
                <UiLocaleSwitcher />
                {regions && (
                  <CountrySelect
                    toggleState={countryToggleState}
                    regions={regions}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {tl("copyright", {
                    year: new Date().getFullYear(),
                    name: storeName,
                  })}
                </p>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default SideMenu
