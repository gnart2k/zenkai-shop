import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { BASE_DOMAIN, CNAME_TARGET } from '../../../../lib/portal/domains';
import { parse } from '../../../../lib/portal/http';
import { createTenant, listTenants } from '../../../../lib/portal/tenants';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  currency_code: z.string().regex(/^[a-zA-Z]{3}$/),
  deposit_percent: z.number().min(0).max(100).optional(),
  slug: z.string().trim().min(2).max(40).optional(),
  stock_location_ids: z.array(z.string()).max(50).optional(),
  admin_email: z.string().email().optional().nullable(),
  admin_name: z.string().trim().max(80).optional().nullable(),
});

/** Medusa (platform) admin: every tenant (store) with its portal admin, settings and activity. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({
    stores: await listTenants(req.scope),
    // The one fixed portal address every tenant's admin and collaborators sign in at.
    base_domain: BASE_DOMAIN,
    cname_target: CNAME_TARGET,
    portal_url: (process.env.PORTAL_URL || 'http://localhost:4100/portal').replace(/\/$/, ''),
  });
}

/** Creates a tenant: store + sales channel + publishable key + portal settings (+ portal admin invite). */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parse(schema, req.body);
  res.status(201).json(await createTenant(req.scope, body));
}
