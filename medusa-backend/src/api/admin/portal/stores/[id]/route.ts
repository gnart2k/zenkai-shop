import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { getStore } from '../../../../../lib/portal/catalog';
import { parse } from '../../../../../lib/portal/http';
import { deleteTenant, updateTenant } from '../../../../../lib/portal/tenants';

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  deposit_percent: z.number().min(0).max(100).optional(),
  default_contact_email: z.string().email().nullable().optional(),
  slug: z.string().trim().min(2).max(40).optional(),
});

/** Medusa (platform) admin: rename a store, change its deposit, contact email and storefront domains. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  await getStore(req.scope, id);
  await updateTenant(req.scope, id, parse(schema, req.body));
  res.json({ id });
}

/** Deletes a tenant (refused while it has collaborator requests or payouts, and for the only store). */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  await deleteTenant(req.scope, id);
  res.json({ id, deleted: true });
}
