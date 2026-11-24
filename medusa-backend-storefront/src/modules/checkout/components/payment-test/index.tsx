import { Badge } from "@medusajs/ui"
import { useTranslations } from "next-intl"

const PaymentTest = ({ className }: { className?: string }) => {
  const t = useTranslations("CheckoutFlowPaymentTest")
  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">{t("attention")}</span> {t("testOnly")}
    </Badge>
  )
}

export default PaymentTest
