import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

const EVENTS = ['product_category.created', 'product_category.updated', 'product_category.deleted'];

export default async function productCategoryRevalidateHandler({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger');
  const storefrontUrl = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!storefrontUrl || !secret) {
    logger.warn(
      `[category-revalidate] SKIP: STOREFRONT_URL or REVALIDATE_SECRET not set (event=${name})`
    );
    return;
  }

  const url = `${storefrontUrl}/api/revalidate?tags=categories&secret=${secret}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      logger.error(`[category-revalidate] FAILED: ${url} -> ${res.status}`);
      return;
    }
    logger.info(`[category-revalidate] OK event=${name} categoryId=${data.id}`);
  } catch (err) {
    logger.error(
      `[category-revalidate] ERROR: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export const config: SubscriberConfig = {
  event: EVENTS,
};
