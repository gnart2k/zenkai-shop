import { readSelect, readText, type SectionInstance } from "@lib/storefront/templates"
import SmartLink from "@modules/storefront/smart-link"

import { Reveal } from "../motion-primitives"

/** Image beside a story or promo. Renders nothing until the owner adds content. */
export default function ImageWithText({
  section,
  countryCode,
  locale,
}: {
  section: SectionInstance
  countryCode: string
  locale: string
}) {
  const image = readText(section, "image", locale)
  const eyebrow = readText(section, "eyebrow", locale)
  const heading = readText(section, "heading", locale)
  const text = readText(section, "text", locale)
  const label = readText(section, "button_label", locale)
  const link = readText(section, "button_link", locale)
  if (!heading && !text && !image) return null
  const imageRight = readSelect(section, "image_side", ["left", "right"] as const, "left") === "right"

  return (
    <section className="bg-background py-14 small:py-20">
      <div className="content-container grid items-center gap-10 small:grid-cols-2 small:gap-16">
        <Reveal className={imageRight ? "small:order-2" : undefined}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius)] bg-muted">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={heading} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            ) : null}
          </div>
        </Reveal>
        <Reveal className="space-y-4" delay={0.06}>
          {eyebrow ? <p className="text-sm font-medium uppercase tracking-widest text-primary">{eyebrow}</p> : null}
          {heading ? (
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">{heading}</h2>
          ) : null}
          {text ? <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{text}</p> : null}
          {label && link ? (
            <SmartLink
              href={link}
              countryCode={countryCode}
              className="inline-flex h-10 items-center rounded-[var(--radius)] border border-foreground/20 px-5 text-sm font-medium text-foreground transition hover:bg-foreground hover:text-background"
            >
              {label}
            </SmartLink>
          ) : null}
        </Reveal>
      </div>
    </section>
  )
}
