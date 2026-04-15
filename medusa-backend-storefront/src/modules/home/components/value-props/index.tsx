"use client"

import { Headphones, Package, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Reveal, RevealItem, RevealStagger } from "../motion-primitives"

const ITEMS = [
  { icon: Package, titleKey: "valueCard1Title", descKey: "valueCard1Desc" },
  { icon: ShieldCheck, titleKey: "valueCard2Title", descKey: "valueCard2Desc" },
  { icon: Headphones, titleKey: "valueCard3Title", descKey: "valueCard3Desc" },
] as const

export default function ValueProps() {
  const t = useTranslations("Home")

  return (
    <section className="border-b border-border bg-muted/30 py-20 small:py-28">
      <div className="content-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("valueEyebrow")}
          </p>
          <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-foreground small:text-4xl">
            {t("valueTitle")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("valueDescription")}</p>
        </Reveal>

        <RevealStagger className="mt-14 grid gap-6 small:grid-cols-3" stagger={0.12}>
          {ITEMS.map(({ icon: Icon, titleKey, descKey }) => (
            <RevealItem key={titleKey}>
              <Card className="h-full border-border/80 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-col gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <CardTitle className="font-serif text-xl">{t(titleKey)}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {t(descKey)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}
