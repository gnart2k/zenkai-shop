"use client"

import { Radio, RadioGroup } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, clx, Heading, Text } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import MedusaRadio from "@modules/common/components/radio"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  buildShippingMethodData,
  filterVnStandardShippingMethods,
  getDisplayAmountForShippingOption,
  splitShippingOptions,
  type ShippingOptionWithZone,
  useShippingPricing,
  VN_DEFAULT_GHN_SHIPPING_TYPE_CODE,
} from "./shipping-pricing"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"
const SHIPPING_TRACE_PREFIX = "[GHN][checkout/shipping]"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[]
  /** True when SSR GET /store/shipping-options failed (null); client refetch may recover */
  serverShippingOptionsFailed?: boolean
}

const formatAddress = (address?: HttpTypes.StoreCartAddress) => {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += address.address_1
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.city) {
    ret += `, ${address.city}`
  }

  if (address.province) {
    ret += `, ${address.province}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
  serverShippingOptionsFailed = false,
}) => {
  /** Client refetch: options depend on shipping address / geo zones; SSR often runs before address exists. */
  const [clientShippingOptions, setClientShippingOptions] = useState<
    HttpTypes.StoreCartShippingOption[] | null
  >(null)
  const [isLoadingShippingOptions, setIsLoadingShippingOptions] = useState(
    () => availableShippingMethods.length === 0 || serverShippingOptionsFailed
  )
  const [shippingOptionsFetchError, setShippingOptionsFetchError] = useState<
    string | null
  >(serverShippingOptionsFailed ? "Initial load failed; retrying…" : null)

  const addressFingerprint = useMemo(() => {
    const a = cart.shipping_address
    if (!a) {
      return "none"
    }
    return [
      a.country_code ?? "",
      a.address_1 ?? "",
      a.postal_code ?? "",
      JSON.stringify(a.metadata ?? {}),
    ].join("|")
  }, [cart.shipping_address])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoadingShippingOptions(true)
      setShippingOptionsFetchError(null)

      const opts = await listCartShippingMethods(cart.id)

      if (cancelled) {
        return
      }

      if (opts === null) {
        setClientShippingOptions([])
        setShippingOptionsFetchError(
          "Could not load shipping options. Check the browser Network tab for GET /store/shipping-options and verify x-publishable-api-key."
        )
      } else {
        setClientShippingOptions(opts)
        console.info(`${SHIPPING_TRACE_PREFIX} client refetch shipping options`, {
          cartId: cart.id,
          count: opts.length,
          addressFingerprint,
        })
      }

      setIsLoadingShippingOptions(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [cart.id, addressFingerprint])

  const [isLoading, setIsLoading] = useState(false)
  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isOpen = searchParams.get("step") === "delivery"

  const shippingOptions = useMemo(() => {
    const merged =
      clientShippingOptions !== null
        ? clientShippingOptions
        : availableShippingMethods
    return merged as ShippingOptionWithZone[]
  }, [availableShippingMethods, clientShippingOptions])
  const { shippingMethods, pickupMethods } = useMemo(
    () => splitShippingOptions(shippingOptions),
    [shippingOptions]
  )

  const hasPickupOptions = pickupMethods.length > 0

  const isVnShipToAddress =
    cart.shipping_address?.country_code?.toLowerCase() === "vn" &&
    showPickupOptions !== PICKUP_OPTION_ON

  const shippingMethodsForDelivery = useMemo(
    () => filterVnStandardShippingMethods(shippingMethods, isVnShipToAddress),
    [shippingMethods, isVnShipToAddress]
  )

  const {
    isLoadingPrices,
    calculatedPricesMap,
    calculatePriceErrorsByOptionId,
    packageMetrics,
    shouldUseGhnQuotes,
    ghnDistrictId,
    ghnWardCode,
    vnNeedsGhnAddressMetadata,
  } = useShippingPricing({
    cart,
    shippingMethods: shippingMethodsForDelivery,
  })

  useEffect(() => {
    setShippingMethodId(cart.shipping_methods?.at(-1)?.shipping_option_id || null)
  }, [cart.shipping_methods])

  useEffect(() => {
    if (pickupMethods.some((method) => method.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [pickupMethods, shippingMethodId])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSetShippingMethod = useCallback(
    async (id: string, source: "pickup" | "shipping") => {
      setError(null)
      setIsLoading(true)
      let previousMethodId: string | null = null

      setShippingMethodId((previousId) => {
        previousMethodId = previousId
        return id
      })

      const shippingMethodData = buildShippingMethodData({
        shouldUseGhnQuotes,
        ghnDistrictId,
        ghnWardCode,
        packageMetrics,
      })

      console.info(`${SHIPPING_TRACE_PREFIX} setShippingMethod:start`, {
        id,
        source,
        shouldUseGhnQuotes,
        ghnDistrictId: Number.isNaN(ghnDistrictId) ? null : ghnDistrictId,
        ghnWardCode: ghnWardCode || null,
        shippingMethodData,
      })

      try {
        await setShippingMethod({
          cartId: cart.id,
          shippingMethodId: id,
          data: shippingMethodData as Record<string, unknown> | undefined,
        })

        console.info(`${SHIPPING_TRACE_PREFIX} setShippingMethod:success`, {
          id,
          source,
        })
        setShowPickupOptions(
          source === "pickup" ? PICKUP_OPTION_ON : PICKUP_OPTION_OFF
        )
        // Re-fetch checkout server data so cart shipping totals stay in sync
        // when moving to the next step.
        router.refresh()
      } catch (err) {
        console.error(`${SHIPPING_TRACE_PREFIX} setShippingMethod:error`, {
          id,
          source,
          error: err instanceof Error ? err.message : String(err),
        })
        setShippingMethodId(previousMethodId)
        setError(err instanceof Error ? err.message : "An error occurred")
      }

      setIsLoading(false)
    },
    [
      cart.id,
      shouldUseGhnQuotes,
      ghnDistrictId,
      ghnWardCode,
      packageMetrics,
    ]
  )

  /** Vietnam + ship: select GHN Standard once quotes allow (replaces other tiers left on the cart). */
  useEffect(() => {
    if (!isVnShipToAddress) {
      return
    }

    if (isLoadingShippingOptions || shippingOptionsFetchError) {
      return
    }

    if (isLoading) {
      return
    }

    const standard = shippingMethodsForDelivery.find(
      (option) =>
        option.type?.code === VN_DEFAULT_GHN_SHIPPING_TYPE_CODE ||
        option.name === "GHN Standard"
    )

    if (!standard) {
      return
    }

    const isStandardDisabled =
      standard.price_type === "calculated" &&
      !isLoadingPrices &&
      getDisplayAmountForShippingOption(standard, calculatedPricesMap) === null

    if (isStandardDisabled) {
      return
    }

    if (shippingMethodId === standard.id) {
      return
    }

    void handleSetShippingMethod(standard.id, "shipping")
  }, [
    isVnShipToAddress,
    isLoadingShippingOptions,
    shippingOptionsFetchError,
    isLoading,
    shippingMethodsForDelivery,
    isLoadingPrices,
    calculatedPricesMap,
    shippingMethodId,
    handleSetShippingMethod,
  ])

  const selectedShippingOption =
    shippingOptions.length
      ? shippingOptions.find(
          (option) =>
            option.id ===
            (shippingMethodId ?? cart.shipping_methods?.[0]?.shipping_option_id)
        )
      : null

  const selectedShippingAmount =
    cart.shipping_methods?.at(-1)?.total ??
    (selectedShippingOption
      ? getDisplayAmountForShippingOption(selectedShippingOption, calculatedPricesMap)
      : null)

  return (
    <div className="border-b border-gray-200 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Heading level="h2" className="flex items-baseline gap-x-2 text-3xl-regular">
          Delivery
          {!isOpen && selectedShippingOption && <CheckCircleSolid />}
        </Heading>
        {!isOpen && selectedShippingOption && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-delivery-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>

      {!isOpen && selectedShippingOption && cart.shipping_methods?.length ? (
        <div className="text-small-regular">
          <div className="flex items-center gap-x-8">
            <Text className="txt-medium-plus text-ui-fg-base">
              {selectedShippingOption.name}
            </Text>
            <Text className="txt-medium-plus text-ui-fg-base">
              {convertToLocale({
                amount: selectedShippingAmount ?? 0,
                currency_code: cart.currency_code,
              })}
            </Text>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid gap-y-6">
            {isLoadingShippingOptions && (
              <div className="flex items-center gap-2 text-ui-fg-subtle">
                <Loader />
                <Text size="small">Loading delivery options…</Text>
              </div>
            )}
            {shippingOptionsFetchError && (
              <ErrorMessage error={shippingOptionsFetchError} />
            )}
            {!isLoadingShippingOptions &&
              !shippingOptionsFetchError &&
              shippingMethods.length === 0 &&
              pickupMethods.length === 0 && (
                <Text size="small" className="text-ui-fg-subtle">
                  {!cart.shipping_address ? (
                    <>
                      Save a shipping address in the step above. Medusa only
                      returns options after the cart has a shipping address and
                      it matches a fulfillment geo zone.
                    </>
                  ) : (
                    <>
                      No shipping methods match this cart yet. Confirm the
                      address, then check Admin: stock location ↔ sales channel,
                      shipping profile on products, and fulfillment sets / zones
                      for region{" "}
                      <span className="font-mono">
                        {cart.region?.name ?? cart.region_id}
                      </span>
                      .
                    </>
                  )}
                </Text>
              )}
            <RadioGroup value={shippingMethodId} data-testid="delivery-options-radio-group">
              <div className="grid grid-cols-1 gap-4">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={(value) => {
                      if (isLoading) {
                        return
                      }

                      if (value === PICKUP_OPTION_OFF) {
                        setShowPickupOptions(PICKUP_OPTION_OFF)
                        return
                      }

                      const firstPickupOption = pickupMethods.find(
                        (option) => !option.insufficient_inventory
                      )?.id

                      if (firstPickupOption) {
                        handleSetShippingMethod(firstPickupOption, "pickup")
                      }
                    }}
                  >
                    <div className="grid grid-cols-1 gap-y-2">
                      <Radio value={PICKUP_OPTION_OFF} disabled={isLoading}>
                        {({ checked }) => (
                          <label className="flex cursor-pointer items-start gap-x-3 border border-ui-border-base p-4">
                            <MedusaRadio
                              checked={
                                showPickupOptions !== PICKUP_OPTION_ON && checked
                              }
                            />
                            <span className="flex flex-col">
                              <span className="text-base-regular text-ui-fg-base">
                                Ship
                              </span>
                              <span className="text-ui-fg-subtle text-small-regular">
                                Ship to an address
                              </span>
                            </span>
                          </label>
                        )}
                      </Radio>
                      <Radio value={PICKUP_OPTION_ON} disabled={isLoading}>
                        {({ checked }) => (
                          <label className="flex cursor-pointer items-start gap-x-3 border border-ui-border-base p-4">
                            <MedusaRadio
                              checked={
                                showPickupOptions === PICKUP_OPTION_ON && checked
                              }
                            />
                            <span className="flex flex-col">
                              <span className="text-base-regular text-ui-fg-base">
                                Pick up in store
                              </span>
                              <span className="text-ui-fg-subtle text-small-regular">
                                Pick up from a nearby store
                              </span>
                            </span>
                          </label>
                        )}
                      </Radio>
                    </div>
                  </RadioGroup>
                )}

                <RadioGroup
                  value={shippingMethodId}
                  onChange={(value) => {
                    if (isLoading) {
                      return
                    }

                    if (value) {
                      return handleSetShippingMethod(value, "shipping")
                    }
                  }}
                  className={clx("flex flex-col gap-4", {
                    hidden: showPickupOptions === PICKUP_OPTION_ON,
                  })}
                >
                  {shippingMethodsForDelivery.map((option) => {
                    const displayAmount = getDisplayAmountForShippingOption(
                      option,
                      calculatedPricesMap
                    )
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      displayAmount === null

                    const quoteFailureMessage = vnNeedsGhnAddressMetadata
                      ? "For Vietnam, choose province, district, and ward above so GHN can quote this option."
                      : calculatePriceErrorsByOptionId[option.id] ||
                        "Shipping quote unavailable for this option."

                    return (
                      <div key={option.id} className="flex flex-col gap-y-2">
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={
                            isLoading || isDisabled || !!option.insufficient_inventory
                          }
                          className={clx(
                            "flex cursor-pointer items-center justify-between border border-ui-border-base p-4",
                            {
                              "bg-ui-bg-disabled text-ui-fg-disabled":
                                isDisabled || !!option.insufficient_inventory,
                            }
                          )}
                        >
                          {({ checked, disabled }) => (
                            <label
                              className={clx(
                                "flex w-full cursor-pointer items-start justify-between gap-x-4",
                                {
                                  "cursor-not-allowed": disabled,
                                }
                              )}
                            >
                              <div className="flex items-start gap-x-3">
                                <div
                                  className={clx(
                                    "relative flex h-5 w-5 items-center justify-center rounded-full border",
                                    {
                                      "border-ui-fg-base": checked,
                                      "border-ui-border-base": !checked,
                                    }
                                  )}
                                >
                                  {checked && (
                                    <div className="h-2.5 w-2.5 rounded-full bg-ui-fg-base" />
                                  )}
                                </div>
                                <span className="text-base-regular text-ui-fg-base">
                                  {option.name}
                                </span>
                              </div>
                              <span className="justify-self-end text-ui-fg-base">
                                {typeof displayAmount === "number" ? (
                                  convertToLocale({
                                    amount: displayAmount,
                                    currency_code: cart.currency_code,
                                  })
                                ) : isLoadingPrices ? (
                                  <Loader />
                                ) : (
                                  "-"
                                )}
                              </span>
                            </label>
                          )}
                        </Radio>
                        {isDisabled && (
                          <Text size="small" className="text-ui-fg-subtle">
                            {quoteFailureMessage}
                          </Text>
                        )}
                      </div>
                    )
                  })}
                </RadioGroup>

                {hasPickupOptions && (
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(value) => {
                      if (isLoading) {
                        return
                      }

                      if (value) {
                        return handleSetShippingMethod(value, "pickup")
                      }
                    }}
                    className={clx("flex flex-col gap-4", {
                      hidden: showPickupOptions !== PICKUP_OPTION_ON,
                    })}
                  >
                    {pickupMethods.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={isLoading || !!option.insufficient_inventory}
                          className="flex cursor-pointer items-center justify-between border border-ui-border-base p-4"
                        >
                          {({ checked, disabled }) => (
                            <label
                              className={clx(
                                "flex w-full cursor-pointer items-start justify-between gap-x-4",
                                {
                                  "cursor-not-allowed": disabled,
                                }
                              )}
                            >
                              <div className="flex items-start gap-x-3">
                                <div
                                  className={clx(
                                    "relative flex h-5 w-5 items-center justify-center rounded-full border",
                                    {
                                      "border-ui-fg-base": checked,
                                      "border-ui-border-base": !checked,
                                    }
                                  )}
                                >
                                  {checked && (
                                    <div className="h-2.5 w-2.5 rounded-full bg-ui-fg-base" />
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-base-regular text-ui-fg-base">
                                    {option.name}
                                  </span>
                                  <span className="text-base-regular text-ui-fg-muted">
                                    {formatAddress(
                                      option.service_zone?.fulfillment_set?.location
                                        ?.address
                                    )}
                                  </span>
                                </div>
                              </div>
                            </label>
                          )}
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                )}
              </div>
            </RadioGroup>

            <ErrorMessage error={error} data-testid="delivery-option-error-message" />

            <Button
              onClick={() => {
                router.push(pathname + "?step=payment", { scroll: false })
              }}
              disabled={!shippingMethodId || isLoading}
              isLoading={isLoading}
              data-testid="submit-delivery-option-button"
            >
              Continue to payment
            </Button>
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
