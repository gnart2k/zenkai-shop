import type { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils';
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  createStoresWorkflow,
  deleteStoresWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from '@medusajs/medusa/core-flows';
import { PORTAL_MODULE } from '../../modules/portal';
import type PortalModuleService from '../../modules/portal/service';
import {
  assertDomainFree,
  assertSlugFree,
  checkCname,
  cleanHost,
  freeSlug,
  readDomains,
  validateSlug,
} from './domains';
import { invitePortalAdmin } from './invites';
import { getStoreSettings } from './settings';
import { publishableKeysOfStore } from './store-context';

type Container = Pick<MedusaContainer, 'resolve'>;

/**
 * A "tenant" is one Medusa store plus everything that scopes data to it: its own default
 * sales channel (products are sold per channel), a publishable key for its storefront, portal
 * settings and its single portal admin. Collaborators belong to many tenants via memberships.
 */
export async function listTenants(container: Container) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);

  const { data: stores } = await query.graph({
    entity: 'store',
    fields: [
      'id',
      'name',
      'default_sales_channel_id',
      'supported_currencies.currency_code',
      'supported_currencies.is_default',
    ],
  });
  return Promise.all(
    (stores as any[]).map(async (s) => {
      const [admins, memberships, pending, settings] = await Promise.all([
        portal.listPortalAdmins({ store_id: s.id }),
        portal.listStoreCollaborators({ store_id: s.id }),
        portal.listCollabRequests({ store_id: s.id, status: 'pending' }),
        getStoreSettings(container, s.id),
      ]);
      const currency =
        (s.supported_currencies ?? []).find((c: any) => c.is_default)?.currency_code ??
        s.supported_currencies?.[0]?.currency_code ??
        null;
      return {
        id: s.id as string,
        name: s.name as string,
        currency_code: currency as string | null,
        default_sales_channel_id: (s.default_sales_channel_id ?? null) as string | null,
        publishable_keys: await publishableKeysOfStore(container, s),
        settings,
        portal_admins: admins.map((a) => ({
          id: a.id,
          email: a.email,
          name: a.name,
          activated: !!a.activated_at,
        })),
        collaborators: memberships.length,
        pending_requests: pending.length,
      };
    })
  );
}

/** Creates a new tenant (store + sales channel + storefront key + portal defaults) and, optionally, its portal admin. */
export async function createTenant(
  container: MedusaContainer,
  input: {
    name: string;
    currency_code: string;
    deposit_percent?: number;
    slug?: string;
    stock_location_ids?: string[];
    admin_email?: string | null;
    admin_name?: string | null;
  }
) {
  const currency = input.currency_code.toLowerCase();

  const {
    result: [store],
  } = await createStoresWorkflow(container).run({
    input: {
      stores: [
        { name: input.name, supported_currencies: [{ currency_code: currency, is_default: true }] },
      ],
    },
  });

  const {
    result: [channel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [{ name: input.name, description: `Sales channel of ${input.name}` }],
    },
  });

  await updateStoresWorkflow(container).run({
    input: { selector: { id: store.id }, update: { default_sales_channel_id: channel.id } },
  });

  const {
    result: [key],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{ title: `${input.name} storefront`, type: 'publishable', created_by: '' }],
    },
  });
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: key.id, add: [channel.id] },
  });

  // Inventory and shipping are tied to stock locations; the tenant sells from the ones chosen.
  if (input.stock_location_ids?.length) {
    await Promise.all(
      input.stock_location_ids.map((id) =>
        linkSalesChannelsToStockLocationWorkflow(container).run({
          input: { id, add: [channel.id] },
        })
      )
    );
  }

  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const slug = input.slug ? validateSlug(input.slug) : await freeSlug(portal, input.name);
  if (input.slug) await assertSlugFree(portal, slug, store.id);
  await portal.createPortalSettings({
    store_id: store.id,
    slug,
    ...(input.deposit_percent !== undefined ? { deposit_percent: input.deposit_percent } : {}),
  });

  let admin: { id: string; email: string } | null = null;
  let invite_link: string | null = null;
  if (input.admin_email) {
    const res = await invitePortalAdmin(container, {
      store_id: store.id,
      email: input.admin_email,
      name: input.admin_name ?? null,
    });
    admin = { id: res.admin.id, email: res.admin.email };
    invite_link = res.invite_link;
  }

  return {
    store: { id: store.id, name: store.name },
    sales_channel: { id: channel.id, name: channel.name },
    publishable_key: { id: key.id, token: (key as any).token as string },
    admin,
    invite_link,
  };
}

