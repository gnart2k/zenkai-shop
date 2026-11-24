"use client"

import { Eye } from "lucide-react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()

  useEffect(() => {
    const embedded = window.self !== window.top
    setVisible(!embedded)

    // Live preview: the portal editor autosaves the draft, then tells this frame to re-render
    // the server components with it. router.refresh() keeps the scroll position and does not
    // reload the page. Only same-origin messages are honored.
    const onMessage = (e: MessageEvent) => {
      if (embedded && e.origin === window.location.origin && e.data?.type === "sf-refresh") router.refresh()
    }
    // Everything here lives under /preview/...; links in the pages point at the normal
    // storefront paths, so keep navigation inside /preview (never onto the live routes).
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return
      const u = new URL(a.href, window.location.href)
      if (u.origin !== window.location.origin) return
      if (/^\/(preview|api|_next|media|portal)(\/|$)/.test(u.pathname) || /^\/[a-z]{2}\/[a-z]{2}\/portal(\/|$)/.test(u.pathname)) return
      if (u.pathname === window.location.pathname.replace(/^\/preview/, "") && u.hash) return
      e.preventDefault()
      e.stopPropagation()
      router.push(`/preview${u.pathname}${u.search}${u.hash}`)
    }
    window.addEventListener("message", onMessage)
    document.addEventListener("click", onClick, true)
    return () => {
      window.removeEventListener("message", onMessage)
      document.removeEventListener("click", onClick, true)
    }
  }, [router])

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
