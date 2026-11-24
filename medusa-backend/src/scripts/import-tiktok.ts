import fs from 'node:fs';
import path from 'node:path';
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules, ProductStatus } from '@medusajs/framework/utils';
import { createProductsWorkflow } from '@medusajs/medusa/core-flows';

/**
 * Imports the @dengoluadecor TikTok media prepared in ../tiktok-import:
 *  - uploads images/videos to the file module (key prefix `lumpa-media-`, served by /media/:id)
 *  - creates one DRAFT product per lamp (placeholder VND price, made-to-order)
 *  - writes the homepage reel config to store.metadata.tiktok_reel
 *
 * Idempotent: uploads are cached in ../tiktok-import/uploads.json and products
 * whose handle already exists are skipped.
 *
 *   pnpm medusa exec ./src/scripts/import-tiktok.ts
 */

type ManifestProduct = {
  tiktok_id: string;
  title: string;
  handle: string;
  price: number;
  kind: string;
  images: string[];
  video: string | null;
  tiktok_url: string;
  caption: string;
  description: string;
};

type Manifest = { profile_url: string; products: ManifestProduct[] };

const IMPORT_DIR = path.resolve(process.cwd(), '../tiktok-import');
const WEB_DIR = path.join(IMPORT_DIR, 'web');
const UPLOADS_PATH = path.join(IMPORT_DIR, 'uploads.json');
const OPTION_TITLE = 'Kiểu dáng';
const OPTION_VALUE = 'Tiêu chuẩn';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
};

const mediaUrl = (key: string) => `/media/${key}`;

function shortCaption(caption: string, max = 140): string {
  const firstSentence = caption.split(/(?<=[.!?…])\s/)[0] ?? caption;
  const text = firstSentence.length <= max ? firstSentence : caption;
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export default async function importTiktok({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fileModule = container.resolve(Modules.FILE);
  const storeModule = container.resolve(Modules.STORE);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);

  const manifest: Manifest = JSON.parse(
    fs.readFileSync(path.join(IMPORT_DIR, 'manifest.json'), 'utf8')
  );
  const uploads: Record<string, string> = fs.existsSync(UPLOADS_PATH)
    ? JSON.parse(fs.readFileSync(UPLOADS_PATH, 'utf8'))
    : {};

  async function upload(file: string): Promise<string> {
    if (uploads[file]) {
      return uploads[file];
    }
    const ext = path.extname(file).toLowerCase();
    const [created] = await fileModule.createFiles([
      {
        filename: `lumpa-media-${file}`,
        mimeType: MIME[ext] ?? 'application/octet-stream',
        content: fs.readFileSync(path.join(WEB_DIR, file)).toString('base64'),
        access: 'public',
      },
    ]);
    uploads[file] = created.id;
    fs.writeFileSync(UPLOADS_PATH, JSON.stringify(uploads, null, 1));
    logger.info(`uploaded ${file} -> ${created.id}`);
    return created.id;
  }

  // 1. Media
  for (const p of manifest.products) {
    for (const file of [...p.images, ...(p.video ? [p.video] : [])]) {
      await upload(file);
    }
  }

  // 2. Products (draft)
  const [store] = await storeModule.listStores({}, { take: 1 });
  const salesChannelId =
    store?.default_sales_channel_id ??
    (await salesChannelModule.listSalesChannels({}, { take: 1 }))[0]?.id;
  const [shippingProfile] = await fulfillmentModule.listShippingProfiles({ type: 'default' });
  if (!store || !salesChannelId || !shippingProfile) {
    throw new Error('Store, sales channel or default shipping profile not found');
  }

  const { data: existing } = await query.graph({
    entity: 'product',
    fields: ['handle'],
    filters: { handle: manifest.products.map((p) => p.handle) },
  });
  const existingHandles = new Set(existing.map((p: { handle: string }) => p.handle));
  const toCreate = manifest.products.filter((p) => !existingHandles.has(p.handle));
  if (existingHandles.size) {
    logger.info(`skipping existing products: ${[...existingHandles].join(', ')}`);
  }

  if (toCreate.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: toCreate.map((p) => {
          const images = p.images.map((file) => ({ url: mediaUrl(uploads[file]) }));
          return {
            title: p.title,
            handle: p.handle,
            status: ProductStatus.DRAFT,
            description: p.description,
            thumbnail: images[0]?.url,
            images,
            shipping_profile_id: shippingProfile.id,
            sales_channels: [{ id: salesChannelId }],
            options: [{ title: OPTION_TITLE, values: [OPTION_VALUE] }],
            variants: [
              {
                title: OPTION_VALUE,
                options: { [OPTION_TITLE]: OPTION_VALUE },
                manage_inventory: false,
                prices: [{ currency_code: 'vnd', amount: p.price }],
              },
            ],
            metadata: {
              source: 'tiktok',
              tiktok_id: p.tiktok_id,
              tiktok_url: p.tiktok_url,
              video_url: p.video ? mediaUrl(uploads[p.video]) : null,
              kind: p.kind,
              placeholder_price: true,
            },
          };
        }),
        additional_data: { is_physical: true },
      },
    });
    logger.info(`created ${toCreate.length} draft products`);
  }

  // 3. Homepage reel config (merged into existing store metadata, e.g. branding)
  const reel = {
    profile_url: manifest.profile_url,
    items: manifest.products
      .filter((p) => p.video)
      .map((p) => ({
        tiktok_id: p.tiktok_id,
        title: p.title,
        caption: p.caption ? shortCaption(p.caption) : null,
        video_url: mediaUrl(uploads[p.video!]),
        poster_url: mediaUrl(uploads[p.images[0]]),
        tiktok_url: p.tiktok_url,
        product_handle: p.handle,
      })),
  };
  await storeModule.updateStores(store.id, {
    metadata: { ...(store.metadata ?? {}), tiktok_reel: reel },
  });
  logger.info(`store.metadata.tiktok_reel set with ${reel.items.length} videos`);
}
