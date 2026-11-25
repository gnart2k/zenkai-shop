import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { portalBase, portalFetch } from "@lib/portal/api"
import { Empty, Notice, PageHeader, StatusBadge, date, money } from "@modules/portal/ui"
import { ClipboardList, Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"

type Req = {
  id: string
  sku: string | null
  product_title: string | null
  quantity: number
  currency_code: string
  original_price: number
  commercial_price: number
  deposit_amount: number
  customer_name: string
  status: string
  reject_reason: string | null
  created_at: string
}

export default async function RequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string; storeId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const sp = await searchParams
  const { requests } = await portalFetch<{ requests: Req[] }>(
    `/portal-api/collaborator/stores/${p.storeId}/requests`
  )

  return (
    <>
      <PageHeader title={t("requests.title")}>
        <Button asChild>
          <a href={`${base}/collaborator/${p.storeId}`}>
            <Plus />
            {t("requests.newRequest")}
          </a>
        </Button>
      </PageHeader>
      <Notice error={sp.error} ok={sp.created ? t("requests.created") : undefined} />
      {requests.length === 0 ? (
        <Empty icon={ClipboardList} title={t("requests.empty")} />
      ) : (
        <Card className="overflow-hidden">
          <Table className="rt">
            <TableHeader>
              <TableRow>
                <TableHead>{t("requests.date")}</TableHead>
                <TableHead>{t("requests.product")}</TableHead>
                <TableHead className="text-right">{t("requests.qty")}</TableHead>
                <TableHead className="text-right">{t("requests.yourPrice")}</TableHead>
                <TableHead className="text-right">{t("requests.yourProfit")}</TableHead>
                <TableHead className="text-right">{t("requests.deposit")}</TableHead>
                <TableHead>{t("requests.customer")}</TableHead>
                <TableHead>{t("requests.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{date(r.created_at, p.locale)}</TableCell>
                  <TableCell data-label={t("requests.product")}>
                    <div className="font-medium">{r.product_title}</div>
                    <div className="text-xs text-muted-foreground">{r.sku}</div>
                  </TableCell>
                  <TableCell data-label={t("requests.qty")} className="text-right">{r.quantity}</TableCell>
                  <TableCell data-label={t("requests.yourPrice")} className="text-right">{money(r.commercial_price, r.currency_code, p.locale)}</TableCell>
                  <TableCell data-label={t("requests.yourProfit")} className="text-right font-medium text-emerald-700">
                    {money((r.commercial_price - r.original_price) * r.quantity, r.currency_code, p.locale)}
                  </TableCell>
                  <TableCell data-label={t("requests.deposit")} className="text-right">{money(r.deposit_amount, r.currency_code, p.locale)}</TableCell>
                  <TableCell data-label={t("requests.customer")}>{r.customer_name}</TableCell>
                  <TableCell data-label={t("requests.status")}>
                    <StatusBadge status={r.status} label={t(`status.${r.status}` as never)} />
                    {r.reject_reason ? (
                      <div className="mt-1 max-w-48 text-xs text-destructive">{r.reject_reason}</div>
                    ) : null}
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
