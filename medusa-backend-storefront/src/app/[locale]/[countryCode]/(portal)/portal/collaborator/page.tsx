import { portalBase, portalFetch, requireActor } from "@lib/portal/api"
import { Empty, PageHeader } from "@modules/portal/ui"
import { Store } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * No store picker page: the store is chosen in the header. This route just opens the store the
 * collaborator used last (cookie) or the first one they belong to.
 */
export default async function CollaboratorHome({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.stores" })
  await requireActor("collaborator", base)
  const { stores } = await portalFetch<{ stores: { id: string; name: string }[] }>(
    "/portal-api/collaborator/stores"
  )
  const last = (await cookies()).get("portal_store")?.value
  const target = stores.find((s) => s.id === last) ?? stores[0]
  if (target) redirect(`${base}/collaborator/${target.id}`)

  return (
    <>
      <PageHeader title={t("title")} />
      <Empty icon={Store} title={t("empty")} />
    </>
  )
}
