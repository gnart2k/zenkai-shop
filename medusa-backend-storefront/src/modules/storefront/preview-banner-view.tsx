"use client"

import { Eye } from "lucide-react"
import { useEffect, useState } from "react"

/**
 * The floating "you are previewing a draft" notice.
 *  - Wraps instead of squeezing on narrow screens (stacked: message, then actions).
 *  - Hidden when the page is embedded in the portal editor's iframe: the editor already
 *    shows the draft status, and a pill would only cover the page being checked.
 * It stays hidden until mounted so there is no flash of an unstyled/embedded banner.
 */
export default function PreviewBannerView({
  message,
  backLabel,
  backHref,
  exitLabel,
  exitHref,
}: {
  message: string
  backLabel: string
  backHref: string
  exitLabel: string
  exitHref: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Strip the signed token from the address bar (it is already in an httpOnly cookie).
    const url = new URL(window.location.href)
    if (url.searchParams.has("_preview")) {
      url.searchParams.delete("_preview")
      window.history.replaceState(null, "", url.pathname + url.search + url.hash)
    }
    setVisible(window.self === window.top)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] flex-col items-center gap-2 rounded-2xl border bg-foreground px-4 py-2.5 text-xs text-background shadow-xl small:flex-row small:gap-3 small:rounded-full"
      data-testid="preview-banner"
      role="status"
    >
      <span className="flex items-center gap-2 text-center font-medium">
        <Eye className="size-4 shrink-0" aria-hidden />
        {message}
      </span>
      <span className="flex items-center gap-3 whitespace-nowrap">
        <a className="rounded-full bg-background px-3 py-1 font-medium text-foreground" href={backHref}>
          {backLabel}
        </a>
        <a className="underline" href={exitHref}>
          {exitLabel}
        </a>
      </span>
    </div>
  )
}
