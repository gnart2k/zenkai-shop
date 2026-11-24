import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { portalOf } from '../../../../lib/portal/http';
import { getStoreSettings } from '../../../../lib/portal/settings';
import { verifyToken } from '../../../../modules/portal/lib/token';

/**
 * Public data for the customer's payment page. The storefront uses cart_id to run
 * the normal checkout. Contact shown is the collaborator's, else the store default.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyToken<{ kind: string; rid: string }>(req.params.token);
  if (!payload || payload.kind !== 'pay') {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Payment link not found');
  }
  const portal = portalOf(req);
  const request = await portal.retrieveCollabRequest(payload.rid).catch(() => null);
  if (!request || !['approved', 'paid'].includes(request.status)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Payment link not found');
  }
  const collaborator = await portal.retrieveCollaborator(request.collaborator_id);
  const settings = await getStoreSettings(req.scope, request.store_id);

  const hasCollaboratorInfo = !!(collaborator.name || collaborator.phone);
  const contact = hasCollaboratorInfo
    ? {
        source: 'collaborator',
        name: collaborator.name,
        email: collaborator.email,
        phone: collaborator.phone,
      }
    : {
        source: 'store_default',
        email: settings.default_contact_email ?? collaborator.email,
      };

  res.json({
    status: request.status,
    cart_id: request.cart_id,
    order_id: request.order_id,
    product_title: request.product_title,
    sku: request.sku,
    quantity: request.quantity,
    currency_code: request.currency_code,
    unit_price: Number(request.commercial_price),
    deposit_amount: Number(request.deposit_amount),
    contact,
  });
}
