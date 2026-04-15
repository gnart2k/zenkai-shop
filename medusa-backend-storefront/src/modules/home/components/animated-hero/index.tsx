"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { motion } from "motion/react"
import { useTranslations } from "next-intl"

import type { StoreBrandingPublic } from "@lib/data/store-branding"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Link } from "@/i18n/navigation"

import { HeroMotion } from "../motion-primitives"

const ease = [0.22, 1, 0.36, 1] as const

type AnimatedHeroProps = {
  branding: StoreBrandingPublic
  countryCode: string
  /** First collection handle for secondary CTA when present */
  highlightCollectionHandle?: string | null
}

export default function AnimatedHero({
  branding,
  countryCode,
  highlightCollectionHandle,
}: AnimatedHeroProps) {
  console.log(branding)
  const t = useTranslations("Home")
  const title = branding.store_name?.trim() || "Your storefront"
  const subtitle =
    branding.tagline?.trim() || t("subtitleFallback")
  const accent = branding.primary_color?.trim() || undefined
  const hasHero = Boolean(branding.hero_url?.trim())
  const hasLogo = Boolean(branding.logo_url?.trim())

  return (
    <section className="relative isolate min-h-[88vh] w-full overflow-hidden border-b border-border bg-background">
      <div className="pointer-events-none absolute inset-0">
        {hasHero ? (
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center"
            style={{ backgroundImage: `url(${branding.hero_url})` }}
            aria-hidden
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/80" aria-hidden />
        )}
        <div
          className="absolute -left-32 top-20 size-[520px] rounded-full bg-primary/10 blur-3xl motion-safe:animate-pulse"
          aria-hidden
        />
        <div
          className="absolute -right-24 bottom-10 size-[480px] rounded-full blur-3xl motion-safe:animate-pulse"
          style={{
            backgroundColor: accent ? `${accent}22` : "hsl(var(--primary) / 0.12)",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" aria-hidden />
        <div
          className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(hsl(var(--foreground)/0.08)_1px,transparent_1px)] [background-size:24px_24px]"
          aria-hidden
        />
      </div>

      <HeroMotion className="relative z-10 flex min-h-[88vh] flex-col items-center justify-center px-4 py-24 text-center small:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="mb-6 flex flex-col items-center gap-4"
        >
          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur-sm"
          >
            <Sparkles className="size-3.5" aria-hidden />
            {t("heroBadge")}
          </Badge>
          {hasLogo ? (
            <img
              src={branding.logo_url!}
              alt=""
              className="h-14 w-auto max-w-[220px] object-contain drop-shadow-sm small:h-16"
            />
          ) : (
            <div
              className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-muted-foreground/35 bg-muted/50 text-lg font-semibold tracking-tight text-muted-foreground backdrop-blur-sm small:size-20 small:text-xl"
              aria-hidden
            >
              {title.slice(0, 1).toUpperCase() || "M"}
            </div>
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease }}
          className="max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight text-foreground small:text-5xl small:leading-[1.1] large:text-6xl"
          style={accent ? { color: accent } : undefined}
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.28, ease }}
          className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground small:text-lg"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease }}
          className="mt-10 flex flex-col items-stretch gap-3 small:flex-row small:items-center"
        >
          <Button
            asChild
            size="lg"
            className={cn(
              "rounded-full px-8 shadow-sm",
              accent && "border-0 text-white hover:opacity-90"
            )}
            style={
              accent
                ? { backgroundColor: accent }
                : undefined
            }
          >
            <Link href={`/${countryCode}/store`}>
              {t("heroCtaShop")}
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-border/80 bg-background/60 px-8 backdrop-blur-sm">
            <Link
              href={
                highlightCollectionHandle
                  ? `/${countryCode}/collections/${highlightCollectionHandle}`
                  : `/${countryCode}/store`
              }
            >
              {highlightCollectionHandle
                ? t("heroCtaCollection")
                : t("heroCtaCatalog")}
            </Link>
          </Button>
        </motion.div>
      </HeroMotion>
    </section>
  )
}
