import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { getStore } from '../../../../../../lib/portal/catalog';
import { CNAME_TARGET } from '../../../../../../lib/portal/domains';
import { parse } from '../../../../../../lib/portal/http';
import {
  addCustomDomain,
  removeCustomDomain,
  verifyCustomDomain,
} from '../../../../../../lib/portal/tenants';

const schema = z.object({ host: z.string().trim().min(3).max(253) });

/** Adds a custom domain. It serves nothing until its CNAME is verified. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  await getStore(req.scope, req.params.id);
  const { host } = parse(schema, req.body);
  res.status(201).json({
    host: await addCustomDomain(req.scope, req.params.id, host),
    cname_target: CNAME_TARGET,
  });
}

/** Checks DNS now: marks the domain verified if it CNAMEs to the storefront target. */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  await getStore(req.scope, req.params.id);
  const { host } = parse(schema, req.body);
  res.json({
    ...(await verifyCustomDomain(req.scope, req.params.id, host)),
    cname_target: CNAME_TARGET,
  });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await getStore(req.scope, req.params.id);
  const { host } = parse(schema, req.body);
  await removeCustomDomain(req.scope, req.params.id, host);
  res.json({ host, deleted: true });
}
