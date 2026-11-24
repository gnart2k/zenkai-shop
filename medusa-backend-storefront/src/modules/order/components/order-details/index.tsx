import { useLocale, useTranslations } from "next-intl"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const t = useTranslations("ShopOrder")
  const locale = useLocale()

  const formatStatus = (kind: "fulfillment" | "payment", str: string) => {
    const key = `${kind}.${str}`
    if (t.has(key as any)) {
      return t(key as any)
    }
    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div>
      <Text>
        {t.rich("sentTo", {
          email: () => (
            <span
              className="text-ui-fg-medium-plus font-semibold"
              data-testid="order-email"
            >
              {order.email}
            </span>
          ),
        })}
      </Text>
      <Text className="mt-2">
        {t("orderDate")}{" "}
        <span data-testid="order-date">
          {new Date(order.created_at).toLocaleDateString(locale, {
            dateStyle: "long",
          })}
        </span>
      </Text>
      <Text className="mt-2 text-ui-fg-interactive">
        {t("orderNumber")} <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text>
              {t("orderStatus")}{" "}
              <span className="text-ui-fg-subtle " data-testid="order-status">
                {formatStatus("fulfillment", order.fulfillment_status)}
              </span>
            </Text>
            <Text>
              {t("paymentStatus")}{" "}
              <span
                className="text-ui-fg-subtle "
                sata-testid="order-payment-status"
              >
                {formatStatus("payment", order.payment_status)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
