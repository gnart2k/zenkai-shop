"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { money } from "./ui"

type Labels = {
  suggestedPrice: string
  suggestedHint: string
  originalPrice: string
  originalHint: string
  originalCost: string
  costHint: string
  stockLabel: string
  stockHint: string
  previewCollab: string // contains {amount}
  previewStore: string // contains {amount}
  invalid: string
}

/**
 * The three prices of one variant with a live check of cost <= original <= suggested
 * and a preview of who earns what. Field names get a suffix so one form can hold many variants.
 */
export function PricingFields({
  suffix = "",
  currency,
  locale,
  labels,
  initial,
  showStock = true,
}: {
  suffix?: string
  currency: string
  locale: string
  labels: Labels
  initial: { price?: number | null; original?: number | null; cost?: number | null; quantity?: number | null }
  showStock?: boolean
}) {
  const [price, setPrice] = useState(initial.price != null ? String(initial.price) : "")
  const [original, setOriginal] = useState(initial.original != null ? String(initial.original) : "")
  const [cost, setCost] = useState(initial.cost != null ? String(initial.cost) : "")

  const p = Number(price) || 0
  const o = original === "" ? p : Number(original)
  const c = cost === "" ? null : Number(cost)
  const valid = p > 0 && o <= p && (c === null || c <= o)
  const fmt = (n: number) => money(n, currency, locale)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`price${suffix}`}>
            {labels.suggestedPrice} ({currency.toUpperCase()})
          </Label>
          <Input
            id={`price${suffix}`}
            name={`price${suffix}`}
            type="number"
            min={1}
            step="any"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{labels.suggestedHint}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`original_price${suffix}`}>
            {labels.originalPrice} ({currency.toUpperCase()})
          </Label>
          <Input
            id={`original_price${suffix}`}
            name={`original_price${suffix}`}
            type="number"
            min={0}
            step="any"
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{labels.originalHint}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`original_cost${suffix}`}>
            {labels.originalCost} ({currency.toUpperCase()})
          </Label>
          <Input
            id={`original_cost${suffix}`}
            name={`original_cost${suffix}`}
            type="number"
            min={0}
            step="any"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{labels.costHint}</p>
        </div>
      </div>

      {p > 0 ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            valid ? "bg-muted/40 text-muted-foreground" : "border-destructive/40 bg-destructive/5 text-destructive"
          }`}
          aria-live="polite"
        >
          {valid ? (
            <ul className="space-y-0.5">
              <li>{labels.previewCollab.replace("{amount}", fmt(p - o))}</li>
              {c !== null ? <li>{labels.previewStore.replace("{amount}", fmt(o - c))}</li> : null}
            </ul>
          ) : (
            labels.invalid
          )}
        </div>
      ) : null}

      {showStock ? (
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor={`quantity${suffix}`}>{labels.stockLabel}</Label>
          <Input
            id={`quantity${suffix}`}
            name={`quantity${suffix}`}
            type="number"
            min={0}
            step={1}
            defaultValue={initial.quantity ?? undefined}
          />
          <p className="text-xs text-muted-foreground">{labels.stockHint}</p>
        </div>
      ) : null}
    </div>
  )
}
