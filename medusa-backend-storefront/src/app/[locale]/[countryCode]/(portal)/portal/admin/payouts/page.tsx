import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createPayouts, markPayoutPaid } from "@lib/portal/actions"
import { portalBase, portalFetch } from "@lib/portal/api"
import { SubmitButton } from "@modules/portal/submit-button"
import { Empty, Field, Hidden, Notice, PageHeader, StatusBadge, date, money } from "@modules/portal/ui"
import { Wallet } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function PayoutsPage({
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
  const returnTo = `${base}/admin/payouts`
  const [{ owed }, { payouts }, { collaborators }] = await Promise.all([
    portalFetch<{ owed: { collaborator_id: string; currency_code: string; net: number; entries: number }[] }>("/portal-api/admin/earnings"),
    portalFetch<{ payouts: any[] }>("/portal-api/admin/payouts"),
    portalFetch<{ collaborators: { id: string; email: string }[] }>("/portal-api/admin/collaborators"),
  ])
  const email = (id: string) => collaborators.find((c) => c.id === id)?.email ?? id
  const month = new Date().toISOString().slice(0, 7)

  return (
    <>
      <PageHeader title={t("payouts.title")} />
      <Notice error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">{t("payouts.currentlyOwed")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {owed.length === 0 ? (
                <div className="p-4">
                  <Empty icon={Wallet} title={t("payouts.nothingOwed")} />
                </div>
              ) : (
                <Table className="rt">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("payouts.collaborator")}</TableHead>
                      <TableHead className="text-right">{t("payouts.entries")}</TableHead>
                      <TableHead className="text-right">{t("payouts.net")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {owed.map((o) => (
                      <TableRow key={`${o.collaborator_id}${o.currency_code}`}>
                        <TableCell>{email(o.collaborator_id)}</TableCell>
                        <TableCell data-label={t("payouts.entries")} className="text-right">{o.entries}</TableCell>
                        <TableCell data-label={t("payouts.net")} className={`text-right font-medium ${o.net < 0 ? "text-destructive" : ""}`}>
                          {money(o.net, o.currency_code, p.locale)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{o.net <= 0 ? t("payouts.carried") : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">{t("payouts.history")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payouts.length === 0 ? (
                <div className="p-4">
                  <Empty icon={Wallet} title={t("payouts.noPayouts")} />
                </div>
              ) : (
                <Table className="rt">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("payouts.created")}</TableHead>
                      <TableHead>{t("payouts.period")}</TableHead>
                      <TableHead>{t("payouts.collaborator")}</TableHead>
                      <TableHead className="text-right">{t("payouts.amount")}</TableHead>
                      <TableHead>{t("payouts.status")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((x) => (
                      <TableRow key={x.id}>
                        <TableCell>{date(x.created_at, p.locale)}</TableCell>
                        <TableCell data-label={t("payouts.period")}>{x.period}</TableCell>
                        <TableCell data-label={t("payouts.collaborator")}>{email(x.collaborator_id)}</TableCell>
                        <TableCell data-label={t("payouts.amount")} className="text-right">{money(Number(x.amount), x.currency_code, p.locale)}</TableCell>
                        <TableCell data-label={t("payouts.status")}>
                          <StatusBadge status={x.status === "pending" ? "pending" : "paid"} label={x.status === "pending" ? t("status.payoutPending") : t("status.paid")} />
                        </TableCell>
                        <TableCell className="text-right">
                          {x.status === "pending" ? (
                            <form action={markPayoutPaid}>
                              <Hidden name="id" value={x.id} />
                              <Hidden name="returnTo" value={returnTo} />
                              <Button size="sm" variant="outline">
                                {t("payouts.markPaid")}
                              </Button>
                            </form>
                          ) : (
                            <span className="text-xs text-muted-foreground">{date(x.paid_at, p.locale)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t("payouts.monthEnd")}</CardTitle>
            <CardDescription>{t("payouts.monthEndText")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createPayouts} className="space-y-3">
              <Hidden name="returnTo" value={returnTo} />
              <Field label={t("payouts.period")} name="period" defaultValue={month} pattern="\d{4}-\d{2}" />
              <SubmitButton className="w-full">{t("payouts.create")}</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
