import {
  readSelect,
  resolveStorefront,
  type SectionInstance,
  type StorefrontChoice,
} from "@lib/storefront/templates"
import type { CSSProperties } from "react"

const hsl = (v: string) => `hsl(var(${v}))`

export type PreviewPage = "home" | "collection" | "product"

/**
 * A miniature wireframe of the storefront drawn with the theme's real tokens, header,
 * footer, home sections, listing and product layouts, so the owner sees what a theme or an
 * edit does before saving. Purely visual (no data).
 */
export function TemplatePreview({
  choice,
  page = "home",
  compact = false,
}: {
  choice: Partial<StorefrontChoice>
  page?: PreviewPage
  compact?: boolean
}) {
  const r = resolveStorefront(choice)
  const { layout } = r
  const k = compact ? 0.62 : 1
  const style = {
    ...r.cssVars,
    background: hsl("--background"),
    color: hsl("--foreground"),
    borderRadius: compact ? 8 : 12,
    fontFamily: "var(--font-body)",
  } as CSSProperties
  const radius: CSSProperties = { borderRadius: `calc(var(--radius) * ${compact ? 0.4 : 0.55})` }
  const bar = (w: string, h = 4, strong = false): CSSProperties => ({
    width: w,
    height: h,
    borderRadius: 99,
    background: strong ? hsl("--foreground") : hsl("--muted-foreground"),
    opacity: strong ? 0.85 : 0.35,
  })
  const cols = layout.grid
  const cardStyle: CSSProperties =
    layout.card === "bordered"
      ? { border: `1px solid ${hsl("--border")}`, background: hsl("--card"), ...radius, padding: 3 }
      : layout.card === "elevated"
        ? { boxShadow: "0 2px 8px hsl(0 0% 0% / 0.12)", background: hsl("--card"), ...radius, padding: 3 }
        : {}

  const grid = (n: number = cols, rows = 2) => (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
      {Array.from({ length: n * rows }).map((_, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ ...radius, background: hsl("--muted"), aspectRatio: "1" }} />
          <div className="mt-1 space-y-0.5">
            <div style={bar("80%", 3, true)} />
            <div style={{ ...bar("40%", 3), background: hsl("--primary"), opacity: 0.9 }} />
          </div>
        </div>
      ))}
    </div>
  )

  const logo = r.branding.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={r.branding.logo} alt="" style={{ height: 8 * k + 4, width: "auto" }} />
  ) : (
    <span style={{ ...bar("24px", 3, true), background: "currentColor" }} />
  )
  const links = (
    <div className="flex gap-1.5">
      {[14, 18, 12].map((w, i) => (
        <span key={i} style={bar(`${w}px`, 3)} />
      ))}
    </div>
  )

  const a = r.header.announcement
  const announcement =
    a.enabled && (a.text.vi || a.text.en) ? (
      <div style={{ background: hsl("--primary"), height: 6 + 4 * k }} className="flex items-center justify-center">
        <span style={{ ...bar("40%", 2), background: hsl("--primary-foreground") }} />
      </div>
    ) : null

  const header =
    layout.header === "centered" ? (
      <div style={{ borderBottom: `1px solid ${hsl("--border")}` }}>
        <div className="flex items-center justify-between px-2" style={{ height: 10 + 8 * k }}>
          <span style={bar("10px", 3)} />
          <span className="flex items-center">{logo}</span>
          <span style={bar("10px", 3)} />
        </div>
        <div className="flex justify-center py-1" style={{ borderTop: `1px solid ${hsl("--border")}` }}>
          {links}
        </div>
      </div>
    ) : layout.header === "bar" ? (
      <div
        className="flex items-center justify-between px-2"
        style={{ height: 10 + 8 * k, borderBottom: `1px solid ${hsl("--border")}` }}
      >
        <span className="flex items-center">{logo}</span>
        {links}
        <span style={bar("10px", 3)} />
      </div>
    ) : (
      <div className="flex items-center justify-between px-2" style={{ height: 10 + 8 * k, background: "hsl(0 0% 12%)", color: "white" }}>
        <span style={bar("10px", 3)} />
        <span className="flex items-center">{logo}</span>
        <span style={bar("10px", 3)} />
      </div>
    )

  const heroStyle = (s: SectionInstance) => readSelect(s, "style", ["carousel", "split", "text"] as const, "carousel")

  const block = (s: SectionInstance) => {
    switch (s.type) {
      case "hero": {
        const st = heroStyle(s)
        return st === "split" ? (
          <div className="grid grid-cols-2 items-center gap-2 p-2" style={{ background: hsl("--secondary") }}>
            <div className="space-y-1">
              <div style={bar("70%", 5, true)} />
              <div style={bar("90%")} />
              <span style={{ display: "inline-block", width: 26, height: 8, background: hsl("--primary"), ...radius }} />
            </div>
            <div style={{ ...radius, background: hsl("--muted"), height: 34 + 26 * k }} />
          </div>
        ) : st === "text" ? (
          <div className="flex flex-col items-center gap-1 py-3" style={{ borderBottom: `1px solid ${hsl("--border")}` }}>
            <div style={bar("45%", 6, true)} />
            <div style={bar("60%")} />
            <span style={{ width: 28, height: 8, background: hsl("--primary"), ...radius }} />
          </div>
        ) : (
          <div className="relative" style={{ background: "hsl(0 0% 12%)", height: 34 + 32 * k }}>
            <div className="absolute bottom-2 left-2 space-y-1">
              <div style={{ ...bar("60px", 5), background: "white", opacity: 0.9 }} />
              <div style={{ ...bar("40px", 3), background: "white", opacity: 0.5 }} />
            </div>
          </div>
        )
      }
      case "categories":
        return readSelect(s, "style", ["cards", "pills"] as const, "cards") === "pills" ? (
          <div className="flex flex-wrap justify-center gap-1">
            {[44, 36, 52, 40].map((w, i) => (
              <span key={i} style={{ width: w, height: 9, borderRadius: 99, border: `1px solid ${hsl("--border")}`, background: hsl("--card") }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ ...radius, background: hsl("--muted"), height: 14 + 14 * k }} />
            ))}
          </div>
        )
      case "featured":
      case "shop":
        return grid()
      case "reel":
        return <div style={{ ...radius, background: hsl("--accent"), height: 10 + 12 * k }} />
      case "collections":
        return (
          <div className="grid grid-cols-2 gap-1.5">
            {[0, 1].map((i) => (
              <div key={i} style={{ ...radius, background: hsl("--secondary"), height: 10 + 10 * k }} />
            ))}
          </div>
        )
      case "values":
        return (
          <div className="flex justify-around">
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: 99, background: hsl("--accent") }} />
            ))}
          </div>
        )
      case "image-with-text": {
        const right = readSelect(s, "image_side", ["left", "right"] as const, "left") === "right"
        return (
          <div className="grid grid-cols-2 items-center gap-2">
            <div style={{ ...radius, background: hsl("--muted"), height: 22 + 16 * k, order: right ? 2 : 1 }} />
            <div className="space-y-1" style={{ order: right ? 1 : 2 }}>
              <div style={bar("70%", 4, true)} />
              <div style={bar("90%")} />
            </div>
          </div>
        )
      }
      case "rich-text":
        return (
          <div className="flex flex-col items-center gap-1 py-1" style={{ background: hsl("--secondary"), ...radius }}>
            <div style={bar("40%", 4, true)} />
            <div style={bar("65%")} />
          </div>
        )
      case "testimonials":
        return (
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1 p-1" style={{ border: `1px solid ${hsl("--border")}`, ...radius }}>
                <div style={bar("90%")} />
                <div style={bar("50%")} />
              </div>
            ))}
          </div>
        )
    }
  }

  const footer =
    layout.footer === "minimal" ? (
      <div className="flex flex-col items-center gap-1 p-2" style={{ borderTop: `1px solid ${hsl("--border")}` }}>
        <span style={bar("20px", 3, true)} />
        {links}
      </div>
    ) : (
      <div className="grid grid-cols-4 gap-2 p-2" style={{ borderTop: `1px solid ${hsl("--border")}` }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div style={bar("70%", 3, true)} />
            <div style={bar("50%", 2)} />
            <div style={bar("60%", 2)} />
          </div>
        ))}
      </div>
    )

  const title = (w = "30%") => <div style={bar(w, 6, true)} />

  const body =
    page === "collection" ? (
      <div className="space-y-2 p-2">
        {title()}
        {layout.listing === "topbar" ? (
          <>
            <div className="flex justify-end gap-1 py-1" style={{ borderTop: `1px solid ${hsl("--border")}`, borderBottom: `1px solid ${hsl("--border")}` }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 16, height: 7, borderRadius: 99, border: `1px solid ${hsl("--border")}` }} />
              ))}
            </div>
            {grid(cols, 2)}
          </>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "22% 1fr" }}>
            <div className="space-y-1">
              {[0, 1, 2].map((i) => (
                <div key={i} style={bar("90%", 4)} />
              ))}
            </div>
            {grid(Math.max(cols - 1, 2), 2)}
          </div>
        )}
      </div>
    ) : page === "product" ? (
      layout.product === "stacked" ? (
        <div className="space-y-2 p-2">
          <div className="mx-auto" style={{ ...radius, background: hsl("--muted"), height: 36 + 30 * k, width: "75%" }} />
          <div className="mx-auto space-y-1" style={{ width: "60%" }}>
            {title("60%")}
            <div style={bar("40%", 4)} />
            <span style={{ display: "block", height: 9, background: hsl("--primary"), ...radius }} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2">
          <div style={{ ...radius, background: hsl("--muted"), height: 40 + 34 * k }} />
          <div className="space-y-1.5">
            {title("70%")}
            <div style={bar("40%", 4)} />
            <div style={bar("90%")} />
            <div style={bar("80%")} />
            <span style={{ display: "block", height: 9, background: hsl("--primary"), ...radius }} />
          </div>
        </div>
      )
    ) : (
      <div className="space-y-2 p-2">
        {r.home.map((s) => (
          <div key={s.id} className={s.type === "hero" ? "-mx-2 -mt-2" : undefined}>
            {block(s)}
          </div>
        ))}
      </div>
    )

  return (
    <div className="overflow-hidden border" style={style} aria-hidden>
      {announcement}
      {header}
      {body}
      {footer}
    </div>
  )
}
