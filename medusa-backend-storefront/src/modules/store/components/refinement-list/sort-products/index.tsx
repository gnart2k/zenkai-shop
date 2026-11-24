"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: SortOptions) => void
  /** Toolbar layout (used by themes with a top filter bar) instead of the sidebar list. */
  horizontal?: boolean
  "data-testid"?: string
}

const sortOptions = [
  { value: "created_at" as const, labelKey: "sortLatest" as const },
  { value: "price_asc" as const, labelKey: "sortPriceAsc" as const },
  { value: "price_desc" as const, labelKey: "sortPriceDesc" as const },
]

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
  horizontal,
}: SortProductsProps) => {
  const t = useTranslations("ShopStore")
  if (horizontal) {
    return (
      <div data-testid={dataTestId} className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted-foreground">{t("sortBy")}</span>
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setQueryParams("sortBy", option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              sortBy === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div data-testid={dataTestId}>
      <h3 className="mb-3 text-xs font-medium text-muted-foreground">
        {t("sortBy")}
      </h3>
      <div className="space-y-1">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setQueryParams("sortBy", option.value)}
            className={cn(
              "block w-full rounded px-3 py-2 text-left text-sm transition-colors",
              sortBy === option.value
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SortProducts
