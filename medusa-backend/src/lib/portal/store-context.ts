import type { MedusaRequest } from '@medusajs/framework/http';
import type { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

type Container = Pick<MedusaContainer, 'resolve'>;

/**
 * The store a public (/store/*) request belongs to: the store whose default sales channel is
 * one of the request's publishable key channels. With a single store and no match it falls
 * back to that store (legacy single-store setups); with several stores and no match: null,
 * never "the first store".
 */
export async function resolveStoreForRequest(
  req: MedusaRequest,
  fields: string[] = ['id', 'name', 'metadata', 'default_sales_channel_id']
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'store',
    fields: Array.from(new Set([...fields, 'id', 'default_sales_channel_id'])),
  });
  const stores = data as any[];
  const channelIds: string[] = (req as any).publishable_key_context?.sales_channel_ids ?? [];
  const match = stores.find(
    (s) => s.default_sales_channel_id && channelIds.includes(s.default_sales_channel_id)
  );
  if (match) return match;
  return stores.length === 1 ? stores[0] : null;
}

/** Lower-case hostname without port or trailing dot, or null if it is not a valid hostname. */
export function normalizeHost(raw: string): string | null {
  const host = raw.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/.test(
    host
  )
    ? host
    : null;
}

/** The publishable key tokens that sell through this store's sales channel. */
export async function publishableKeysOfStore(
  container: Container,
  store: { default_sales_channel_id?: string | null }
) {
  if (!store.default_sales_channel_id) return [];
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'api_key',
    fields: ['id', 'title', 'token', 'sales_channels.id'],
    filters: { type: 'publishable' },
  });
  return (data as any[])
    .filter((k) =>
      (k.sales_channels ?? []).some((c: any) => c.id === store.default_sales_channel_id)
    )
    .map((k) => ({ id: k.id as string, title: k.title as string, token: k.token as string }));
}
