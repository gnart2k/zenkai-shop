import { Link } from "@/i18n/navigation"
import type { ReactNode } from "react"

/**
 * Link for owner-entered URLs. Paths like /store keep the shopper's locale and country;
 * https:, tel: and mailto: links are plain anchors (the backend only lets those through).
 */
export default function SmartLink({
  href,
  countryCode,
  className,
  children,
}: {
  href: string
  countryCode: string
  className?: string
  children: ReactNode
}) {
  if (/^\/(?!\/)/.test(href)) {
    return (
      <Link href={`/${countryCode}${href}`} className={className}>
        {children}
      </Link>
    )
  }
  const external = /^https?:/i.test(href)
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </a>
  )
}
