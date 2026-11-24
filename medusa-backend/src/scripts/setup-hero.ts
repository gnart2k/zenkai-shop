import fs from 'node:fs';
import path from 'node:path';
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

/**
 * Writes the homepage hero slides (TikTok lamp videos) to store.metadata.hero_slides.
 * The branding hero image (Admin → store branding) stays as the first slide; these follow it.
 * Re-run after editing SLIDES:
 *   pnpm medusa exec ./src/scripts/setup-hero.ts
 */

const SLIDES = [
  {
    tiktok_id: '7709973442786938132',
    product_handle: 'den-ngu-go-lua-nguyen-khoi',
    eyebrow: { vi: 'Đèn ngủ gỗ lũa nguyên khối', en: 'Solid driftwood night lamp' },
    title: { vi: 'Ánh sáng từ lõi gỗ', en: 'Light from within the wood' },
  },
  {
    tiktok_id: '7708825306957729044',
    product_handle: 'den-cay-go-lua-vom-cong',
    eyebrow: { vi: 'Đèn cây gỗ lũa', en: 'Driftwood floor lamps' },
    title: { vi: 'Đường cong của tự nhiên', en: "Nature's own curves" },
  },
  {
    tiktok_id: '7709461070187875604',
    product_handle: 'den-cay-go-lua-treo-den-may',
    eyebrow: { vi: 'Góc nhỏ an yên', en: 'A quiet corner' },
    title: { vi: 'Nắng sớm, gió nhẹ, ánh đèn vàng', en: 'Morning sun, soft breeze, warm light' },
  },
  {
    tiktok_id: '7707394932616498452',
    product_handle: 'den-ban-go-lua-dang-uon',
    eyebrow: { vi: 'Đèn bàn gỗ lũa', en: 'Driftwood table lamps' },
    title: { vi: 'Mỗi khúc gỗ, một hình hài', en: 'Every piece, its own shape' },
  },
  {
    tiktok_id: '7710674824791592213',
    product_handle: 'den-ban-goc-go-lua-chup-vai',
    eyebrow: { vi: '', en: '' },
    title: { vi: 'Thủ công tận xưởng', en: 'Handcrafted in our workshop' },
  },
];

const UPLOADS_PATH = path.resolve(process.cwd(), '../tiktok-import/uploads.json');

export default async function setupHero({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModule = container.resolve(Modules.STORE);
  const uploads: Record<string, string> = JSON.parse(fs.readFileSync(UPLOADS_PATH, 'utf8'));

  const slides = SLIDES.map((s) => {
    const video = uploads[`${s.tiktok_id}.mp4`];
    const poster = uploads[`${s.tiktok_id}-cover.jpg`];
    if (!video || !poster) {
      throw new Error(`missing uploaded media for ${s.tiktok_id}; run import-tiktok.ts first`);
    }
    return {
      id: s.tiktok_id,
      video_url: `/media/${video}`,
      poster_url: `/media/${poster}`,
      eyebrow: s.eyebrow,
      title: s.title,
      product_handle: s.product_handle,
    };
  });

  const [store] = await storeModule.listStores({}, { take: 1 });
  if (!store) throw new Error('store not found');
  await storeModule.updateStores(store.id, {
    metadata: { ...(store.metadata ?? {}), hero_slides: slides },
  });
  logger.info(`store.metadata.hero_slides set with ${slides.length} slides`);
}
