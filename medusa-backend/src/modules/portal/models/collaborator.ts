import { model } from '@medusajs/framework/utils';

/** External partner who can work with several stores (see StoreCollaborator). */
const Collaborator = model
  .define('collaborator', {
    id: model.id({ prefix: 'collab' }).primaryKey(),
    email: model.text(),
    name: model.text().nullable(),
    phone: model.text().nullable(),
    /** Set once the collaborator has accepted an invite and created a password. */
    activated_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ['email'], unique: true }]);

export default Collaborator;
