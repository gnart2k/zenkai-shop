"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useLocale, useTranslations } from "next-intl"

import type { HeroSlideData } from "@lib/data/hero"
import { cn } from "@/lib/utils"
import { Link } from "@/i18n/navigation"

type AnimatedHeroProps = {
  countryCode: string
  slides: HeroSlideData[]
}

const ease = [0.22, 1, 0.36, 1] as const
const SLIDE_MS = 7000
const FADE_MS = 1200

function pick(text: Record<string, string> | undefined, locale: string) {
  if (!text) return ""
  return (text[locale] ?? text.vi ?? Object.values(text)[0] ?? "").trim()
}

type View = { current: number; previous: number | null; step: number }

export default function AnimatedHero({ countryCode, slides }: AnimatedHeroProps) {
  const t = useTranslations("Home")
  const th = useTranslations("ShopLayout.hero")
  const locale = useLocale()

  // `previous` (the outgoing slide) stays fully opaque underneath the incoming slide
  // until the incoming fade has actually finished, so a transition never reveals
  // the section background. `step` identifies each transition.
  const [view, setView] = useState<View>({ current: 0, previous: null, step: 0 })
  const { current, previous, step } = view
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const show = useCallback((target: (cur: number) => number) => {
    setView((v) => {
      const index = target(v.current)
      if (index === v.current) return v
      return { current: index, previous: v.current, step: v.step + 1 }
    })
  }, [])

  const release = useCallback((forStep: number) => {
    setView((v) => (v.step === forStep && v.previous !== null ? { ...v, previous: null } : v))
  }, [])

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (slides.length < 2) return
    intervalRef.current = setInterval(() => {
      show((cur) => (cur + 1) % slides.length)
    }, SLIDE_MS)
  }, [slides.length, show])

  useEffect(() => {
    startInterval()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startInterval])

  // Play the active clip from the start. Fallback release in case `transitionend`
  // never fires (e.g. reduced motion or a hidden tab).
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const video = videoRefs.current[current]
    if (video && !reduceMotion) {
      video.currentTime = 0
      video.play().catch(() => {})
    }
    const timer = setTimeout(() => release(step), FADE_MS * 3)
    return () => clearTimeout(timer)
  }, [current, step, release])

  // Pause clips that are no longer visible.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (video && i !== current && i !== previous) video.pause()
    })
  }, [current, previous])

  if (!slides.length) {
    return <section className="h-screen w-full bg-[#1c1714]" />
  }

  const goTo = (index: number) => {
    show(() => index)
    startInterval()
  }
  const prev = () => goTo((current - 1 + slides.length) % slides.length)
  const next = () => goTo((current + 1) % slides.length)

  const active = slides[current]
  const eyebrow = pick(active.eyebrow, locale)
  const title = pick(active.title, locale)

  return (
    <section className="relative isolate h-screen w-full overflow-hidden bg-[#1c1714]">
      {slides.map((slide, i) => {
        const isCurrent = i === current
        const isPrevious = i === previous
        return (
          <div
            key={slide.id}
            aria-hidden={!isCurrent}
            className="absolute inset-0"
            style={{
              opacity: isCurrent || isPrevious ? 1 : 0,
              zIndex: isCurrent ? 2 : isPrevious ? 1 : 0,
              transition: isCurrent ? `opacity ${FADE_MS}ms cubic-bezier(0.22,1,0.36,1)` : "none",
            }}
            onTransitionEnd={(e) => {
              if (isCurrent && e.target === e.currentTarget && e.propertyName === "opacity") {
                release(step)
              }
            }}
          >
            {/* Desktop backdrop: blurred poster fills the wide frame without upscaling the clip */}
            <img
              src={slide.poster_url}
              alt=""
              className="absolute inset-0 hidden h-full w-full scale-110 object-cover blur-2xl brightness-[0.6] small:block"
              loading="eager"
            />
            {slide.video_url ? (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el
                }}
                src={slide.video_url}
                poster={slide.poster_url}
                muted
                loop
                playsInline
                preload={i <= 1 ? "auto" : "metadata"}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  "small:inset-auto small:right-[8%] small:top-[calc(50%+2rem)] small:h-[72vh] small:w-auto small:aspect-[9/16] small:-translate-y-1/2 small:rounded-2xl small:shadow-2xl small:ring-1 small:ring-white/15"
                )}
              />
            ) : (
              <img
                src={slide.poster_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover small:inset-auto small:right-[8%] small:top-[calc(50%+2rem)] small:h-[72vh] small:w-auto small:aspect-[9/16] small:-translate-y-1/2 small:rounded-2xl small:shadow-2xl"
                loading="eager"
              />
            )}
          </div>
        )
      })}

      <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/70 via-black/30 to-black/40 small:bg-gradient-to-r small:from-black/60 small:via-black/25 small:to-transparent" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-16 text-center text-white small:mx-auto small:max-w-[1440px] small:items-start small:px-12 small:pr-[42%] small:text-left">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="flex max-w-3xl flex-col items-center gap-6 small:items-start"
          >
            {eyebrow && <p className="text-base font-light text-white/80">{eyebrow}</p>}
            <h1 className="font-serif text-5xl font-light leading-tight tracking-tight small:text-7xl small:leading-[1.1]">
              {title}
            </h1>
            <div className="mt-4 flex flex-col gap-3 small:flex-row small:items-center">
              <Link
                href={`/${countryCode}/store`}
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-black transition-all hover:bg-white/90"
              >
                {t("heroCtaShop")}
              </Link>
              {active.product_handle && (
                <Link
                  href={`/${countryCode}/products/${active.product_handle}`}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-8 text-sm font-medium text-white transition-all hover:border-white/60"
                >
                  {t("heroCtaProduct")}
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-all hover:bg-white/20"
            aria-label={th("prev")}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-all hover:bg-white/20"
            aria-label={th("next")}
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => goTo(i)}
                className={cn(
                  "size-2 rounded-full transition-all duration-300",
                  i === current ? "w-8 bg-white" : "bg-white/40 hover:bg-white/60"
                )}
                aria-label={th("goTo", { number: i + 1 })}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
