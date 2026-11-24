"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"
import { useTranslations } from "next-intl"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const t = useTranslations("CheckoutFlowTotals")
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{t("subtotal")}</span>
        <span className="text-foreground" data-testid="cart-subtotal" data-value={item_subtotal || 0}>
          {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{t("shipping")}</span>
        <span className="text-foreground" data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
          {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
        </span>
      </div>
      {!!discount_subtotal && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("discount")}</span>
          <span
            className="text-green-600"
            data-testid="cart-discount"
            data-value={discount_subtotal || 0}
          >
            -{convertToLocale({ amount: discount_subtotal ?? 0, currency_code })}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{t("taxes")}</span>
        <span className="text-foreground" data-testid="cart-taxes" data-value={tax_total || 0}>
          {convertToLocale({ amount: tax_total ?? 0, currency_code })}
        </span>
      </div>
      <div className="border-t border-border/40 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">{t("total")}</span>
          <span
            className="font-serif text-lg font-light text-foreground"
            data-testid="cart-total"
            data-value={total || 0}
          >
            {convertToLocale({ amount: total ?? 0, currency_code })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CartTotals
