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
    /** Subdomain label of the store's default address: <slug>.<STORE_BASE_DOMAIN>. */
    slug: model.text().nullable(),
    /** Custom domains: [{ host, verified_at | null }]. Only verified ones resolve to this store. */
    domains: model.json().nullable(),
  })
  .indexes([
    { on: ['store_id'], unique: true },
    { on: ['slug'], unique: true, where: 'slug is not null' },
  ]);

export default PortalSetting;
