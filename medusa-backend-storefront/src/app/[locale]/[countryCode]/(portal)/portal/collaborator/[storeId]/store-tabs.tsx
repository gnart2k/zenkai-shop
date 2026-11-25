"use client"

import { cn } from "@/lib/utils"
import { ClipboardList, Coins, Package, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"

const ICONS: Record<string, LucideIcon> = { products: Package, requests: ClipboardList, profit: Coins }

export function StoreTabs({
  items,
}: {
  items: { key: string; label: string; href: string; icon: string; exact?: boolean }[]
}) {
  const path = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-background p-1">
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? Package
        const active = it.exact ? path === it.href : path.startsWith(it.href)
        return (
          <a
            key={it.key}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Icon className="size-4 max-[420px]:hidden" />
            {it.label}
          </a>
        )
      })}
    </nav>
  )
}
