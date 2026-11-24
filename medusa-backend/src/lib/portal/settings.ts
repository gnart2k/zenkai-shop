import type { MedusaContainer } from '@medusajs/framework/types';
import { PORTAL_MODULE } from '../../modules/portal';
import { DEFAULT_DEPOSIT_PERCENT } from '../../modules/portal/lib/constants';
import type PortalModuleService from '../../modules/portal/service';
import { BASE_DOMAIN, CNAME_TARGET, readDomains, storeAddress } from './domains';

type Container = Pick<MedusaContainer, 'resolve'>;

export async function getStoreSettings(container: Container, storeId: string) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const [setting] = await portal.listPortalSettings({ store_id: storeId }, { take: 1 });
  return {
    deposit_percent: setting?.deposit_percent ?? DEFAULT_DEPOSIT_PERCENT,
    default_contact_email: setting?.default_contact_email ?? null,
    slug: setting?.slug ?? null,
    address: storeAddress(setting?.slug),
    domains: readDomains(setting?.domains).map((d) => ({
      host: d.host,
      verified: !!d.verified_at,
      cname_target: CNAME_TARGET,
    })),
    base_domain: BASE_DOMAIN,
    cname_target: CNAME_TARGET,
  };
}
