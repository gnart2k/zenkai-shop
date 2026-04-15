"use client"

import React from "react"
import { useParams } from "next/navigation"

import { Link } from "@/i18n/navigation"

/**
 * Next.js `<Link />` that keeps the current locale and Medusa country segment in the URL.
 * `href` is the path after country (e.g. `/store`, `/products/handle`).
 */
const LocalizedClientLink = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: () => void
  passHref?: true
  [x: string]: unknown
}) => {
  const { countryCode } = useParams()

  return (
    <Link href={`/${countryCode as string}${href}`} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
