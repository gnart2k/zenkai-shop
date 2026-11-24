import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { portalBase, portalFetch } from "@lib/portal/api"
import { PageHeader } from "@modules/portal/ui"
import { ClipboardList, Package, Percent, Users, Wallet } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function AdminHome({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const [{ settings }, { requests }, { owed }] = await Promise.all([
    portalFetch<{ settings: { deposit_percent: number; default_contact_email: string | null } }>("/portal-api/admin/me"),
    portalFetch<{ requests: { id: string }[] }>("/portal-api/admin/requests?status=pending"),
    portalFetch<{ owed: { net: number }[] }>("/portal-api/admin/earnings"),
  ])
  const owing = owed.filter((o) => o.net > 0).length

  const tiles = [
    { label: t("admin.pending"), value: String(requests.length), href: `${base}/admin/requests?status=pending`, icon: ClipboardList, tone: "bg-amber-50 text-amber-700" },
    { label: t("admin.waitingPayout"), value: String(owing), href: `${base}/admin/payouts`, icon: Wallet, tone: "bg-emerald-50 text-emerald-700" },
    { label: t("admin.depositRequired"), value: `${settings.deposit_percent}%`, href: `${base}/admin/requests`, icon: Percent, tone: "bg-sky-50 text-sky-700" },
  ]
  return (
    <>
      <PageHeader title={t("admin.title")} description={t("admin.welcome")}>
        <Button asChild variant="outline">
          <a href={`${base}/admin/products/new`}>
            <Package />
            {t("admin.quickProducts")}
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`${base}/admin/collaborators`}>
            <Users />
            {t("admin.quickCollabs")}
          </a>
        </Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map(({ label, value, href, icon: Icon, tone }) => (
          <a key={label} href={href}>
            <Card className="transition hover:border-primary hover:shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <span className={`grid size-11 place-items-center rounded-full ${tone}`}>
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold">{value}</p>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {t("admin.settingsNote", { contact: settings.default_contact_email ?? t("admin.notSet") })}
      </p>
    </>
  )
}
