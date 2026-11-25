import { Button } from "@/components/ui/button"
import { logout } from "@lib/portal/actions"
import { currentActor, portalBase, portalFetch } from "@lib/portal/api"
import { LangSwitch, MobileNav, SidebarNav, StoreSwitcher, type NavItem } from "@modules/portal/portal-nav"
import { Hidden } from "@modules/portal/ui"
import { LogOut, Store } from "lucide-react"
import { getTranslations } from "next-intl/server"

export const dynamic = "force-dynamic"

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const actor = await currentActor()
  // Collaborators pick the store in the header (they can work for several).
  const stores =
    actor === "collaborator"
      ? await portalFetch<{ stores: { id: string; name: string }[] }>("/portal-api/collaborator/stores")
          .then((r) => r.stores)
          .catch(() => [])
      : []

  // The admin gets a sidebar. Collaborators get tabs inside their store pages instead.
  const adminNav: NavItem[] =
    actor === "portal_admin"
      ? [
          { key: "dashboard", label: t("nav.dashboard"), href: `${base}/admin`, icon: "dashboard", exact: true },
          { key: "requests", label: t("nav.requests"), href: `${base}/admin/requests`, icon: "requests" },
          { key: "products", label: t("nav.products"), href: `${base}/admin/products`, icon: "products" },
          { key: "categories", label: t("nav.categories"), href: `${base}/admin/categories`, icon: "categories" },
          { key: "appearance", label: t("nav.appearance"), href: `${base}/admin/appearance`, icon: "appearance" },
          { key: "collaborators", label: t("nav.collaborators"), href: `${base}/admin/collaborators`, icon: "collaborators" },
          { key: "payouts", label: t("nav.payouts"), href: `${base}/admin/payouts`, icon: "payouts" },
        ]
      : []

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      {/* Keeps focused fields clear of sticky bars (e.g. the editor's save bar). */}
      <style>{"html{scroll-padding-top:4.5rem;scroll-padding-bottom:7rem}"}</style>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          {adminNav.length ? (
            <MobileNav items={adminNav} title={t("common.brand")} menuLabel={t("common.menu")} />
          ) : null}
          <a
            href={actor === "portal_admin" ? `${base}/admin` : actor ? `${base}/collaborator` : `${base}/login`}
            className="flex items-center gap-2 font-semibold"
          >
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Store className="size-4" />
            </span>
            <span className={stores.length ? "hidden sm:inline" : undefined}>{t("common.brand")}</span>
          </a>
          {actor ? (
            <span className="hidden rounded-full border px-2 py-0.5 text-xs text-muted-foreground sm:inline">
              {actor === "portal_admin" ? t("nav.storeAdmin") : t("nav.collaborator")}
            </span>
          ) : null}
          {stores.length ? <StoreSwitcher stores={stores} label={t("stores.switch")} /> : null}
          <div className="flex-1" />
          <LangSwitch current={p.locale} label={t("common.language")} />
          {actor ? (
            <form action={logout}>
              <Hidden name="base" value={base} />
              <Button variant="ghost" size="sm">
                <LogOut />
                <span className="hidden sm:inline">{t("common.signOut")}</span>
              </Button>
            </form>
          ) : null}
        </div>
      </header>
      <div className="flex">
        {adminNav.length ? (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r bg-background p-4 md:block">
            <SidebarNav items={adminNav} />
          </aside>
        ) : null}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
