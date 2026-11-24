import { readText, type SectionInstance } from "@lib/storefront/templates"
import { Quote } from "lucide-react"

import { Reveal } from "../motion-primitives"

/**
 * Up to three customer quotes typed by the owner. Nothing is shown until they enter some,
 * so a theme never ships made-up reviews.
 */
export default function Testimonials({ section, locale }: { section: SectionInstance; locale: string }) {
  const heading = readText(section, "heading", locale)
  const quotes = [1, 2, 3]
    .map((n) => ({ text: readText(section, `quote${n}_text`, locale), name: readText(section, `quote${n}_name`, locale) }))
    .filter((q) => q.text)
  if (!quotes.length) return null

  return (
    <section className="bg-background py-14 small:py-20">
      <div className="content-container">
        {heading ? (
          <Reveal className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">{heading}</h2>
          </Reveal>
        ) : null}
        <Reveal className={`grid gap-6 ${quotes.length === 2 ? "small:grid-cols-2" : quotes.length >= 3 ? "small:grid-cols-3" : "mx-auto max-w-xl"}`}>
          {quotes.map((q, i) => (
            <figure key={i} className="rounded-[var(--radius)] border bg-card p-6">
              <Quote className="mb-3 size-5 text-primary" aria-hidden />
              <blockquote className="whitespace-pre-line text-sm leading-relaxed text-foreground">{q.text}</blockquote>
              {q.name ? <figcaption className="mt-4 text-sm font-medium text-muted-foreground">{q.name}</figcaption> : null}
            </figure>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
