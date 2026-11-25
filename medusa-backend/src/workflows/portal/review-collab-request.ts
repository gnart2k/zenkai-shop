import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils';
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { createCartWorkflow } from '@medusajs/medusa/core-flows';
import { getStore, storeCurrency } from '../../lib/portal/catalog';
import { sendPortalEmail } from '../../lib/portal/email';
import { buildPaymentLink } from '../../lib/portal/payment-link';
import { PORTAL_MODULE } from '../../modules/portal';
import type PortalModuleService from '../../modules/portal/service';

type ReviewInput = { request_id: string; store_id: string; reviewer_id: string };

/** Loads a request and makes sure it is pending and belongs to the admin's store. */
async function loadPending(
  portal: PortalModuleService,
  input: { request_id: string; store_id: string }
) {
  const [request] = await portal.listCollabRequests(
    { id: input.request_id, store_id: input.store_id },
    { take: 1 }
  );
  if (!request) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Request not found');
  }
  if (request.status !== 'pending') {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Request is already ${request.status}`);
  }
  return request;
}

/** Everything needed to create the customer's cart, resolved up front. */
const prepareCartStep = createStep(
  'portal-prepare-approval-cart',
  async (input: ReviewInput, { container }) => {
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
    const request = await loadPending(portal, input);
    const store = await getStore(container, request.store_id);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data: regions } = await query.graph({
      entity: 'region',
      fields: ['id', 'currency_code'],
      filters: { currency_code: request.currency_code },
    });
    const region = regions.find((r: any) => r.id === store.default_region_id) ?? regions[0];
    if (!region || !store.default_sales_channel_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Store needs a region for ${storeCurrency(store).toUpperCase()} and a default sales channel`
      );
    }
    return new StepResponse({
      request_id: request.id,
      cart: {
        region_id: region.id as string,
        currency_code: request.currency_code,
        sales_channel_id: store.default_sales_channel_id as string,
        email: request.customer_email,
        items: [
          {
            variant_id: request.variant_id,
            quantity: request.quantity,
            // Commercial price set by the collaborator, not the catalog price.
            unit_price: Number(request.commercial_price),
          },
        ],
        metadata: {
          collab_request_id: request.id,
          collaborator_id: request.collaborator_id,
          store_id: request.store_id,
        },
      },
    });
  }
);

const markApprovedStep = createStep(
  'portal-mark-request-approved',
  async (input: { request_id: string; cart_id: string; reviewer_id: string }, { container }) => {
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
    const updated = await portal.updateCollabRequests({
      id: input.request_id,
      status: 'approved',
      cart_id: input.cart_id,
      reviewed_by: input.reviewer_id,
      reviewed_at: new Date(),
    });
    return new StepResponse(updated, input.request_id);
  },
  async (requestId, { container }) => {
    if (requestId) {
      await container.resolve<PortalModuleService>(PORTAL_MODULE).updateCollabRequests({
        id: requestId,
        status: 'pending',
        cart_id: null,
        reviewed_by: null,
        reviewed_at: null,
      });
    }
  }
);

const notifyApprovedStep = createStep(
  'portal-notify-request-approved',
  async (input: { request_id: string }, { container }) => {
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
    const request = await portal.retrieveCollabRequest(input.request_id);
    const collaborator = await portal.retrieveCollaborator(request.collaborator_id);
    const payment_link = await buildPaymentLink(container, request);
    const data = { request_id: request.id, payment_link };
    await sendPortalEmail(container, {
      to: collaborator.email,
      template: 'portal-request-approved-collaborator',
      data,
    });
    await sendPortalEmail(container, {
      to: request.customer_email,
      template: 'portal-request-approved-customer',
      data,
    });
    return new StepResponse({ payment_link });
  }
);

export const approveCollabRequestWorkflow = createWorkflow(
  'portal-approve-collab-request',
  (input: ReviewInput) => {
    const prepared = prepareCartStep(input);
    const cartInput = transform({ prepared }, ({ prepared }) => prepared.cart);
    const cart = createCartWorkflow.runAsStep({ input: cartInput });
    const markInput = transform({ input, cart }, ({ input, cart }) => ({
      request_id: input.request_id,
      cart_id: (cart as { id: string }).id,
      reviewer_id: input.reviewer_id,
    }));
    const request = markApprovedStep(markInput);
    const link = notifyApprovedStep({ request_id: input.request_id });
    return new WorkflowResponse({ request, payment_link: link.payment_link });
  }
);

const markRejectedStep = createStep(
  'portal-mark-request-rejected',
  async (input: ReviewInput & { reason: string }, { container }) => {
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
    await loadPending(portal, input);
    const updated = await portal.updateCollabRequests({
      id: input.request_id,
      status: 'rejected',
      reject_reason: input.reason,
      reviewed_by: input.reviewer_id,
      reviewed_at: new Date(),
    });
    const collaborator = await portal.retrieveCollaborator(updated.collaborator_id);
    await sendPortalEmail(container, {
      to: collaborator.email,
      template: 'portal-request-rejected',
      data: { request_id: updated.id, reason: input.reason },
    });
    return new StepResponse(updated, input.request_id);
  },
  async (requestId, { container }) => {
    if (requestId) {
      await container.resolve<PortalModuleService>(PORTAL_MODULE).updateCollabRequests({
        id: requestId,
        status: 'pending',
        reject_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      });
    }
  }
);

export const rejectCollabRequestWorkflow = createWorkflow(
  'portal-reject-collab-request',
  (input: ReviewInput & { reason: string }) => {
    return new WorkflowResponse(markRejectedStep(input));
  }
);
