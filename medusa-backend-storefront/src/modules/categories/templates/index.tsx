import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import ListingShell from "@modules/store/templates/listing-shell"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  return (
    <div className="content-container py-8 small:py-12">
      <div className="mb-8">
        {parents.length > 0 && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            {parents.map((parent) => (
              <span key={parent.id} className="flex items-center gap-2">
                <LocalizedClientLink
                  href={`/categories/${parent.handle}`}
                  className="transition-colors hover:text-foreground"
                >
                  {parent.name}
                </LocalizedClientLink>
                <span>/</span>
              </span>
            ))}
          </div>
        )}
        <h1 className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {category.description}
          </p>
        )}
        {category.category_children && category.category_children.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {category.category_children.map((c) => (
              <LocalizedClientLink
                key={c.id}
                href={`/categories/${c.handle}`}
                className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                {c.name}
              </LocalizedClientLink>
            ))}
          </div>
        )}
      </div>

      <ListingShell sortBy={sort}>
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
          />
        </Suspense>
      </ListingShell>
    </div>
  )
}
