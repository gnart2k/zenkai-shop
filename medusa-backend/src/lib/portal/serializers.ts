/**
 * Explicit whitelists. Collaborator output is built field-by-field so nothing
 * admin-only (cost, margin, reviewer ids) can leak by accident.
 */
type AnyRequest = Record<string, any>;

export function serializeCollaboratorRequest(r: AnyRequest) {
  return {
    id: r.id,
    store_id: r.store_id,
    variant_id: r.variant_id,
    sku: r.sku,
    product_title: r.product_title,
    quantity: r.quantity,
    currency_code: r.currency_code,
    original_price: Number(r.original_price),
    commercial_price: Number(r.commercial_price),
    deposit_percent: r.deposit_percent,
    deposit_amount: Number(r.deposit_amount),
    customer_name: r.customer_name,
    customer_email: r.customer_email,
    customer_phone: r.customer_phone,
    status: r.status,
    reject_reason: r.reject_reason,
    order_id: r.order_id,
    paid_at: r.paid_at,
    created_at: r.created_at,
  };
}
