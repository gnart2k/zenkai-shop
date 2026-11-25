import { model } from '@medusajs/framework/utils';

export const COLLAB_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'paid',
  'cancelled',
] as const;

/** A collaborator's request to sell a variant at a commercial price. */
const CollabRequest = model
  .define('collab_request', {
    id: model.id({ prefix: 'creq' }).primaryKey(),
    store_id: model.text(),
    collaborator_id: model.text(),
    variant_id: model.text(),
    sku: model.text().nullable(),
    product_title: model.text().nullable(),
    quantity: model.number(),
    currency_code: model.text(),
    /** Snapshots taken at request time. */
    original_price: model.bigNumber(),
    commercial_price: model.bigNumber(),
    deposit_percent: model.float(),
    deposit_amount: model.bigNumber(),
    customer_name: model.text(),
    customer_email: model.text(),
    customer_phone: model.text().nullable(),
    /** Delivery address given by the collaborator (free text); prefilled into the customer's checkout. */
    customer_address: model.text().nullable(),
    proof_url: model.text(),
    proof_file_id: model.text().nullable(),
    status: model.enum([...COLLAB_REQUEST_STATUSES]).default('pending'),
    reject_reason: model.text().nullable(),
    reviewed_by: model.text().nullable(),
    reviewed_at: model.dateTime().nullable(),
    cart_id: model.text().nullable(),
    order_id: model.text().nullable(),
    paid_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ['store_id', 'status'] },
    { on: ['collaborator_id'] },
    { on: ['cart_id'] },
    { on: ['order_id'] },
  ]);

export default CollabRequest;
