import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { approveRequest, rejectRequest, reverseRequest } from "@lib/portal/actions"
import { portalBase, portalFetch } from "@lib/portal/api"
import { SubmitButton } from "@modules/portal/submit-button"
import { Hidden, Notice, PageHeader, StatusBadge, money } from "@modules/portal/ui"
import { ArrowLeft, ExternalLink, Lock } from "lucide-react"
import { getTranslations } from "next-intl/server"

type Detail = {
  request: any
  collaborator: { email: string; name: string | null }
  original_cost: number | null
  collaborator_earning: number
  store_margin: number | null
  payment_link: string | null
}

const Row = ({ k, v, strong }: { k: React.ReactNode; v: React.ReactNode; strong?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4 border-b py-2 text-sm last:border-0">
    <span className="text-muted-foreground">{k}</span>
    <span className={strong ? "font-semibold" : ""}>{v}</span>
  </div>
)

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string; id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const sp = await searchParams
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const d = await portalFetch<Detail>(`/portal-api/admin/requests/${p.id}`)
  const r = d.request
  const m = (n: number | null) => money(n, r.currency_code, p.locale)
  const returnTo = `${base}/admin/requests/${p.id}`
  const total = Number(r.commercial_price) * r.quantity

  return (
    <div className="max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <a href={`${base}/admin/requests`}>
          <ArrowLeft />
          {t("common.back")}
        </a>
      </Button>
      <PageHeader title={t("review.title", { product: r.product_title ?? r.sku ?? "" })}>
        <StatusBadge status={r.status} label={t(`status.${r.status}` as never)} />
      </PageHeader>
      <Notice error={sp.error} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("review.pricingCheck")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Row k={t("review.quantity")} v={r.quantity} />
            <Row k={t("review.originalPrice")} v={m(Number(r.original_price))} />
            <Row
              k={
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3" />
                  {t("review.originalCost")}
                </span>
              }
              v={d.original_cost === null ? t("review.notSet") : m(d.original_cost)}
            />
            <Row k={t("review.collabPrice")} v={m(Number(r.commercial_price))} />
            <Row k={t("review.orderTotal")} v={m(total)} strong />
            <Row k={t("review.collabProfit")} v={m(d.collaborator_earning)} />
            <Row k={t("review.storeMargin")} v={d.store_margin === null ? "-" : m(d.store_margin)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("review.depositAndCustomer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Row k={t("review.depositDue", { percent: r.deposit_percent })} v={m(Number(r.deposit_amount))} strong />
            <Row
              k={t("review.proof")}
              v={
                <a className="inline-flex items-center gap-1 underline" href={`${returnTo}/proof`} target="_blank" rel="noreferrer">
                  {t("review.openFile")}
                  <ExternalLink className="size-3" />
                </a>
              }
            />
            <Row k={t("review.customer")} v={r.customer_name} />
            <Row k={t("review.email")} v={r.customer_email} />
            <Row k={t("review.phone")} v={r.customer_phone ?? "-"} />
            <Row k={t("review.address")} v={r.customer_address ?? "-"} />
            <Row k={t("review.collaborator")} v={d.collaborator.name ?? d.collaborator.email} />
          </CardContent>
        </Card>
      </div>

      {r.status === "rejected" ? (
        <Card className="mt-4 border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">
            {t("review.rejected", { reason: r.reject_reason ?? "" })}
          </CardContent>
        </Card>
      ) : null}

      {r.status === "pending" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("review.approveTitle")}</CardTitle>
              <CardDescription>{t("review.approveText")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={approveRequest}>
                <Hidden name="id" value={r.id} />
                <Hidden name="returnTo" value={returnTo} />
                <SubmitButton>{t("review.approveBtn")}</SubmitButton>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("review.rejectTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={rejectRequest} className="space-y-3">
                <Hidden name="id" value={r.id} />
                <Hidden name="returnTo" value={returnTo} />
                <Input name="reason" required placeholder={t("review.rejectPlaceholder")} />
                <SubmitButton variant="destructive">{t("review.rejectBtn")}</SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {d.payment_link && r.status === "approved" ? (
        <Card className="mt-6">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">{t("review.approvedWait")}</p>
            <Input readOnly value={d.payment_link} data-testid="payment-link" className="text-xs" />
          </CardContent>
        </Card>
      ) : null}

      {r.status === "paid" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("review.reverseTitle")}</CardTitle>
            <CardDescription>{t("review.reverseText")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={reverseRequest} className="flex flex-col gap-3 sm:flex-row">
              <Hidden name="id" value={r.id} />
              <Hidden name="returnTo" value={returnTo} />
              <Input name="reason" placeholder={t("review.reverseReason")} />
              <SubmitButton variant="destructive">{t("review.reverseBtn")}</SubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
