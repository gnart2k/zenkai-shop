"use client"

import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  const maxQtyFromInventory = 10
  const maxQuantity = item.variant?.manage_inventory ? 10 : maxQtyFromInventory

  if (type === "full") {
    return (
      <div className="flex gap-4 border-b border-border/40 py-6 last:border-b-0">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="w-20 shrink-0 small:w-24"
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
          />
        </LocalizedClientLink>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <LocalizedClientLink
                href={`/products/${item.product_handle}`}
                className="text-sm font-medium text-foreground transition-colors hover:text-foreground/70"
              >
                {item.product_title}
              </LocalizedClientLink>
              <LineItemOptions
                variant={item.variant}
                data-testid="product-variant"
              />
            </div>
            <LineItemPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </div>

          <div className="flex items-center gap-3">
            <DeleteButton id={item.id} data-testid="product-delete-button" />
            <CartItemSelect
              value={item.quantity}
              onChange={(value) =>
                changeQuantity(parseInt(value.target.value))
              }
              className="h-9 w-16 rounded-none border border-border bg-transparent px-2 text-sm"
              data-testid="product-select-button"
            >
              {Array.from(
                { length: Math.min(maxQuantity, 10) },
                (_, i) => (
                  <option value={i + 1} key={i}>
                    {i + 1}
                  </option>
                )
              )}
            </CartItemSelect>
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 py-4">
      <LocalizedClientLink
        href={`/products/${item.product_handle}`}
        className="w-16 shrink-0"
      >
        <Thumbnail
          thumbnail={item.thumbnail}
          images={item.variant?.product?.images}
          size="square"
        />
      </LocalizedClientLink>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="text-sm text-foreground">{item.product_title}</span>
        <span className="text-xs text-muted-foreground">
          {item.quantity}x{" "}
          <LineItemUnitPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>
      </div>
      <LineItemPrice
        item={item}
        style="tight"
        currencyCode={currencyCode}
      />
    </div>
  )
}

export default Item
