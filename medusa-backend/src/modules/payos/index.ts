import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PayOSPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [PayOSPaymentProviderService],
})
