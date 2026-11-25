import { getTranslations } from "next-intl/server"
import { CreditCard } from "lucide-react"

/** Shown instead of the payment + review steps while online payment is switched off. */
export default async function PaymentsUnavailable() {
  const t = await getTranslations("CheckoutPaymentsOff")
  return (
    <div className="rounded-lg border bg-muted/40 p-6" data-testid="payments-unavailable">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background">
          <CreditCard className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("text")}</p>
        </div>
      </div>
    </div>
  )
}
