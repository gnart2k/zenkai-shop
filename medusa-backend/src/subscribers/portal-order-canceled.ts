import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { PORTAL_MODULE } from '../modules/portal';
import type PortalModuleService from '../modules/portal/service';
import { reverseEarningWorkflow } from '../workflows/portal/ledger';

/** Order cancelled: reverse the collaborator's earning with a negative entry. */
export default async function portalOrderCanceled({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const [request] = await portal.listCollabRequests({ order_id: data.id }, { take: 1 });
  if (!request) {
    return;
  }
  await reverseEarningWorkflow(container).run({
    input: { request_id: request.id, reason: 'Order cancelled' },
  });
}

export const config: SubscriberConfig = { event: 'order.canceled' };
