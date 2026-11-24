import { zaloHref, telHref } from "@lib/storefront/contact"
import type { ContactWidgetConfig } from "@lib/storefront/templates"
import { getTranslations } from "next-intl/server"
import { Phone } from "lucide-react"

/**
 * Floating Call + Zalo buttons for Vietnamese shoppers. The owner turns it on, sets the
 * numbers and side in the editor; "Vietnam only" limits it to the /vn region.
 */
export default async function ContactWidget({
  config,
  countryCode,
}: {
  config: ContactWidgetConfig
  countryCode: string
}) {
  if (!config.enabled) return null
  if (config.vn_only && countryCode.toLowerCase() !== "vn") return null

  const tel = config.phone ? telHref(config.phone) : null
  const zalo = config.zalo ? zaloHref(config.zalo) : null
  if (!tel && !zalo) return null

  const t = await getTranslations("ShopLayout.contactWidget")
  const side = config.position === "left" ? "left-4" : "right-4"

  return (
    <div
      data-contact-widget
      data-position={config.position}
      // Sits above the mobile add-to-cart bar when that bar is showing.
      className={`fixed bottom-4 ${side} z-40 flex flex-col gap-3 print:hidden [body:has([data-sticky-cta])_&]:bottom-28 lg:[body:has([data-sticky-cta])_&]:bottom-4`}
    >
      {zalo && (
        <a
          href={zalo}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("zalo")}
          data-contact="zalo"
          className="flex size-12 items-center justify-center rounded-full bg-[#0068ff] text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Zalo
        </a>
      )}
      {tel && (
        <a
          href={tel}
          aria-label={t("call")}
          data-contact="call"
          className="flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Phone className="size-5" aria-hidden />
        </a>
      )}
    </div>
  )
}
