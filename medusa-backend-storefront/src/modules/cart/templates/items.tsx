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
