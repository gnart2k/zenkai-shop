"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCartId,
  revalidateScopedTag,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion, tryRetrieveRegion } from "./regions"
import { getLocale } from "@lib/data/locale-actions"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, *items.product.metadata, *items.variant, *items.variant.metadata, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name, +shipping_methods.data, +shipping_address.metadata, +billing_address.metadata"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ cart: c }: { cart: HttpTypes.StoreCart }) => c)
    .catch(() => null)

  if (cart?.region_id) {
    const stillValid = await tryRetrieveRegion(cart.region_id)
    if (!stillValid) {
      await removeCartId()
      return null
    }
  }

  return cart
}

/**
 * Checkout must see the latest shipping_address (GHN metadata) after the address step.
 * The default retrieveCart uses force-cache and can briefly serve a stale cart without
 * `shipping_address.metadata`, which breaks GHN calculated shipping quotes.
 */
export async function retrieveCartCheckoutFresh() {
  const id = await getCartId()
  const fields =
    "*items, *region, *items.product, *items.product.metadata, *items.variant, *items.variant.metadata, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name, +shipping_methods.data, +shipping_address.metadata, +billing_address.metadata"

  if (!id) {
    console.info("[GHN][trace] retrieveCartCheckoutFresh:no cart cookie")
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: { fields },
      headers,
      cache: "no-store",
    })
    .then(({ cart: c }: { cart: HttpTypes.StoreCart }) => c)
    .catch(() => null)

  if (!cart) {
    console.warn("[GHN][trace] retrieveCartCheckoutFresh:fetch failed", {
      cartId: id,
    })
    return null
  }

  if (cart.region_id) {
    const stillValid = await tryRetrieveRegion(cart.region_id)
    if (!stillValid) {
      await removeCartId()
      console.info("[GHN][trace] retrieveCartCheckoutFresh:region invalid", {
        cartId: id,
        regionId: cart.region_id,
      })
      return null
    }
  }

  const meta = cart.shipping_address?.metadata as
    | Record<string, unknown>
    | undefined
  console.info("[GHN][trace] retrieveCartCheckoutFresh", {
    cartId: id,
    regionId: cart.region_id ?? null,
    emailSet: Boolean(cart.email),
    shippingCountry: cart.shipping_address?.country_code ?? null,
    hasShippingAddress: Boolean(cart.shipping_address),
    ghn_province_id: meta?.ghn_province_id ?? null,
    ghn_district_id: meta?.ghn_district_id ?? null,
    ghn_ward_code: meta?.ghn_ward_code ?? null,
  })

  return cart
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id")

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    await revalidateScopedTag("carts")
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    await revalidateScopedTag("carts")
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      await revalidateScopedTag("carts")
      await revalidateScopedTag("fulfillment")

      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      await revalidateScopedTag("carts")
      await revalidateScopedTag("fulfillment")
    })
    .catch(medusaError)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      await revalidateScopedTag("carts")
      await revalidateScopedTag("fulfillment")
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      await revalidateScopedTag("carts")
      await revalidateScopedTag("fulfillment")
    })
    .catch(medusaError)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
  data,
}: {
  cartId: string
  shippingMethodId: string
  data?: Record<string, unknown>
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  console.info("[GHN][setShippingMethod] payload", {
    cartId,
    shippingMethodId,
    carrier: (data?.carrier as string | undefined) || null,
    to_district_id: (data?.to_district_id as number | undefined) || null,
    to_ward_code: (data?.to_ward_code as string | undefined) || null,
    service_id: (data?.service_id as number | undefined) || null,
    quoted_fee: (data?.quoted_fee as number | undefined) || null,
  })

  return sdk.store.cart
    .addShippingMethod(
      cartId,
      { option_id: shippingMethodId, data },
      {},
      headers
    )
    .then(async () => {
      await revalidateScopedTag("carts")
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      await revalidateScopedTag("carts")
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      await revalidateScopedTag("carts")
      await revalidateScopedTag("fulfillment")
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart")
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

const getFormStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key)

  return typeof value === "string" ? value.trim() : ""
}

const getGhnAddressMetadata = (formData: FormData, prefix: string) => {
  const ghnProvinceId = getFormStringValue(
    formData,
    `${prefix}.metadata.ghn_province_id`
  )
  const ghnDistrictId = getFormStringValue(
    formData,
    `${prefix}.metadata.ghn_district_id`
  )
  const ghnWardCode = getFormStringValue(
    formData,
    `${prefix}.metadata.ghn_ward_code`
  )

  const metadata: Record<string, string> = {}

  if (ghnProvinceId) {
    metadata.ghn_province_id = ghnProvinceId
  }

  if (ghnDistrictId) {
    metadata.ghn_district_id = ghnDistrictId
  }

  if (ghnWardCode) {
    metadata.ghn_ward_code = ghnWardCode
  }

  return Object.keys(metadata).length ? metadata : undefined
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = await getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const shippingAddressMetadata = getGhnAddressMetadata(
      formData,
      "shipping_address"
    )
    const shippingAddress = {
      first_name: formData.get("shipping_address.first_name"),
      last_name: formData.get("shipping_address.last_name"),
      address_1: formData.get("shipping_address.address_1"),
      address_2: formData.get("shipping_address.address_2") || "",
      company: formData.get("shipping_address.company"),
      postal_code: formData.get("shipping_address.postal_code"),
      city: formData.get("shipping_address.city"),
      country_code: formData.get("shipping_address.country_code"),
      province: formData.get("shipping_address.province"),
      phone: formData.get("shipping_address.phone"),
      metadata: shippingAddressMetadata,
    }

    const data = {
      shipping_address: shippingAddress,
      email: formData.get("email"),
    } as any

    const shippingCountryCode = String(
      formData.get("shipping_address.country_code") || ""
    ).toLowerCase()
    const shippingRegion = shippingCountryCode
      ? await getRegion(shippingCountryCode)
      : null

    if (shippingRegion?.id) {
      data.region_id = shippingRegion.id
    }

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = data.shipping_address

    if (sameAsBilling !== "on") {
      const billingAddressMetadata = getGhnAddressMetadata(
        formData,
        "billing_address"
      )
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: formData.get("billing_address.address_2") || "",
        company: formData.get("billing_address.company"),
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: formData.get("billing_address.phone"),
        metadata: billingAddressMetadata,
      }
    }

    console.info("[GHN][trace] setAddresses:resolved metadata", {
      shipping_country_code: data?.shipping_address?.country_code || null,
      shipping_region_id: data?.region_id || null,
      shipping_city: data?.shipping_address?.city || null,
      shipping_province: data?.shipping_address?.province || null,
      shipping_metadata: data?.shipping_address?.metadata || null,
      billing_metadata: data?.billing_address?.metadata || null,
      same_as_billing: sameAsBilling === "on",
    })

    await updateCart(data)
    console.info("[GHN][trace] setAddresses:updateCart done, redirecting", {
      cartId,
    })
  } catch (e: any) {
    return e.message
  }

  const { getUiLocale } = await import("@lib/i18n/server-locale")
  const locale = await getUiLocale()
  const cc = String(formData.get("shipping_address.country_code")).toLowerCase()
  redirect(`/${locale}/${cc}/checkout?step=delivery`)
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      await revalidateScopedTag("carts")
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase()

    await revalidateScopedTag("orders")

    removeCartId()
    const { getUiLocale } = await import("@lib/i18n/server-locale")
    const locale = await getUiLocale()
    redirect(`/${locale}/${countryCode}/order/${cartRes?.order.id}/confirmed`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(
  countryCode: string,
  currentPath: string,
  locale?: string
) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
  }

  await revalidateScopedTag("regions")
  await revalidateScopedTag("products")

  const { getUiLocale } = await import("@lib/i18n/server-locale")
  const loc = locale ?? (await getUiLocale())
  redirect(`/${loc}/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}
