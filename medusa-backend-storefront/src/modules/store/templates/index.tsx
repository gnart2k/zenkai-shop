import { useTranslations } from "next-intl"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import ListingShell from "@modules/store/templates/listing-shell"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const t = useTranslations("ShopStore")
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className="content-container py-8 small:py-12">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">
          {t("heading")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subheading")}
        </p>
      </div>

      <ListingShell sortBy={sort}>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
          />
        </Suspense>
      </ListingShell>
    </div>
  )
}

export default StoreTemplate
