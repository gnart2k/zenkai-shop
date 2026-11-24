import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { adminOf, portalOf } from '../../../../../lib/portal/http';
import { buildPaymentLink } from '../../../../../lib/portal/payment-link';
import { computeEarning, computeStoreMargin } from '../../../../../modules/portal/lib/money';

/** Admin review view: adds original cost, collaborator earning and store margin. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const portal = portalOf(req);
  const [request] = await portal.listCollabRequests({ id: req.params.id, store_id }, { take: 1 });
  if (!request) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Request not found');
  }
  const [cost] = await portal.listVariantCosts({ variant_id: request.variant_id }, { take: 1 });
  const original_cost = cost ? Number(cost.original_cost) : null;
  const collaborator = await portal.retrieveCollaborator(request.collaborator_id);
  res.json({
    request,
    collaborator: { id: collaborator.id, email: collaborator.email, name: collaborator.name },
    original_cost,
    // No email provider yet, so the admin can copy the customer's link from here.
    payment_link: ['approved', 'paid'].includes(request.status)
      ? buildPaymentLink(request.id)
      : null,
    collaborator_earning: computeEarning(
      Number(request.commercial_price),
      Number(request.original_price),
      request.quantity
    ),
    store_margin:
      original_cost === null
        ? null
        : computeStoreMargin(Number(request.original_price), original_cost, request.quantity),
  });
}
