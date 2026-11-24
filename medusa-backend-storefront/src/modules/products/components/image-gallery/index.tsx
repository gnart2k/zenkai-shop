"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { HttpTypes } from "@medusajs/types"
import { Play } from "lucide-react"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  /** Optional product video (product.metadata.video_url), shown before the images. */
  videoUrl?: string | null
}

type Slide = { kind: "video"; key: string; src: string } | { kind: "image"; key: string; src: string; n: number }

/** One large image (or the video) with a thumbnail strip, instead of a very tall stack. */
const ImageGallery = ({ images, videoUrl }: ImageGalleryProps) => {
  const t = useTranslations("ShopProduct")
  const slides: Slide[] = [
    ...(videoUrl ? [{ kind: "video" as const, key: "video", src: videoUrl }] : []),
    ...images
      .filter((i) => !!i.url)
      .map((i, n) => ({ kind: "image" as const, key: i.id, src: i.url as string, n: n + 1 })),
  ]
  const [active, setActive] = useState(0)
  const current = slides[Math.min(active, slides.length - 1)]
  if (!current) return <div className="aspect-[4/5] w-full rounded-lg bg-muted" />

  return (
    <div className="flex flex-col gap-3" data-testid="product-gallery">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
        {current.kind === "video" ? (
          <video
            key={current.key}
            className="absolute inset-0 h-full w-full object-cover"
            src={current.src}
            poster={images[0]?.url ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            data-testid="product-video"
          />
        ) : (
          <Image
            key={current.key}
            src={current.src}
            priority={active === 0}
            alt={t("imageAlt", { number: current.n })}
            fill
            sizes="(max-width: 1024px) 100vw, 600px"
            className="object-cover"
          />
        )}
      </div>
      {slides.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label={t("gallery")}>
          {slides.map((s, i) => (
            <li key={s.key} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={s.kind === "video" ? t("video") : t("imageAlt", { number: s.n })}
                aria-current={i === active}
                className={`relative block size-16 overflow-hidden rounded-md bg-muted outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring small:size-20 ${
                  i === active ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100"
                }`}
              >
                {s.kind === "video" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-foreground/80 text-background">
                    <Play className="size-5" aria-hidden />
                  </span>
                ) : (
                  <Image src={s.src} alt="" fill sizes="80px" className="object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ImageGallery
