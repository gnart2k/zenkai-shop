import { model } from '@medusajs/framework/utils';

/** Admin of exactly one store's portal (not a Medusa admin user). */
const PortalAdmin = model
  .define('portal_admin', {
    id: model.id({ prefix: 'padmin' }).primaryKey(),
    email: model.text(),
    name: model.text().nullable(),
    store_id: model.text(),
    activated_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ['email'], unique: true }]);

export default PortalAdmin;
