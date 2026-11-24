import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export type TiktokReelItem = {
  tiktok_id: string;
  title: string;
  caption: string | null;
  video_url: string;
  poster_url: string;
  tiktok_url: string;
  product_handle: string | null;
};

export type TiktokReel = {
  profile_url: string | null;
  items: TiktokReelItem[];
};

/** Homepage video reel, configured in store.metadata.tiktok_reel (see scripts/import-tiktok.ts). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: stores } = await query.graph({
    entity: 'store',
    fields: ['id', 'metadata'],
    pagination: { take: 1, skip: 0 },
  });

  const reel = stores[0]?.metadata?.tiktok_reel as Partial<TiktokReel> | undefined;

  res.status(200).json({
    profile_url: reel?.profile_url ?? null,
    items: Array.isArray(reel?.items) ? reel.items : [],
  } satisfies TiktokReel);
}
