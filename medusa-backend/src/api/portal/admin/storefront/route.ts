import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { revalidateStorefront } from '../../../../lib/portal/catalog';
import { adminOf, parse } from '../../../../lib/portal/http';
import {
  getStoreStorefrontState,
  saveStoreStorefrontConfig,
} from '../../../../lib/portal/storefront';
import {
  MAX_SECTIONS,
  sanitizeStorefrontConfig,
  TEMPLATE_IDS,
} from '../../../../lib/portal/storefront-config';

// The theme id is validated strictly here; the deep, owner-typed parts are sanitized
// field by field in sanitizeStorefrontConfig (unknown types/keys are dropped, links and
// images are restricted) because they end up on the public storefront.
const schema = z.object({
  template_id: z.enum(TEMPLATE_IDS),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  home: z.array(z.any()).max(MAX_SECTIONS).nullable().optional(),
  header: z.any().nullable().optional(),
  footer: z.any().nullable().optional(),
  branding: z.any().nullable().optional(),
  texts: z.record(z.any()).optional(),
});

/** Published config + the unpublished draft (if any) of the admin's own store. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  res.json(await getStoreStorefrontState(req.scope, store_id));
}

/** Publishes directly (the editor uses /draft and /publish; this stays for scripts). */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const body = parse(schema, req.body);
  const config = await saveStoreStorefrontConfig(
    req.scope,
    store_id,
    sanitizeStorefrontConfig(body)
  );
  await revalidateStorefront(req.scope, ['storefront-config', 'store-branding']);
  res.json({ config });
}
