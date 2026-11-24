import { useLocale, useTranslations } from "next-intl"
import { Container, Heading, Text } from "@medusajs/ui"

import { isStripeLike, paymentInfoMap } from "@lib/constants"
import Divider from "@modules/common/components/divider"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const t = useTranslations("ShopOrder")
  const locale = useLocale()
  const providerTitle = (providerId: string) => {
    if (providerId === "pp_system_default") {
      return t("providers.manual")
    }
    if (
      providerId === "pp_stripe_stripe" ||
      providerId === "pp_medusa-payments_default"
    ) {
      return t("providers.card")
    }
    return paymentInfoMap[providerId].title
  }
  const payment = order.payment_collections?.[0].payments?.[0]

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {t("paymentHeading")}
      </Heading>
      <div>
        {payment && (
          <div className="flex items-start gap-x-1 w-full">
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("paymentMethod")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method"
              >
                {providerTitle(payment.provider_id)}
              </Text>
            </div>
            <div className="flex flex-col w-2/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("paymentDetails")}
              </Text>
              <div className="flex gap-2 txt-medium text-ui-fg-subtle items-center">
                <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                  {paymentInfoMap[payment.provider_id].icon}
                </Container>
                <Text data-testid="payment-amount">
                  {isStripeLike(payment.provider_id) && payment.data?.card_last4
                    ? `**** **** **** ${payment.data.card_last4}`
                    : t("paidAt", {
                        amount: convertToLocale({
                          amount: payment.amount,
                          currency_code: order.currency_code,
                        }),
                        date: new Date(
                          payment.created_at ?? ""
                        ).toLocaleString(locale),
                      })}
                </Text>
              </div>
            </div>
          </div>
        )}
      </div>

      <Divider className="mt-8" />
    </div>
  )
}

export default PaymentDetails
