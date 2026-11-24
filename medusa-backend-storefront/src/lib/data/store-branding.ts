import { sdk } from "@lib/config"

export type StoreBrandingPublic = {
  store_name: string
  tagline: string | null
  primary_color: string | null
  logo_url: string | null
  hero_url: string | null
  favicon_url: string | null
}

const defaults: StoreBrandingPublic = {
  store_name: "",
  tagline: null,
  primary_color: null,
  logo_url: null,
  hero_url: null,
  favicon_url: null,
}

export async function getStoreBranding(): Promise<StoreBrandingPublic> {
  try {
    return await sdk.client.fetch<StoreBrandingPublic>("/store/branding", {
      method: "GET",
      next: { tags: ["store-branding"], revalidate: 60 },
    })
  } catch {
    return defaults
  }
}
