import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { paymentsEnabled } from "@lib/util/payments"
import { cartRequiresShipping } from "@lib/util/physical-variant"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import PaymentsUnavailable from "@modules/checkout/components/payments-unavailable"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const requiresShipping = cartRequiresShipping(cart)

  /** Initial SSR fetch; Medusa often returns [] until a shipping address exists — Shipping refetches on the client. */
  const shippingMethods = requiresShipping
    ? await listCartShippingMethods(cart.id)
    : []
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!paymentMethods) {
    return null
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      {requiresShipping ? (
        <Shipping
          cart={cart}
          availableShippingMethods={shippingMethods ?? []}
          serverShippingOptionsFailed={shippingMethods === null}
        />
      ) : null}

      {paymentsEnabled() ? (
        <>
          <Payment
            cart={cart}
            availablePaymentMethods={paymentMethods}
            requiresShipping={requiresShipping}
          />

          <Review cart={cart} />
        </>
      ) : (
        <PaymentsUnavailable />
      )}
    </div>
  )
}
