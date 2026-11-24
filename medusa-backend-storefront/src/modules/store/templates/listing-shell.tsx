import type { ReactNode } from "react"

import { getStorefront } from "@lib/data/storefront-config"
import RefinementList from "@modules/store/components/refinement-list"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

/**
 * Body of every product listing (store, category, collection). The theme decides whether
 * the sort/filter controls sit in a sidebar or in a toolbar above the grid.
 */
export default async function ListingShell({
  sortBy,
  children,
}: {
  sortBy: SortOptions
  children: ReactNode
}) {
  const { layout } = await getStorefront()

  if (layout.listing === "topbar") {
    return (
      <div data-listing="topbar">
        <div className="mb-6 flex items-center justify-end border-y py-3">
          <RefinementList sortBy={sortBy} horizontal />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 small:flex-row" data-listing="sidebar">
      <div className="w-full shrink-0 small:w-56">
        <RefinementList sortBy={sortBy} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
