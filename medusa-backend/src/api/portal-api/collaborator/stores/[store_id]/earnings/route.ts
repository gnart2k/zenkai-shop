import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { actorIdOf, portalOf } from '../../../../../../lib/portal/http';
import { netAmount } from '../../../../../../modules/portal/lib/money';

/** The collaborator's own ledger for one store: what is owed and what was paid. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const portal = portalOf(req);
  const filter = { store_id: req.params.store_id, collaborator_id: actorIdOf(req) };
  const [entries, payouts] = await Promise.all([
    portal.listEarningLedgerEntries(filter, { order: { created_at: 'DESC' } }),
    portal.listPayouts(filter, { order: { created_at: 'DESC' } }),
  ]);
  const unsettled = entries.filter((e) => !e.payout_id);
  res.json({
    owed: netAmount(unsettled.map((e) => ({ amount: Number(e.amount) }))),
    entries: entries.map((e) => ({
      id: e.id,
      request_id: e.request_id,
      order_id: e.order_id,
      type: e.type,
      amount: Number(e.amount),
      currency_code: e.currency_code,
      settled: !!e.payout_id,
      note: e.note,
      created_at: e.created_at,
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      period: p.period,
      amount: Number(p.amount),
      currency_code: p.currency_code,
      status: p.status,
      paid_at: p.paid_at,
    })),
  });
}
