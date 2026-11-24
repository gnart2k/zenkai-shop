import { sdk } from "@lib/config"

export type TiktokReelItem = {
  tiktok_id: string
  title: string
  caption: string | null
  video_url: string
  poster_url: string
  tiktok_url: string
  product_handle: string | null
}

export type TiktokReel = {
  profile_url: string | null
  items: TiktokReelItem[]
}

/** Homepage video reel configured in store metadata (backend: GET /store/tiktok-reel). */
export async function getTiktokReel(): Promise<TiktokReel> {
  try {
    return await sdk.client.fetch<TiktokReel>("/store/tiktok-reel", {
      method: "GET",
      next: { tags: ["tiktok-reel"], revalidate: 300 },
    })
  } catch {
    return { profile_url: null, items: [] }
  }
}
