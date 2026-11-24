import { model } from '@medusajs/framework/utils';

/** Membership of a collaborator in a store. Drives all per-store access checks. */
const StoreCollaborator = model
  .define('store_collaborator', {
    id: model.id({ prefix: 'stcollab' }).primaryKey(),
    store_id: model.text(),
    collaborator_id: model.text(),
    status: model.enum(['invited', 'active', 'revoked']).default('invited'),
  })
  .indexes([{ on: ['store_id', 'collaborator_id'], unique: true }]);

export default StoreCollaborator;
