"use client"

import { useTranslations } from "next-intl"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const t = useTranslations("ShopCart")
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-6 rounded-lg border border-border/40 bg-white p-6">
      <h2 className="font-serif text-2xl font-light text-foreground">
        {t("summary")}
      </h2>
      <DiscountCode cart={cart} />
      <Divider />
      <CartTotals totals={cart} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
      >
        <button className="flex h-12 w-full items-center justify-center border border-foreground bg-foreground px-8 text-sm font-medium text-white transition-all hover:bg-foreground/90">
          {t("goToCheckout")}
        </button>
      </LocalizedClientLink>
    </div>
  )
}

export default Summary
