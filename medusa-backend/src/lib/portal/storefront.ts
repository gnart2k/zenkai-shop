import type { MedusaContainer } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { getStore } from './catalog';
import type { StorefrontConfig } from './storefront-config';
import { readStorefrontConfig, sanitizeStorefrontConfig } from './storefront-config';

type Container = Pick<MedusaContainer, 'resolve'>;

/**
 * The published config lives in metadata.storefront and the unpublished draft in
 * metadata.storefront_draft (same shape + updated_at). Visitors only ever see the
 * published one; the draft is visible through a signed preview link.
 */
export type StorefrontState = {
  store_name: string;
  config: StorefrontConfig;
  draft: StorefrontConfig | null;
  draft_updated_at: string | null;
};

export async function getStoreStorefrontState(
  container: Container,
  storeId: string
): Promise<StorefrontState> {
  const store = await getStore(container, storeId);
  const meta = await container
    .resolve(Modules.STORE)
    .retrieveStore(storeId, { select: ['id', 'metadata'] });
  const md = (meta.metadata as Record<string, any>) ?? {};
  const draftRaw = md.storefront_draft;
  return {
    store_name: store.name as string,
    config: readStorefrontConfig(md),
    draft: draftRaw ? sanitizeStorefrontConfig(draftRaw) : null,
    draft_updated_at: typeof draftRaw?.updated_at === 'string' ? draftRaw.updated_at : null,
  };
}

/** Back-compat helper (published config only). */
export async function getStoreStorefrontConfig(container: Container, storeId: string) {
  const { store_name, config } = await getStoreStorefrontState(container, storeId);
  return { store_name, config };
}

async function writeMetadata(
  container: Container,
  storeId: string,
  patch: Record<string, unknown>
) {
  const storeModule = container.resolve(Modules.STORE);
  const current = await storeModule.retrieveStore(storeId, { select: ['id', 'metadata'] });
  const next = { ...((current.metadata as Record<string, unknown>) ?? {}), ...patch };
  for (const k of Object.keys(next)) {
    if (next[k] === undefined) delete next[k];
  }
  await storeModule.updateStores(storeId, { metadata: next });
}

/** Saves the draft only; nothing changes for visitors. */
export async function saveStoreStorefrontDraft(
  container: Container,
  storeId: string,
  config: StorefrontConfig
) {
  const clean = sanitizeStorefrontConfig(config);
  const updated_at = new Date().toISOString();
  await writeMetadata(container, storeId, { storefront_draft: { ...clean, updated_at } });
  return { config: clean, updated_at };
}

export async function discardStoreStorefrontDraft(container: Container, storeId: string) {
  await writeMetadata(container, storeId, { storefront_draft: undefined });
}

/** Publishes the given config (or the stored draft) and clears the draft. */
export async function publishStoreStorefront(
  container: Container,
  storeId: string,
  config?: StorefrontConfig
) {
  const state = await getStoreStorefrontState(container, storeId);
  const source = config ? sanitizeStorefrontConfig(config) : state.draft;
  if (!source) return null;
  await writeMetadata(container, storeId, { storefront: source, storefront_draft: undefined });
  return source;
}

/** Back-compat: publish directly. */
export async function saveStoreStorefrontConfig(
  container: Container,
  storeId: string,
  config: StorefrontConfig
) {
  return publishStoreStorefront(container, storeId, config);
}
