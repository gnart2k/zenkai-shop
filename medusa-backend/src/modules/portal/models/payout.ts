import { model } from '@medusajs/framework/utils';

/** Monthly settlement of a collaborator's unpaid ledger entries. */
const Payout = model.define('payout', {
  id: model.id({ prefix: 'payout' }).primaryKey(),
  store_id: model.text(),
  collaborator_id: model.text(),
  /** Period label, e.g. 2026-11. */
  period: model.text(),
  amount: model.bigNumber(),
  currency_code: model.text(),
  status: model.enum(['pending', 'paid']).default('pending'),
  paid_at: model.dateTime().nullable(),
  note: model.text().nullable(),
});

export default Payout;
