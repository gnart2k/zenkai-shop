"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

type InfoRow = { key: string; label: string; value: string; wide?: boolean }

const useInfoRows = (product: HttpTypes.StoreProduct): InfoRow[] => {
  const t = useTranslations("ShopProduct")
  const locale = useLocale()
  const rows: InfoRow[] = []

  const add = (key: string, label: string, value?: string | null, wide?: boolean) => {
    const v = value?.toString().trim()
    if (v && v !== "-") {
      rows.push({ key, label, value: v, wide })
    }
  }

  let origin: string | undefined = product.origin_country?.trim()
  if (origin) {
    try {
      origin =
        new Intl.DisplayNames([locale], { type: "region" }).of(
          origin.toUpperCase()
        ) ?? origin
    } catch {
      // keep the raw value
    }
  }

  add("material", t("material"), product.material)
  add("origin", t("origin"), origin)
  add("type", t("type"), product.type?.value)
  add(
    "weight",
    t("weight"),
    product.weight ? t("weightValue", { weight: product.weight }) : null
  )
  add(
    "dimensions",
    t("dimensions"),
    product.length && product.width && product.height
      ? t("dimensionsValue", {
          length: product.length,
          width: product.width,
          height: product.height,
        })
      : null,
    true
  )

  return rows
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const t = useTranslations("ShopProduct")
  const rows = useInfoRows(product)
  const hasInfo = rows.length > 0
  const [selectedTab, setActiveTab] = useState<"info" | "shipping">("info")
  const activeTab = hasInfo ? selectedTab : "shipping"

  return (
    <div>
      <div className="flex border-b border-border/40">
        {hasInfo && (
          <button
            onClick={() => setActiveTab("info")}
            className={cn(
              "pb-2 text-sm transition-colors",
              activeTab === "info"
                ? "border-b border-foreground font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("tabInfo")}
          </button>
        )}
        <button
          onClick={() => setActiveTab("shipping")}
          className={cn(
            hasInfo && "ml-6",
            "pb-2 text-sm transition-colors",
            activeTab === "shipping"
              ? "border-b border-foreground font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("tabShipping")}
        </button>
      </div>

      <div className="py-6">
        {activeTab === "info" && <ProductInfoTab rows={rows} />}
        {activeTab === "shipping" && <ShippingInfoTab />}
      </div>
    </div>
  )
}

const ProductInfoTab = ({ rows }: { rows: InfoRow[] }) => {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
      {rows.map((row) => (
        <div key={row.key} className={row.wide ? "col-span-2" : undefined}>
          <span className="text-xs font-medium text-muted-foreground">
            {row.label}
          </span>
          <p className="mt-1 text-foreground">{row.value}</p>
        </div>
      ))}
    </div>
  )
}

const ShippingInfoTab = () => {
  const t = useTranslations("ShopProduct")
  const items = [
    ["shipDeliveryTitle", "shipDeliveryBody"],
    ["shipPackTitle", "shipPackBody"],
    ["shipExchangeTitle", "shipExchangeBody"],
  ] as const

  return (
    <div className="space-y-6 text-sm">
      {items.map(([title, body]) => (
        <div key={title}>
          <h4 className="font-medium text-foreground">{t(title)}</h4>
          <p className="mt-1 text-muted-foreground">{t(body)}</p>
        </div>
      ))}
    </div>
  )
}

export default ProductTabs
