import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { parse } from '../../../../lib/portal/http';
import { acceptInvite } from '../../../../lib/portal/invites';

const schema = z.object({ token: z.string().min(10), password: z.string().min(8) });

/** Public. Creates the login for an invited collaborator / portal admin. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parse(schema, req.body);
  const result = await acceptInvite(req.scope, body);
  res.status(201).json({
    ...result,
    login_path: `/auth/${result.actor}/emailpass`,
  });
}
