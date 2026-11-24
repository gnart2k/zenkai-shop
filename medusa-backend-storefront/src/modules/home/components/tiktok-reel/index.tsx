import { getTranslations } from "next-intl/server"

import { getTiktokReel } from "@lib/data/tiktok-reel"

import ReelCard from "./reel-card"

export default async function TiktokReel() {
  const [reel, t] = await Promise.all([getTiktokReel(), getTranslations("Home")])

  if (!reel.items.length) return null

  return (
    <section className="bg-background py-12 small:py-16" aria-labelledby="tiktok-reel-title">
      <div className="content-container">
        <div className="flex flex-col items-start justify-between gap-4 small:flex-row small:items-end">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("reelEyebrow")}
            </p>
            <h2
              id="tiktok-reel-title"
              className="font-serif text-3xl font-light tracking-tight text-foreground small:text-4xl"
            >
              {t("reelTitle")}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">{t("reelSubtitle")}</p>
          </div>
          {reel.profile_url && (
            <a
              href={reel.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
            >
              {t("reelFollow")}
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>

      <ul className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-2 small:scroll-px-[max(1.5rem,calc((100vw-1440px)/2+1.5rem))] small:px-[max(1.5rem,calc((100vw-1440px)/2+1.5rem))]">
        {reel.items.map((item) => (
          <li
            key={item.tiktok_id}
            className="w-[62vw] max-w-[260px] shrink-0 snap-start small:w-[240px]"
          >
            <ReelCard item={item} watchLabel={t("reelWatch")} />
          </li>
        ))}
      </ul>
    </section>
  )
}
