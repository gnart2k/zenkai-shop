"use client"

import { useEffect, useRef } from "react"

import type { TiktokReelItem } from "@lib/data/tiktok-reel"

type Props = {
  item: TiktokReelItem
  watchLabel: string
}

/** 9:16 muted looping clip that only plays while mostly on screen. */
export default function ReelCard({ item, watchLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <a
      href={item.tiktok_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-[9/16] overflow-hidden rounded-2xl bg-muted"
      aria-label={`${item.title} – ${watchLabel}`}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        src={item.video_url}
        poster={item.poster_url}
        muted
        loop
        playsInline
        preload="none"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-16 text-white">
        <p className="font-serif text-base leading-snug">{item.title}</p>
        {item.caption && (
          <p className="line-clamp-2 text-xs leading-relaxed text-white/80">{item.caption}</p>
        )}
        <span className="mt-1 text-[11px] font-medium text-white/70">
          {watchLabel} ↗
        </span>
      </div>
    </a>
  )
}
