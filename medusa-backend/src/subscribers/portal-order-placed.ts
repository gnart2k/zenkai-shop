import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { PORTAL_MODULE } from '../modules/portal';
import type PortalModuleService from '../modules/portal/service';
import { recordOrderPaidWorkflow } from '../workflows/portal/ledger';

/**
 * A portal payment link is a cart created at approval. When that cart completes
 * into an order, mark the request paid and log the collaborator's earning.
 */
export default async function portalOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: links } = await query.graph({
    entity: 'order_cart',
    fields: ['order_id', 'cart_id'],
    filters: { order_id: data.id },
  });
  const cartId = (links[0] as { cart_id?: string } | undefined)?.cart_id;
  if (!cartId) {
    return;
  }
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const [request] = await portal.listCollabRequests({ cart_id: cartId }, { take: 1 });
  if (!request || request.status !== 'approved') {
    return;
  }
  await recordOrderPaidWorkflow(container).run({
    input: { request_id: request.id, order_id: data.id },
  });
}

export const config: SubscriberConfig = { event: 'order.placed' };
