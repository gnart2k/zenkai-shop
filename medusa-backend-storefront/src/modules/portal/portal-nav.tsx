"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  Coins,
  Globe,
  LayoutDashboard,
  ClipboardList,
  Menu,
  Package,
  Palette,
  Store,
  Tags,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  requests: ClipboardList,
  products: Package,
  categories: Tags,
  appearance: Palette,
  collaborators: Users,
  payouts: Wallet,
  store: Store,
  profit: Coins,
}

export type NavItem = { key: string; label: string; href: string; icon: string; exact?: boolean }

function Links({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const path = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? Package
        const active = it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`)
        return (
          <a
            key={it.key}
            href={it.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {it.label}
          </a>
        )
      })}
    </nav>
  )
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  return <Links items={items} />
}

/** Hamburger + slide-over menu for small screens. */
export function MobileNav({ items, title, menuLabel }: { items: NavItem[]; title: string; menuLabel: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={menuLabel}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetTitle className="mb-4">{title}</SheetTitle>
        <Links items={items} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

/** Switches the portal language (stored in a cookie) and returns to the same page. */
export function LangSwitch({ current, label }: { current: string; label: string }) {
  const path = usePathname()
  const swap = (to: string) => `/api/portal/locale?to=${to}&next=${encodeURIComponent(path)}`
  return (
    <div className="flex items-center gap-1 text-sm" aria-label={label}>
      <Globe className="size-4 text-muted-foreground" />
      {(["vi", "en"] as const).map((l) => (
        <a
          key={l}
          href={swap(l)}
          hrefLang={l}
          className={cn(
            "rounded px-1.5 py-0.5 font-medium uppercase",
            l === current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          )}
        >
          {l}
        </a>
      ))}
    </div>
  )
}

/**
 * Collaborators work for several stores: the store is chosen here, in the header, and the page
 * keeps its section (products / requests / profit) when switching. The choice is remembered.
 */
export function StoreSwitcher({
  stores,
  label,
}: {
  stores: { id: string; name: string }[]
  label: string
}) {
  const path = usePathname()
  const m = /^\/portal\/collaborator\/([^/]+)(\/.*)?$/.exec(path ?? "")
  const current = m?.[1] ?? ""
  useEffect(() => {
    if (current) document.cookie = `portal_store=${current}; path=/; max-age=31536000; samesite=lax`
  }, [current])
  if (stores.length === 0) return null
  const go = (id: string) => {
    document.cookie = `portal_store=${id}; path=/; max-age=31536000; samesite=lax`
    window.location.assign(`/portal/collaborator/${id}${m?.[2] ?? ""}`)
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <Store className="size-4 text-muted-foreground" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        value={current}
        onChange={(e) => go(e.target.value)}
        className="h-9 max-w-[14rem] rounded-md border border-input bg-background px-2 text-sm font-medium shadow-sm"
      >
        {!current ? <option value="">{label}</option> : null}
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  )
}
