import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { portalFetch } from "@lib/portal/api"
import { Empty, PageHeader, StatusBadge, date, money } from "@modules/portal/ui"
import { Coins, Wallet } from "lucide-react"
import { getTranslations } from "next-intl/server"

type Earnings = {
  owed: number
  entries: {
    id: string
    request_id: string
    type: string
    amount: number
    currency_code: string
    settled: boolean
    note: string | null
    created_at: string
  }[]
  payouts: { id: string; period: string; amount: number; currency_code: string; status: string; paid_at: string | null }[]
}

export default async function EarningsPage({
  params,
}: {
  params: Promise<{ locale: string; storeId: string }>
}) {
  const { locale, storeId } = await params
  const t = await getTranslations({ locale, namespace: "Portal" })
  const e = await portalFetch<Earnings>(`/portal-api/collaborator/stores/${storeId}/earnings`)
  const cur = e.entries[0]?.currency_code ?? e.payouts[0]?.currency_code ?? "vnd"

  return (
    <>
      <PageHeader title={t("earnings.title")} />
      <Card className="mb-6 max-w-sm">
        <CardContent className="flex items-center gap-4 p-5">
          <span className="grid size-11 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              {t("earnings.yourProfit")} · {t("earnings.hint")}
            </p>
            <p className={`text-2xl font-semibold ${e.owed < 0 ? "text-destructive" : ""}`}>
              {money(e.owed, cur, locale)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{t("earnings.ledger")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {e.entries.length === 0 ? (
              <div className="p-4">
                <Empty icon={Coins} title={t("earnings.empty")} />
              </div>
            ) : (
              <Table className="rt">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("earnings.date")}</TableHead>
                    <TableHead>{t("earnings.type")}</TableHead>
                    <TableHead className="text-right">{t("earnings.amount")}</TableHead>
                    <TableHead>{t("earnings.settled")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {e.entries.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell className="whitespace-nowrap">{date(x.created_at, locale)}</TableCell>
                      <TableCell data-label={t("earnings.type")}>
                        {t(`ledgerType.${x.type}` as never)}
                        {x.note ? <div className="text-xs text-muted-foreground">{x.note}</div> : null}
                      </TableCell>
                      <TableCell data-label={t("earnings.amount")} className={`text-right font-medium ${x.amount < 0 ? "text-destructive" : "text-emerald-700"}`}>
                        {money(x.amount, x.currency_code, locale)}
                      </TableCell>
                      <TableCell data-label={t("earnings.settled")}>{x.settled ? t("earnings.yes") : t("earnings.no")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("earnings.payouts")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {e.payouts.length === 0 ? (
              <div className="p-4">
                <Empty icon={Wallet} title={t("earnings.noPayouts")} />
              </div>
            ) : (
              <Table className="rt">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("earnings.period")}</TableHead>
                    <TableHead className="text-right">{t("earnings.amount")}</TableHead>
                    <TableHead>{t("earnings.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {e.payouts.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell>{x.period}</TableCell>
                      <TableCell data-label={t("earnings.amount")} className="text-right">{money(x.amount, x.currency_code, locale)}</TableCell>
                      <TableCell data-label={t("earnings.status")}>
                        <StatusBadge
                          status={x.status === "pending" ? "pending" : "paid"}
                          label={x.status === "pending" ? t("status.payoutPending") : `${t("status.paid")} ${date(x.paid_at, locale)}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
