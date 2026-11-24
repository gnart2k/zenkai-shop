import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  return (
    <div className="content-container py-8 small:py-12" data-testid="cart-container">
      {cart?.items?.length ? (
        <div className="grid gap-12 small:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-y-6">
            {!customer && (
              <>
                <SignInPrompt />
                <Divider />
              </>
            )}
            <ItemsTemplate cart={cart} />
          </div>
          <div className="small:sticky small:top-24 small:self-start">
            {cart && cart.region && <Summary cart={cart as any} />}
          </div>
        </div>
      ) : (
        <EmptyCartMessage />
      )}
    </div>
  )
}

export default CartTemplate
