import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

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
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: stores } = await query.graph({
    entity: 'store',
    fields: ['id', 'metadata'],
    pagination: { take: 1, skip: 0 },
  });

  const slides = stores[0]?.metadata?.hero_slides;

  res.status(200).json({ slides: Array.isArray(slides) ? (slides as HeroSlide[]) : [] });
}
