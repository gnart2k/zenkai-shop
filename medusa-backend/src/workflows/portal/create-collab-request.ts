import { MedusaError } from '@medusajs/framework/utils';
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { resolveVariantForStore } from '../../lib/portal/catalog';
import { sendPortalEmail } from '../../lib/portal/email';
import { getStoreSettings } from '../../lib/portal/settings';
import { PORTAL_MODULE } from '../../modules/portal';
import { computeDeposit } from '../../modules/portal/lib/money';
import type PortalModuleService from '../../modules/portal/service';

export type CreateCollabRequestInput = {
  store_id: string;
  collaborator_id: string;
  variant_id: string;
  quantity: number;
  commercial_price: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  customer_address?: string | null;
  proof_url: string;
  proof_file_id?: string | null;
};

/** Checks membership + pricing rules and snapshots prices and deposit. */
const buildRequestStep = createStep(
  'portal-build-collab-request',
  async (input: CreateCollabRequestInput, { container }) => {
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);

    const [membership] = await portal.listStoreCollaborators(
      { store_id: input.store_id, collaborator_id: input.collaborator_id, status: 'active' },
      { take: 1 }
    );
    if (!membership) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Not a collaborator of this store');
    }

    const resolved = await resolveVariantForStore(container, input.store_id, input.variant_id);
    if (input.commercial_price < resolved.original_price) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Selling price cannot be lower than the original price'
      );
    }

    const settings = await getStoreSettings(container, input.store_id);
    const data = {
      store_id: input.store_id,
      collaborator_id: input.collaborator_id,
      variant_id: resolved.variant_id,
      sku: resolved.sku,
      product_title: resolved.product_title,
      quantity: input.quantity,
      currency_code: resolved.currency_code,
      original_price: resolved.original_price,
      commercial_price: input.commercial_price,
      deposit_percent: settings.deposit_percent,
      deposit_amount: computeDeposit(
        input.commercial_price,
        input.quantity,
        settings.deposit_percent
      ),
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone ?? null,
      customer_address: input.customer_address ?? null,
      proof_url: input.proof_url,
      proof_file_id: input.proof_file_id ?? null,
      status: 'pending' as const,
    };
    return new StepResponse(data);
  }
);

const persistRequestStep = createStep(
  'portal-persist-collab-request',
  async (data: Record<string, any>, { container }) => {
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
    const request = await portal.createCollabRequests(data as any);
    return new StepResponse(request, request.id);
  },
  async (id, { container }) => {
    if (id) {
      await container.resolve<PortalModuleService>(PORTAL_MODULE).deleteCollabRequests(id);
    }
  }
);

const notifyAdminsStep = createStep(
  'portal-notify-admins-new-request',
  async (request: { id: string; store_id: string; sku?: string | null }, { container }) => {
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
    const admins = await portal.listPortalAdmins({ store_id: request.store_id });
    const settings = await getStoreSettings(container, request.store_id);
    const recipients = new Set<string>(admins.map((a) => a.email));
    if (!recipients.size && settings.default_contact_email) {
      recipients.add(settings.default_contact_email);
    }
    for (const to of recipients) {
      await sendPortalEmail(container, {
        to,
        template: 'portal-new-request',
        data: { request_id: request.id, sku: request.sku },
      });
    }
    return new StepResponse(null);
  }
);

export const createCollabRequestWorkflow = createWorkflow(
  'portal-create-collab-request',
  (input: CreateCollabRequestInput) => {
    const data = buildRequestStep(input);
    const request = persistRequestStep(data);
    notifyAdminsStep(request as any);
    return new WorkflowResponse(request);
  }
);
