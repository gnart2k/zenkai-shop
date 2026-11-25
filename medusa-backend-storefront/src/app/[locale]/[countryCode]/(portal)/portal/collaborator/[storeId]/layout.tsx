import { portalBase, portalFetch, requireActor } from "@lib/portal/api"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"
import { getTranslations } from "next-intl/server"
import { StoreTabs } from "./store-tabs"

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; countryCode: string; storeId: string }>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.nav" })
  await requireActor("collaborator", base)
  // A store the collaborator does not belong to (or that does not exist) goes back to their own store
  // instead of failing with a server error.
  const { stores } = await portalFetch<{ stores: { id: string }[] }>("/portal-api/collaborator/stores")
  if (!stores.some((s) => s.id === p.storeId)) {
    redirect(`${base}/collaborator`)
  }
  const tabs = [
    { key: "products", label: t("products"), href: `${base}/collaborator/${p.storeId}`, icon: "products", exact: true },
    { key: "requests", label: t("myRequests"), href: `${base}/collaborator/${p.storeId}/requests`, icon: "requests" },
    { key: "profit", label: t("profit"), href: `${base}/collaborator/${p.storeId}/earnings`, icon: "profit" },
  ]
  return (
    <div className={cn("space-y-6")}>
      <StoreTabs items={tabs} />
      {children}
    </div>
  )
}
