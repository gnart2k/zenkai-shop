import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse } from '../../../../../lib/portal/http';
import {
  discardStoreStorefrontDraft,
  saveStoreStorefrontDraft,
} from '../../../../../lib/portal/storefront';
import {
  MAX_SECTIONS,
  sanitizeStorefrontConfig,
  TEMPLATE_IDS,
} from '../../../../../lib/portal/storefront-config';

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

/** Saves the draft. Visitors keep seeing the published storefront. */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const body = parse(schema, req.body);
  res.json(await saveStoreStorefrontDraft(req.scope, store_id, sanitizeStorefrontConfig(body)));
}

/** Throws the draft away. */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  await discardStoreStorefrontDraft(req.scope, store_id);
  res.json({ discarded: true });
}
