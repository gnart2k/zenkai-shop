import { sdk } from "@lib/config"

export type HeroSlideData = {
  id: string
  video_url: string | null
  poster_url: string
  eyebrow: Record<string, string>
  title: Record<string, string>
  product_handle: string | null
}

/** Homepage hero media slides (backend: GET /store/hero, from store.metadata.hero_slides). */
export async function getHeroSlides(): Promise<HeroSlideData[]> {
  try {
    const { slides } = await sdk.client.fetch<{ slides: HeroSlideData[] }>("/store/hero", {
      method: "GET",
      next: { tags: ["hero"], revalidate: 300 },
    })
    return slides ?? []
  } catch {
    return []
  }
}
