import { Card, CardContent } from "@/components/ui/card"
import { portalBase, portalFetch, requireActor } from "@lib/portal/api"
import { Empty, PageHeader } from "@modules/portal/ui"
import { Store } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

export default async function CollaboratorStores({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.stores" })
  await requireActor("collaborator", base)
  const { stores } = await portalFetch<{ stores: { id: string; name: string }[] }>(
    "/portal/collaborator/stores"
  )

  // One store: skip the picker.
  if (stores.length === 1) {
    redirect(`${base}/collaborator/${stores[0].id}`)
  }

  return (
    <>
      <PageHeader title={t("title")} />
      {stores.length === 0 ? (
        <Empty icon={Store} title={t("empty")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => (
            <a key={s.id} href={`${base}/collaborator/${s.id}`}>
              <Card className="transition hover:border-primary hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-5">
                  <span className="grid size-10 place-items-center rounded-md bg-muted">
                    <Store className="size-5" />
                  </span>
                  <span className="font-medium">{s.name}</span>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
