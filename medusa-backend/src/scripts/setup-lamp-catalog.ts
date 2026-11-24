import fs from 'node:fs';
import path from 'node:path';
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules, ProductStatus } from '@medusajs/framework/utils';
import {
  createProductCategoriesWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from '@medusajs/medusa/core-flows';

/**
 * Turns the catalog into a lamp-only store:
 *  - deletes the Medusa demo apparel (products + categories + their category images)
 *  - deletes the non-lamp TikTok import (driftwood side table) and drops it from the reel
 *  - creates the lamp categories (with cover images) and assigns + publishes the lamps
 *
 * Idempotent. Run after import-tiktok.ts:
 *   pnpm medusa exec ./src/scripts/setup-lamp-catalog.ts
 */

const DEMO_PRODUCT_HANDLES = ['t-shirt', 'shorts', 'sweatpants', 'sweatshirt'];
const DEMO_CATEGORY_HANDLES = ['shirts', 'sweatshirts', 'pants', 'merch', 'new-products'];
const NON_LAMP_HANDLES = ['ban-tra-go-lua-mat-tron'];

/** Ordered: the homepage shows the first category large and the next two beside it. */
const LAMP_CATEGORIES = [
  {
    handle: 'den-cay-go-lua',
    name: 'Đèn cây gỗ lũa',
    description:
      'Đèn cây đứng chế tác từ gỗ lũa tự nhiên — điểm nhấn ấm áp cho phòng khách và phòng ngủ.',
    cover: '7708825306957729044-cover.jpg',
    products: [
      'den-cay-go-lua-vom-cong',
      'den-cay-go-lua-ke-treo-chup-may',
      'den-cay-go-lua-treo-den-may',
      'den-cay-go-lua-xoan',
      'den-cay-canh-go-lua-treo-long-den',
      'den-cay-go-uon-luon-chup-vai',
      'den-cay-go-lua-phat-sang',
    ],
  },
  {
    handle: 'den-ban-go-lua',
    name: 'Đèn bàn gỗ lũa',
    description: 'Đèn bàn gỗ lũa độc bản cho bàn làm việc, tủ đầu giường và kệ trang trí.',
    cover: '7707394932616498452-cover.jpg',
    products: [
      'den-ban-go-lua-dang-uon',
      'den-ban-go-lua-trang-moc',
      'den-ban-goc-go-lua-chup-vai',
      'den-ban-go-lua-chup-go',
      'den-ngu-go-lua-nguyen-khoi',
    ],
  },
  {
    handle: 'den-ngu-trang-tri',
    name: 'Đèn ngủ & trang trí',
    description:
      'Ánh sáng vàng dịu từ gỗ lũa — đèn ngủ, đèn mây và đèn lồng tạo không gian thư giãn.',
    cover: '7709973442786938132-cover.jpg',
    products: [
      'den-ngu-go-lua-nguyen-khoi',
      'den-cay-go-lua-phat-sang',
      'den-cay-go-lua-treo-den-may',
      'den-cay-canh-go-lua-treo-long-den',
    ],
  },
];

const UPLOADS_PATH = path.resolve(process.cwd(), '../tiktok-import/uploads.json');

export default async function setupLampCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const storeModule = container.resolve(Modules.STORE);
  const productMedia = container.resolve('productMedia') as {
    listProductCategoryImages: (filters: object) => Promise<{ id: string }[]>;
    deleteProductCategoryImages: (ids: string[]) => Promise<void>;
    createProductCategoryImages: (data: object[]) => Promise<unknown>;
  };
  const uploads: Record<string, string> = JSON.parse(fs.readFileSync(UPLOADS_PATH, 'utf8'));

  // 1. Demo + non-lamp products
  const { data: doomedProducts } = await query.graph({
    entity: 'product',
    fields: ['id', 'title', 'handle'],
    filters: { handle: [...DEMO_PRODUCT_HANDLES, ...NON_LAMP_HANDLES] },
  });
  if (doomedProducts.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: doomedProducts.map((p) => p.id) },
    });
    logger.info(`deleted products: ${doomedProducts.map((p) => p.title).join(', ')}`);
  }

  // 2. Demo categories and their images
  const { data: demoCategories } = await query.graph({
    entity: 'product_category',
    fields: ['id', 'name'],
    filters: { handle: DEMO_CATEGORY_HANDLES },
  });
  if (demoCategories.length) {
    const ids = demoCategories.map((c) => c.id);
    const images = await productMedia.listProductCategoryImages({ category_id: ids });
    if (images.length) {
      await productMedia.deleteProductCategoryImages(images.map((i) => i.id));
    }
    await deleteProductCategoriesWorkflow(container).run({ input: ids });
    logger.info(`deleted categories: ${demoCategories.map((c) => c.name).join(', ')}`);
  }

  // 3. Lamp categories
  const { data: existingCats } = await query.graph({
    entity: 'product_category',
    fields: ['id', 'handle'],
    filters: { handle: LAMP_CATEGORIES.map((c) => c.handle) },
  });
  const categoryIdByHandle = new Map(existingCats.map((c) => [c.handle, c.id]));
  const missing = LAMP_CATEGORIES.filter((c) => !categoryIdByHandle.has(c.handle));
  if (missing.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missing.map((c) => ({
          name: c.name,
          handle: c.handle,
          description: c.description,
          is_active: true,
          is_internal: false,
          rank: LAMP_CATEGORIES.indexOf(c),
        })),
      },
    });
    for (const c of result) {
      categoryIdByHandle.set(c.handle, c.id);
    }
    logger.info(`created categories: ${missing.map((c) => c.name).join(', ')}`);
  }

  // Category cover images (relative /media URLs; file_id null so they're used as-is)
  for (const c of LAMP_CATEGORIES) {
    const categoryId = categoryIdByHandle.get(c.handle)!;
    const existing = await productMedia.listProductCategoryImages({ category_id: categoryId });
    if (existing.length) continue;
    const url = `/media/${uploads[c.cover]}`;
    await productMedia.createProductCategoryImages([
      { category_id: categoryId, url, file_id: null, type: 'image' },
      { category_id: categoryId, url, file_id: null, type: 'thumbnail' },
    ]);
  }

  // 4. Assign categories + publish lamps
  const categoriesByProduct = new Map<string, string[]>();
  for (const c of LAMP_CATEGORIES) {
    for (const handle of c.products) {
      categoriesByProduct.set(handle, [
        ...(categoriesByProduct.get(handle) ?? []),
        categoryIdByHandle.get(c.handle)!,
      ]);
    }
  }
  const { data: lamps } = await query.graph({
    entity: 'product',
    fields: ['id', 'handle'],
    filters: { handle: [...categoriesByProduct.keys()] },
  });
  for (const lamp of lamps) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: lamp.id },
        update: {
          status: ProductStatus.PUBLISHED,
          categories: categoriesByProduct.get(lamp.handle)!.map((id) => ({ id })),
        },
      },
    });
  }
  logger.info(`published + categorized ${lamps.length} lamps`);

  // 5. Drop non-lamp items from the homepage reel
  const [store] = await storeModule.listStores({}, { take: 1 });
  const reel = store?.metadata?.tiktok_reel as
    | { items?: { product_handle?: string }[] }
    | undefined;
  if (store && reel?.items?.some((i) => NON_LAMP_HANDLES.includes(i.product_handle ?? ''))) {
    await storeModule.updateStores(store.id, {
      metadata: {
        ...store.metadata,
        tiktok_reel: {
          ...reel,
          items: reel.items.filter((i) => !NON_LAMP_HANDLES.includes(i.product_handle ?? '')),
        },
      },
    });
    logger.info('removed non-lamp items from tiktok_reel');
  }
}
