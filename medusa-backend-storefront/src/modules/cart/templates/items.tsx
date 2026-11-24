import { useTranslations } from "next-intl"
import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const t = useTranslations("ShopCart")
  const items = cart?.items
  return (
    <div>
      <h1 className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-8">
        <div className="hidden border-b border-border/40 pb-3 small:grid small:grid-cols-[80px_1fr_120px_100px_100px] small:gap-4">
          <span className="text-xs font-medium text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {t("colItem")}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {t("colQuantity")}
          </span>
          <span className="text-right text-xs font-medium text-muted-foreground">
            {t("colPrice")}
          </span>
          <span className="text-right text-xs font-medium text-muted-foreground">
            {t("colTotal")}
          </span>
        </div>

        <div>
          {items
            ? items
                .sort((a, b) =>
                  (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                )
                .map((item) => (
                  <Item
                    key={item.id}
                    item={item}
                    currencyCode={cart?.currency_code}
                  />
                ))
            : repeat(5).map((i) => <SkeletonLineItem key={i} />)}
        </div>
      </div>
    </div>
  )
}

export default ItemsTemplate
