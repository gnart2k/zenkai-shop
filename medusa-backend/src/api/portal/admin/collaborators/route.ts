import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse, portalOf } from '../../../../lib/portal/http';
import { inviteCollaborator } from '../../../../lib/portal/invites';

const schema = z.object({ email: z.string().email(), name: z.string().optional().nullable() });

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const portal = portalOf(req);
  const memberships = await portal.listStoreCollaborators({ store_id });
  const collaborators = memberships.length
    ? await portal.listCollaborators({ id: memberships.map((m) => m.collaborator_id) })
    : [];
  res.json({
    collaborators: memberships.map((m) => {
      const c = collaborators.find((x) => x.id === m.collaborator_id);
      return { id: m.collaborator_id, email: c?.email, name: c?.name, status: m.status };
    }),
  });
}

/** Invite by email. The link is also returned so it can be shared if email is not set up. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const body = parse(schema, req.body);
  const { collaborator, membership, invite_link } = await inviteCollaborator(req.scope, {
    store_id,
    ...body,
  });
  res.status(201).json({
    collaborator: { id: collaborator.id, email: collaborator.email, status: membership.status },
    invite_link,
  });
}
