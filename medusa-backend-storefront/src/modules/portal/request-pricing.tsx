"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { money } from "./ui"

/** Quantity + selling price for a collaborator request, with a live profit preview. */
export function RequestPricing({
  currency,
  locale,
  originalPrice,
  initialPrice,
  labels,
}: {
  currency: string
  locale: string
  originalPrice: number
  initialPrice: number
  labels: {
    quantity: string
    sellingPrice: string
    sellingPriceHint: string
    profit: string // {amount}
    total: string // {amount}
    tooLow: string
  }
}) {
  const [qty, setQty] = useState("1")
  const [price, setPrice] = useState(String(initialPrice))
  const q = Math.max(Number(qty) || 0, 0)
  const p = Number(price) || 0
  const low = p < originalPrice
  const fmt = (n: number) => money(n, currency, locale)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="quantity">{labels.quantity}</Label>
          <Input id="quantity" name="quantity" type="number" min={1} step={1} required value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commercial_price">{labels.sellingPrice}</Label>
          <Input id="commercial_price" name="commercial_price" type="number" min={0} step="any" required value={price} onChange={(e) => setPrice(e.target.value)} />
          <p className="text-xs text-muted-foreground">{labels.sellingPriceHint}</p>
        </div>
      </div>
      <div
        className={`rounded-md border px-3 py-2 text-sm ${low ? "border-destructive/40 bg-destructive/5 text-destructive" : "bg-muted/40"}`}
        aria-live="polite"
      >
        {low ? (
          labels.tooLow
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="font-medium text-emerald-700">{labels.profit.replace("{amount}", fmt((p - originalPrice) * q))}</span>
            <span className="text-muted-foreground">{labels.total.replace("{amount}", fmt(p * q))}</span>
          </div>
        )}
      </div>
    </div>
  )
}
