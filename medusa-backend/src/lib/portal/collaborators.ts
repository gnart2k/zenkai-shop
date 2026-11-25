import type { MedusaContainer } from '@medusajs/framework/types';
import { MedusaError, Modules } from '@medusajs/framework/utils';
import { PORTAL_MODULE } from '../../modules/portal';
import type PortalModuleService from '../../modules/portal/service';

type Container = Pick<MedusaContainer, 'resolve'>;

/**
 * Permanently removes a collaborator from ONE store (clean-up of dummy/test data). Refused when the
 * collaborator has earnings or payouts in this store: the ledger is append-only and money history
 * must stay. Otherwise it deletes their requests in this store and the membership; when they belong
 * to no other store the collaborator record and its collaborator login are deleted too, so the
 * email can be invited again.
 */
export async function deleteCollaboratorFromStore(
  container: Container,
  storeId: string,
  collaboratorId: string
) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const [membership] = await portal.listStoreCollaborators(
    { store_id: storeId, collaborator_id: collaboratorId },
    { take: 1 }
  );
  if (!membership) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Collaborator not found in this store');
  }

  const [earnings, payouts, requests] = await Promise.all([
    portal.listEarningLedgerEntries(
      { store_id: storeId, collaborator_id: collaboratorId },
      { take: 1 }
    ),
    portal.listPayouts({ store_id: storeId, collaborator_id: collaboratorId }, { take: 1 }),
    portal.listCollabRequests({ store_id: storeId, collaborator_id: collaboratorId }),
  ]);
  if (earnings.length || payouts.length || requests.some((r) => r.status === 'paid')) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'This collaborator has earnings or payouts and cannot be deleted; revoke access instead'
    );
  }

  if (requests.length) await portal.deleteCollabRequests(requests.map((r) => r.id));
  await portal.deleteStoreCollaborators([membership.id]);

  const remaining = await portal.listStoreCollaborators(
    { collaborator_id: collaboratorId },
    { take: 1 }
  );
  let removedAccount = false;
  if (!remaining.length) {
    await portal.deleteCollaborators([collaboratorId]);
    removedAccount = true;
    // Detach (or delete) the login so the email can be reused.
    const auth = container.resolve(Modules.AUTH);
    const identities = await auth.listAuthIdentities({});
    for (const ai of identities) {
      const meta = (ai.app_metadata ?? {}) as Record<string, unknown>;
      if (meta.collaborator_id !== collaboratorId) continue;
      const { collaborator_id: _drop, ...rest } = meta;
      if (Object.keys(rest).length) {
        await auth.updateAuthIdentities({ id: ai.id, app_metadata: rest });
      } else {
        await auth.deleteAuthIdentities([ai.id]);
      }
    }
  }
  return {
    id: collaboratorId,
    deleted: true,
    requests_deleted: requests.length,
    account_removed: removedAccount,
  };
}
