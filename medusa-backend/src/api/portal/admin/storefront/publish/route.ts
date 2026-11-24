import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { revalidateStorefront } from '../../../../../lib/portal/catalog';
import { adminOf } from '../../../../../lib/portal/http';
import { publishStoreStorefront } from '../../../../../lib/portal/storefront';

/**
 * Makes the draft the live storefront. A config in the body is published directly
 * (the editor's one-click "save and publish"); without a body the stored draft is used.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const body =
    req.body && typeof req.body === 'object' && Object.keys(req.body).length
      ? (req.body as any)
      : undefined;
  const config = await publishStoreStorefront(req.scope, store_id, body);
  if (!config) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'There is no draft to publish');
  }
  await revalidateStorefront(req.scope, ['storefront-config', 'store-branding']);
  res.json({ config });
}
