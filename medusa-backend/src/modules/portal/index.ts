import { Module } from '@medusajs/framework/utils';
import PortalModuleService from './service';

export const PORTAL_MODULE = 'portal';

export default Module(PORTAL_MODULE, {
  service: PortalModuleService,
});
