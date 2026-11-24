import { model } from '@medusajs/framework/utils';

/**
 * Per-variant pricing that lives outside the product module on purpose:
 *  - original_cost: private to the portal admin, never returned to collaborators.
 *  - original_price: the collaborator-facing base price. A collaborator's profit is their
 *    selling price minus this. Null means "same as the store price".
 * (The table keeps its first name, variant_cost, to avoid a rename migration.)
 */
const VariantCost = model
  .define('variant_cost', {
    id: model.id({ prefix: 'vcost' }).primaryKey(),
    variant_id: model.text(),
    original_cost: model.bigNumber().nullable(),
    original_price: model.bigNumber().nullable(),
  })
  .indexes([{ on: ['variant_id'], unique: true }]);

export default VariantCost;
