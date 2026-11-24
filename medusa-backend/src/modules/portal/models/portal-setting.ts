import { model } from '@medusajs/framework/utils';

/** Per-store portal configuration, managed by the Medusa (platform) admin. */
const PortalSetting = model
  .define('portal_setting', {
    id: model.id({ prefix: 'psetting' }).primaryKey(),
    store_id: model.text(),
    /** Deposit as a percentage of commercial price x quantity. */
    deposit_percent: model.float().default(20),
    /** Shown on the payment page when a collaborator has no contact info. */
    default_contact_email: model.text().nullable(),
  })
  .indexes([{ on: ['store_id'], unique: true }]);

export default PortalSetting;
