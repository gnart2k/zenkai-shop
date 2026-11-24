import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { portalBase, portalFetch } from "@lib/portal/api"
import { cn } from "@/lib/utils"
import { Empty, Notice, PageHeader, StatusBadge, date, money } from "@modules/portal/ui"
import { ClipboardList } from "lucide-react"
import { getTranslations } from "next-intl/server"

const STATUSES = ["pending", "approved", "rejected", "paid", "cancelled"]

export default async function AdminRequests({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const sp = await searchParams
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined
  const { requests } = await portalFetch<{ requests: any[] }>(
    `/portal-api/admin/requests${status ? `?status=${status}` : ""}`
  )

  return (
    <>
      <PageHeader title={t("adminRequests.title")} />
      <Notice error={sp.error} />
      <div className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <a
            key={s ?? "all"}
            href={s ? `?status=${s}` : "?"}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              s === status ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
            )}
          >
            {t(`status.${s ?? "all"}` as never)}
          </a>
        ))}
      </div>
      {requests.length === 0 ? (
        <Empty icon={ClipboardList} title={t("adminRequests.empty")} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminRequests.date")}</TableHead>
                <TableHead>{t("adminRequests.collaborator")}</TableHead>
                <TableHead>{t("adminRequests.product")}</TableHead>
                <TableHead className="text-right">{t("adminRequests.qty")}</TableHead>
                <TableHead className="text-right">{t("adminRequests.price")}</TableHead>
                <TableHead className="text-right">{t("adminRequests.deposit")}</TableHead>
                <TableHead>{t("adminRequests.status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{date(r.created_at, p.locale)}</TableCell>
                  <TableCell>{r.collaborator_email}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.product_title}</div>
                    <div className="text-xs text-muted-foreground">{r.sku}</div>
                  </TableCell>
                  <TableCell className="text-right">{r.quantity}</TableCell>
                  <TableCell className="text-right">{money(Number(r.commercial_price), r.currency_code, p.locale)}</TableCell>
                  <TableCell className="text-right">{money(Number(r.deposit_amount), r.currency_code, p.locale)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} label={t(`status.${r.status}` as never)} />
                  </TableCell>
                  <TableCell>
                    <a className="text-sm font-medium underline-offset-4 hover:underline" href={`${base}/admin/requests/${r.id}`}>
                      {r.status === "pending" ? t("adminRequests.review") : t("adminRequests.view")}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}
