"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Film, ImagePlus, Loader2, Star, Trash2 } from "lucide-react"
import { useRef, useState } from "react"

type Labels = {
  addImages: string
  imagesHint: string
  main: string
  makeMain: string
  moveLeft: string
  moveRight: string
  remove: string
  video: string
  videoHint: string
  addVideo: string
  uploading: string
  failed: string
  sessionExpired: string
  empty: string
}

/**
 * Product gallery + video. Files upload as soon as they are chosen (to /api/portal/upload), the
 * form then submits only the resulting URLs: `images` (JSON array, first = main image) and
 * `video_url`.
 */
export function ProductMedia({
  initialImages,
  initialVideo,
  labels,
}: {
  initialImages: string[]
  initialVideo: string | null
  labels: Labels
}) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [video, setVideo] = useState<string | null>(initialVideo)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const imgInput = useRef<HTMLInputElement>(null)
  const vidInput = useRef<HTMLInputElement>(null)

  async function upload(file: File): Promise<string> {
    const body = new FormData()
    body.set("file", file)
    const res = await fetch("/api/portal/upload", { method: "POST", body })
    if (res.status === 401) throw new Error(labels.sessionExpired)
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.url) throw new Error(json.error || labels.failed)
    return json.url as string
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    setBusy((n) => n + files.length)
    for (const file of Array.from(files)) {
      try {
        const url = await upload(file)
        setImages((cur) => [...cur, url])
      } catch (e) {
        setError(e instanceof Error ? e.message : labels.failed)
      } finally {
        setBusy((n) => n - 1)
      }
    }
    if (imgInput.current) imgInput.current.value = ""
  }

  async function addVideo(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    setBusy((n) => n + 1)
    try {
      setVideo(await upload(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : labels.failed)
    } finally {
      setBusy((n) => n - 1)
      if (vidInput.current) vidInput.current.value = ""
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((cur) => {
      const j = i + d
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const makeMain = (i: number) => setImages((cur) => [cur[i], ...cur.filter((_, k) => k !== i)])

  return (
    <div className="space-y-6">
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="video_url" value={video ?? ""} />

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{labels.imagesHint}</p>
        {images.length === 0 ? (
          <div className="grid aspect-[16/6] place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
            {labels.empty}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((url, i) => (
              <li key={url} className="space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  {i === 0 ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                      <Star className="size-3" /> {labels.main}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label={labels.moveLeft}>
                      <ArrowLeft />
                    </Button>
                    <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={labels.moveRight}>
                      <ArrowRight />
                    </Button>
                    {i !== 0 ? (
                      <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => makeMain(i)} aria-label={labels.makeMain} title={labels.makeMain}>
                        <Star />
                      </Button>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => setImages((cur) => cur.filter((_, k) => k !== i))}
                    aria-label={labels.remove}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <input ref={imgInput} type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" id="product-images" onChange={(e) => addImages(e.target.files)} />
        <Button type="button" variant="outline" onClick={() => imgInput.current?.click()}>
          <ImagePlus /> {labels.addImages}
        </Button>
      </div>

      <div className="space-y-3 border-t pt-5">
        <p className="text-sm font-medium">{labels.video}</p>
        <p className="text-xs text-muted-foreground">{labels.videoHint}</p>
        {video ? (
          <div className="space-y-2">
            <video src={video} controls preload="metadata" className="aspect-video w-full rounded-lg border bg-black" />
            <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setVideo(null)}>
              <Trash2 /> {labels.remove}
            </Button>
          </div>
        ) : null}
        <input ref={vidInput} type="file" accept="video/mp4,video/webm" className="sr-only" id="product-video" onChange={(e) => addVideo(e.target.files)} />
        <Button type="button" variant="outline" onClick={() => vidInput.current?.click()}>
          <Film /> {labels.addVideo}
        </Button>
      </div>

      {busy > 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" /> {labels.uploading}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