/** Renames a store and/or changes its portal settings (deposit, contact email, domains). */
export async function updateTenant(
  container: MedusaContainer,
  storeId: string,
  patch: {
    name?: string;
    deposit_percent?: number;
    default_contact_email?: string | null;
    slug?: string;
  }
) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  if (patch.name) {
    await updateStoresWorkflow(container).run({
      input: { selector: { id: storeId }, update: { name: patch.name } },
    });
  }
  const data: Record<string, unknown> = {};
  if (patch.deposit_percent !== undefined) data.deposit_percent = patch.deposit_percent;
  if (patch.default_contact_email !== undefined)
    data.default_contact_email = patch.default_contact_email;
  if (patch.slug !== undefined) {
    const slug = validateSlug(patch.slug);
    await assertSlugFree(portal, slug, storeId);
    data.slug = slug;
  }
  if (Object.keys(data).length) {
    const [existing] = await portal.listPortalSettings({ store_id: storeId }, { take: 1 });
    if (existing) await portal.updatePortalSettings({ id: existing.id, ...data });
    else await portal.createPortalSettings({ store_id: storeId, ...data });
  }
}

/**
 * Deletes a tenant: store, its sales channel, storefront keys and portal rows. Refused while the
 * store has collaborator requests or payouts (that history must not disappear); products
 * and orders are not deleted, they stay in Medusa.
 */
export async function deleteTenant(container: MedusaContainer, storeId: string) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'store',
    fields: ['id', 'default_sales_channel_id'],
    filters: { id: storeId },
  });
  const store = data[0] as any;
  if (!store) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Store ${storeId} not found`);
  const { data: all } = await query.graph({ entity: 'store', fields: ['id'] });
  if ((all as any[]).length <= 1) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'The only store cannot be deleted');
  }
  const [requests, payouts] = await Promise.all([
    portal.listCollabRequests({ store_id: storeId }, { take: 1 }),
    portal.listPayouts({ store_id: storeId }, { take: 1 }),
  ]);
  if (requests.length || payouts.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'This store has collaborator requests or payouts and cannot be deleted'
    );
  }

  const keys = await publishableKeysOfStore(container, store);
  const [admins, settings, memberships] = await Promise.all([
    portal.listPortalAdmins({ store_id: storeId }),
    portal.listPortalSettings({ store_id: storeId }),
    portal.listStoreCollaborators({ store_id: storeId }),
  ]);
  if (admins.length) await portal.deletePortalAdmins(admins.map((a) => a.id));
  if (settings.length) await portal.deletePortalSettings(settings.map((x) => x.id));
  if (memberships.length) await portal.deleteStoreCollaborators(memberships.map((m) => m.id));

  await deleteStoresWorkflow(container).run({ input: { ids: [storeId] } });
  const apiKeys = container.resolve(Modules.API_KEY);
  for (const k of keys) {
    await apiKeys.revoke(k.id, { revoked_by: 'portal-admin' });
    await apiKeys.deleteApiKeys([k.id]);
  }
  if (store.default_sales_channel_id) {
    await container
      .resolve(Modules.SALES_CHANNEL)
      .deleteSalesChannels([store.default_sales_channel_id]);
  }
}

async function settingOf(portal: PortalModuleService, storeId: string) {
  const [setting] = await portal.listPortalSettings({ store_id: storeId }, { take: 1 });
  if (setting) return setting;
  return portal.createPortalSettings({ store_id: storeId });
}

/** Adds a custom domain (pending until its CNAME is verified). */
export async function addCustomDomain(
  container: MedusaContainer,
  storeId: string,
  rawHost: string
) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const host = cleanHost(rawHost);
  await assertDomainFree(portal, host, storeId);
  const setting = await settingOf(portal, storeId);
  const domains = readDomains(setting.domains);
  if (!domains.some((d) => d.host === host)) domains.push({ host, verified_at: null });
  await portal.updatePortalSettings({ id: setting.id, domains: domains as any });
  return host;
}

/** Checks the DNS and marks the domain verified when it CNAMEs to our target. */
export async function verifyCustomDomain(
  container: MedusaContainer,
  storeId: string,
  rawHost: string
) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const host = cleanHost(rawHost);
  const setting = await settingOf(portal, storeId);
  const domains = readDomains(setting.domains);
  const entry = domains.find((d) => d.host === host);
  if (!entry)
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `${host} is not added to this store`);
  const check = await checkCname(host);
  if (check.ok && !entry.verified_at) {
    entry.verified_at = new Date().toISOString();
    await portal.updatePortalSettings({ id: setting.id, domains: domains as any });
  }
  return { host, verified: check.ok, found: check.found };
}

export async function removeCustomDomain(
  container: MedusaContainer,
  storeId: string,
  rawHost: string
) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const host = cleanHost(rawHost);
  const setting = await settingOf(portal, storeId);
  await portal.updatePortalSettings({
    id: setting.id,
    domains: readDomains(setting.domains).filter((d) => d.host !== host) as any,
  });
}
