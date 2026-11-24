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
import { useState } from "react"

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

/** Swaps the locale segment of the current URL: /vi/vn/portal/x <-> /en/vn/portal/x */
export function LangSwitch({ current, label }: { current: string; label: string }) {
  const path = usePathname()
  const swap = (to: string) => path.replace(/^\/(en|vi)(?=\/|$)/, `/${to}`)
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
