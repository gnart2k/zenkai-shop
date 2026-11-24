import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { actorIdOf, parse, portalOf } from '../../../../../../lib/portal/http';
import { serializeCollaboratorRequest } from '../../../../../../lib/portal/serializers';
import { createCollabRequestWorkflow } from '../../../../../../workflows/portal/create-collab-request';

const schema = z.object({
  variant_id: z.string().min(1),
  quantity: z.number().int().positive(),
  commercial_price: z.number().positive(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().optional().nullable(),
  proof_url: z.string().url(),
  proof_file_id: z.string().optional().nullable(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const requests = await portalOf(req).listCollabRequests(
    { store_id: req.params.store_id, collaborator_id: actorIdOf(req) },
    { order: { created_at: 'DESC' } }
  );
  res.json({ requests: requests.map(serializeCollaboratorRequest) });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parse(schema, req.body);
  const { result } = await createCollabRequestWorkflow(req.scope).run({
    input: { ...body, store_id: req.params.store_id, collaborator_id: actorIdOf(req) },
  });
  res.status(201).json({ request: serializeCollaboratorRequest(result) });
}
