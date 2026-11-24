import { model } from '@medusajs/framework/utils';

/**
 * Append-only ledger. Earnings are positive, reversals (refund / cancel) are
 * negative entries linked to the same request. Never edited or deleted.
 */
const EarningLedgerEntry = model
  .define('earning_ledger_entry', {
    id: model.id({ prefix: 'earn' }).primaryKey(),
    store_id: model.text(),
    collaborator_id: model.text(),
    request_id: model.text(),
    order_id: model.text().nullable(),
    type: model.enum(['earning', 'reversal']),
    amount: model.bigNumber(),
    currency_code: model.text(),
    /** Set when the entry has been settled by a payout. Null = still owed. */
    payout_id: model.text().nullable(),
    note: model.text().nullable(),
  })
  .indexes([
    { on: ['store_id', 'collaborator_id'] },
    { on: ['request_id', 'type'] },
    { on: ['payout_id'] },
  ]);

export default EarningLedgerEntry;
