"use client"

import { Headphones, Package, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { Reveal, RevealItem, RevealStagger } from "../motion-primitives"

const ITEMS = [
  { icon: Package, titleKey: "valueCard1Title", descKey: "valueCard1Desc" },
  { icon: ShieldCheck, titleKey: "valueCard2Title", descKey: "valueCard2Desc" },
  { icon: Headphones, titleKey: "valueCard3Title", descKey: "valueCard3Desc" },
] as const

export default function ValueProps() {
  const t = useTranslations("Home")

  return (
    <section className="border-t border-border/40 bg-background py-16 small:py-20">
      <div className="content-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t("valueEyebrow")}
          </p>
          <h2 className="mt-3 font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl">
            {t("valueTitle")}
          </h2>
        </Reveal>

        <RevealStagger
          className="mt-12 grid gap-8 small:grid-cols-3"
          stagger={0.12}
        >
          {ITEMS.map(({ icon: Icon, titleKey, descKey }) => (
            <RevealItem key={titleKey}>
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-foreground">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h3 className="font-serif text-xl font-light text-foreground">
                  {t(titleKey)}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {t(descKey)}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}
