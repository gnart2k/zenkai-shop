import { MedusaService } from '@medusajs/framework/utils';
import CollabRequest from './models/collab-request';
import Collaborator from './models/collaborator';
import EarningLedgerEntry from './models/earning-ledger-entry';
import Payout from './models/payout';
import PortalAdmin from './models/portal-admin';
import PortalSetting from './models/portal-setting';
import StoreCollaborator from './models/store-collaborator';
import VariantCost from './models/variant-cost';

class PortalModuleService extends MedusaService({
  PortalSetting,
  PortalAdmin,
  Collaborator,
  StoreCollaborator,
  VariantCost,
  CollabRequest,
  EarningLedgerEntry,
  Payout,
}) {}

export default PortalModuleService;
