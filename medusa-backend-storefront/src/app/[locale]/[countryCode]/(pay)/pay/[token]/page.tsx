import { Card, CardContent } from "@/components/ui/card"
import { continueToPayment } from "@lib/portal/actions"
import { PortalError, portalFetch } from "@lib/portal/api"
import { SubmitButton } from "@modules/portal/submit-button"
import { Hidden, money } from "@modules/portal/ui"
import { CheckCircle2, LinkIcon, Mail, Phone } from "lucide-react"
import { getTranslations } from "next-intl/server"

type Pay = {
  status: "approved" | "paid"
  cart_id: string | null
  order_id: string | null
  product_title: string | null
  sku: string | null
  quantity: number
  currency_code: string
  unit_price: number
  deposit_amount: number
  contact: { source: string; name?: string | null; email: string; phone?: string | null }
}

/** Customer-facing payment page opened from the emailed link. No sign-in needed. */
export default async function PayPage({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string; token: string }>
}) {
  const p = await params
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.pay" })
  let pay: Pay | null = null
  try {
    pay = await portalFetch<Pay>(`/portal/pay/${encodeURIComponent(p.token)}`, { auth: false })
  } catch (e) {
    if (!(e instanceof PortalError)) {
      throw e
    }
  }

  if (!pay) {
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-muted">
          <LinkIcon className="size-6 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="text-muted-foreground">{t("notFoundText")}</p>
      </div>
    )
  }

  const m = (n: number) => money(n, pay!.currency_code, p.locale)

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <p className="font-medium">{pay.product_title}</p>
            <p className="text-sm text-muted-foreground">{pay.sku}</p>
          </div>
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              {pay.quantity} × {m(pay.unit_price)}
            </span>
            <span className="text-lg font-semibold">{m(pay.unit_price * pay.quantity)}</span>
          </div>
          <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="size-4 shrink-0" />
            {t("depositConfirmed", { amount: m(pay.deposit_amount) })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1 p-5 text-sm">
          <p className="mb-1 font-medium">{t("contact")}</p>
          {pay.contact.name ? <p>{pay.contact.name}</p> : null}
          <p className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <a className="underline" href={`mailto:${pay.contact.email}`}>
              {pay.contact.email}
            </a>
          </p>
          {pay.contact.phone ? (
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              {pay.contact.phone}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {pay.status === "paid" ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">{t("paid")}</p>
      ) : (
        <form action={continueToPayment}>
          <Hidden name="cart_id" value={pay.cart_id ?? ""} />
          <Hidden name="locale" value={p.locale} />
          <Hidden name="countryCode" value={p.countryCode} />
          <Hidden name="returnTo" value={`/${p.locale}/${p.countryCode}/pay/${p.token}`} />
          <SubmitButton size="lg" className="w-full">
            {t("continue")}
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
