import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { resolveStoreForRequest } from '../../../lib/portal/store-context';

type LocalizedText = Record<string, string>;

export type HeroSlide = {
  id: string;
  video_url: string | null;
  poster_url: string;
  eyebrow: LocalizedText;
  title: LocalizedText;
  product_handle: string | null;
};

/** Homepage hero media slides, configured in store.metadata.hero_slides (see scripts/setup-hero.ts). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const store = await resolveStoreForRequest(req, ['id', 'metadata']);

  const slides = store?.metadata?.hero_slides;

  res.status(200).json({ slides: Array.isArray(slides) ? (slides as HeroSlide[]) : [] });
}
