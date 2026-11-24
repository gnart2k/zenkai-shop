import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { adminOf, portalOf } from '../../../../lib/portal/http';
import { netAmount } from '../../../../modules/portal/lib/money';

/** What each collaborator is currently owed (unsettled ledger, net of reversals). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const entries = await portalOf(req).listEarningLedgerEntries({ store_id, payout_id: null });
  const byKey = new Map<string, typeof entries>();
  for (const e of entries) {
    const k = `${e.collaborator_id}|${e.currency_code}`;
    byKey.set(k, [...(byKey.get(k) ?? []), e]);
  }
  res.json({
    owed: [...byKey].map(([k, list]) => {
      const [collaborator_id, currency_code] = k.split('|');
      return {
        collaborator_id,
        currency_code,
        net: netAmount(list.map((e) => ({ amount: Number(e.amount) }))),
        entries: list.length,
      };
    }),
  });
}
