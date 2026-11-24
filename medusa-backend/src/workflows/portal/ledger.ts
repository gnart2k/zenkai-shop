import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { PORTAL_MODULE } from '../../modules/portal';
import { computeEarning, netAmount } from '../../modules/portal/lib/money';
import type PortalModuleService from '../../modules/portal/service';

type PaidState = { request_id: string; entry_id?: string } | null;
type ReverseState = { request_id: string; entry_id: string } | null;
type EntryOut = { entry_id: string | null };

const portalOf = (container: { resolve: (k: string) => unknown }) =>
  container.resolve(PORTAL_MODULE) as PortalModuleService;

/**
 * Order paid: mark the request paid and log the collaborator's earning
 * ((commercial - original price) x qty). Idempotent per request.
 */
const recordPaidStep = createStep(
  'portal-record-order-paid',
  async (input: { request_id: string; order_id: string }, { container }) => {
    const portal = portalOf(container);
    const request = await portal.retrieveCollabRequest(input.request_id);
    if (request.status === 'paid' || request.status === 'cancelled') {
      return new StepResponse<EntryOut, PaidState>({ entry_id: null }, null);
    }

    await portal.updateCollabRequests({
      id: request.id,
      status: 'paid',
      order_id: input.order_id,
      paid_at: new Date(),
    });

    const [existing] = await portal.listEarningLedgerEntries(
      { request_id: request.id, type: 'earning' },
      { take: 1 }
    );
    if (existing) {
      return new StepResponse<EntryOut, PaidState>(
        { entry_id: existing.id },
        { request_id: request.id }
      );
    }
    const entry = await portal.createEarningLedgerEntries({
      store_id: request.store_id,
      collaborator_id: request.collaborator_id,
      request_id: request.id,
      order_id: input.order_id,
      type: 'earning',
      amount: computeEarning(
        Number(request.commercial_price),
        Number(request.original_price),
        request.quantity
      ),
      currency_code: request.currency_code,
    });
    return new StepResponse<EntryOut, PaidState>(
      { entry_id: entry.id },
      { request_id: request.id, entry_id: entry.id }
    );
  },
  async (state, { container }) => {
    if (!state) {
      return;
    }
    const portal = portalOf(container);
    if (state.entry_id) {
      await portal.deleteEarningLedgerEntries(state.entry_id);
    }
    await portal.updateCollabRequests({
      id: state.request_id,
      status: 'approved',
      order_id: null,
      paid_at: null,
    });
  }
);

export const recordOrderPaidWorkflow = createWorkflow(
  'portal-record-order-paid',
  (input: { request_id: string; order_id: string }) => new WorkflowResponse(recordPaidStep(input))
);

/**
 * Refund / cancel: append a negative entry cancelling the earning. The original
 * entry is never edited so the audit trail stays intact. If the earning was
 * already paid out, the negative entry is unsettled and nets off the next payout.
 */
const reverseStep = createStep(
  'portal-reverse-earning',
  async (input: { request_id: string; reason?: string }, { container }) => {
    const portal = portalOf(container);
    const entries = await portal.listEarningLedgerEntries({ request_id: input.request_id });
    const earned = netAmount(entries.map((e) => ({ amount: Number(e.amount) })));
    const earning = entries.find((e) => e.type === 'earning');
    if (!earning || entries.some((e) => e.type === 'reversal') || earned <= 0) {
      return new StepResponse<EntryOut, ReverseState>({ entry_id: null }, null);
    }
    const reversal = await portal.createEarningLedgerEntries({
      store_id: earning.store_id,
      collaborator_id: earning.collaborator_id,
      request_id: earning.request_id,
      order_id: earning.order_id,
      type: 'reversal',
      amount: -earned,
      currency_code: earning.currency_code,
      note: input.reason ?? 'Order refunded or cancelled',
    });
    await portal.updateCollabRequests({ id: input.request_id, status: 'cancelled' });
    return new StepResponse<EntryOut, ReverseState>(
      { entry_id: reversal.id },
      { entry_id: reversal.id, request_id: input.request_id }
    );
  },
  async (state, { container }) => {
    if (state) {
      const portal = portalOf(container);
      await portal.deleteEarningLedgerEntries(state.entry_id);
      await portal.updateCollabRequests({ id: state.request_id, status: 'paid' });
    }
  }
);

export const reverseEarningWorkflow = createWorkflow(
  'portal-reverse-earning',
  (input: { request_id: string; reason?: string }) => new WorkflowResponse(reverseStep(input))
);
