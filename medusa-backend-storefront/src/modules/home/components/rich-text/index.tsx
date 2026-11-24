import { readText, type SectionInstance } from "@lib/storefront/templates"

import { Reveal } from "../motion-primitives"

/** Centered heading + paragraph. Renders nothing until the owner adds content. */
export default function RichText({ section, locale }: { section: SectionInstance; locale: string }) {
  const heading = readText(section, "heading", locale)
  const text = readText(section, "text", locale)
  if (!heading && !text) return null
  return (
    <section className="bg-secondary/50 py-14 small:py-20">
      <Reveal className="content-container mx-auto max-w-2xl space-y-4 text-center">
        {heading ? (
          <h2 className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">{heading}</h2>
        ) : null}
        {text ? <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{text}</p> : null}
      </Reveal>
    </section>
  )
}
