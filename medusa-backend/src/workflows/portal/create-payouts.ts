import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { PORTAL_MODULE } from '../../modules/portal';
import { netAmount } from '../../modules/portal/lib/money';
import type PortalModuleService from '../../modules/portal/service';

export type CreatePayoutsInput = { store_id: string; period?: string };

const currentPeriod = () => new Date().toISOString().slice(0, 7);

/**
 * Month-end settlement: one payout per collaborator (and currency) covering every
 * unsettled ledger entry, net of reversals. A non-positive net is carried over:
 * no payout is created and the entries stay unsettled for next month.
 */
const createPayoutsStep = createStep(
  'portal-create-payouts',
  async (input: CreatePayoutsInput, { container }) => {
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
    const period = input.period ?? currentPeriod();
    const entries = await portal.listEarningLedgerEntries({
      store_id: input.store_id,
      payout_id: null,
    });

    const groups = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = `${e.collaborator_id}|${e.currency_code}`;
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }

    const created: { id: string; entry_ids: string[] }[] = [];
    for (const [key, list] of groups) {
      const [collaborator_id, currency_code] = key.split('|');
      const amount = netAmount(list.map((e) => ({ amount: Number(e.amount) })));
      if (amount <= 0) {
        continue;
      }
      const payout = await portal.createPayouts({
        store_id: input.store_id,
        collaborator_id,
        period,
        amount,
        currency_code,
        status: 'pending',
      });
      await portal.updateEarningLedgerEntries(
        list.map((e) => ({ id: e.id, payout_id: payout.id }))
      );
      created.push({ id: payout.id, entry_ids: list.map((e) => e.id) });
    }
    return new StepResponse(created, created);
  },
  async (created, { container }) => {
    if (!created?.length) {
      return;
    }
    const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
    for (const p of created) {
      await portal.updateEarningLedgerEntries(p.entry_ids.map((id) => ({ id, payout_id: null })));
      await portal.deletePayouts(p.id);
    }
  }
);

export const createPayoutsWorkflow = createWorkflow(
  'portal-create-payouts',
  (input: CreatePayoutsInput) => new WorkflowResponse(createPayoutsStep(input))
);
