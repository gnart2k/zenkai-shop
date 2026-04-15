import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { updateStoresWorkflow } from '@medusajs/medusa/core-flows';

/**
 * Idempotent: merges VND into the store's supported_currencies using the same
 * workflow as Admin (updates price preferences). Safe to run on existing DBs
 * where full `seed.ts` would fail (e.g. regions already exist).
 */
export default async function ensureStoreCurrencies({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: stores } = await query.graph({
    entity: 'store',
    fields: ['id', 'supported_currencies.currency_code', 'supported_currencies.is_default'],
  });

  const store = stores?.[0];
  if (!store) {
    throw new Error('No store found.');
  }

  const existing = (store.supported_currencies ?? []) as {
    currency_code: string;
    is_default?: boolean;
  }[];

  if (existing.some((c) => c.currency_code?.toLowerCase() === 'vnd')) {
    logger.info('Store already includes VND in supported currencies.');
    return;
  }

  const merged = [
    ...existing.map((c) => ({
      currency_code: c.currency_code.toLowerCase(),
      is_default: !!c.is_default,
    })),
    { currency_code: 'vnd', is_default: false },
  ];

  if (!merged.some((c) => c.is_default)) {
    merged[0] = { ...merged[0], is_default: true };
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: merged,
      },
    },
  });

  logger.info('Added VND to store supported currencies.');
}
