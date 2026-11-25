import type { MedusaContainer } from '@medusajs/framework/types';
import { MedusaError, Modules } from '@medusajs/framework/utils';
import { PORTAL_MODULE } from '../../modules/portal';
import { COLLABORATOR_ACTOR, PORTAL_ADMIN_ACTOR } from '../../modules/portal/lib/constants';
import { signToken, verifyToken } from '../../modules/portal/lib/token';
import type PortalModuleService from '../../modules/portal/service';
import { sendPortalEmail } from './email';

type Container = Pick<MedusaContainer, 'resolve'>;
const INVITE_TTL = 7 * 24 * 3600;

const inviteLink = (token: string) =>
  `${(process.env.PORTAL_URL || 'http://localhost:4100/portal').replace(/\/$/, '')}/accept-invite?token=${token}`;

const normalize = (email: string) => email.trim().toLowerCase();

/**
 * Portal admin invites a collaborator by email. A brand-new email gets an invite
 * link; an already-activated collaborator is simply added to this store.
 */
export async function inviteCollaborator(
  container: Container,
  input: { store_id: string; email: string; name?: string | null }
) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const email = normalize(input.email);

  let [collaborator] = await portal.listCollaborators({ email }, { take: 1 });
  if (!collaborator) {
    collaborator = await portal.createCollaborators({ email, name: input.name ?? null });
  }
  const activated = !!collaborator.activated_at;

  const [existing] = await portal.listStoreCollaborators(
    { store_id: input.store_id, collaborator_id: collaborator.id },
    { take: 1 }
  );
  const status = activated ? 'active' : 'invited';
  const membership = existing
    ? await portal.updateStoreCollaborators({ id: existing.id, status })
    : await portal.createStoreCollaborators({
        store_id: input.store_id,
        collaborator_id: collaborator.id,
        status,
      });

  let link: string | null = null;
  if (!activated) {
    link = inviteLink(
      signToken({ kind: 'invite', actor: COLLABORATOR_ACTOR, id: collaborator.id }, INVITE_TTL)
    );
  }
  await sendPortalEmail(container, {
    to: email,
    template: activated ? 'portal-added-to-store' : 'portal-collaborator-invite',
    data: { store_id: input.store_id, invite_link: link },
  });
  return { collaborator, membership, invite_link: link };
}

/** Medusa admin (platform) creates the single-store portal admin for a store. */
export async function invitePortalAdmin(
  container: Container,
  input: { store_id: string; email: string; name?: string | null }
) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const email = normalize(input.email);
  let [admin] = await portal.listPortalAdmins({ email }, { take: 1 });
  if (admin && admin.store_id !== input.store_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'This email is already a portal admin of another store'
    );
  }
  if (!admin) {
    admin = await portal.createPortalAdmins({
      email,
      name: input.name ?? null,
      store_id: input.store_id,
    });
  }
  const link = admin.activated_at
    ? null
    : inviteLink(
        signToken({ kind: 'invite', actor: PORTAL_ADMIN_ACTOR, id: admin.id }, INVITE_TTL)
      );
  await sendPortalEmail(container, {
    to: email,
    template: 'portal-admin-invite',
    data: { store_id: input.store_id, invite_link: link },
  });
  return { admin, invite_link: link };
}

/**
 * Accepting an invite creates the emailpass auth identity and links it to the
 * collaborator / portal admin. Sign-in is then /auth/{actor}/emailpass.
 */
export async function acceptInvite(
  container: Container,
  input: { token: string; password: string }
) {
  const payload = verifyToken<{ kind: string; actor: string; id: string }>(input.token);
  if (!payload || payload.kind !== 'invite') {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, 'Invite link is invalid or expired');
  }
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const isAdmin = payload.actor === PORTAL_ADMIN_ACTOR;
  const record = isAdmin
    ? await portal.retrievePortalAdmin(payload.id).catch(() => null)
    : await portal.retrieveCollaborator(payload.id).catch(() => null);
  if (!record) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Invite no longer exists');
  }
  if (record.activated_at) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Invite was already accepted');
  }

  const auth = container.resolve(Modules.AUTH);
  const credentials = { body: { email: record.email, password: input.password } } as any;
  const actorKey = `${payload.actor}_id`;

  const registered = await auth.register('emailpass', credentials);
  let identityId = registered.authIdentity?.id;
  let existingMetadata: Record<string, unknown> = {};

  if (!registered.success || !identityId) {
    // The email already has a login (e.g. a storefront customer or Medusa admin).
    // One login can carry several actor types, so link it instead of failing, but
    // only when the caller proves they own that login by its existing password.
    const existing = await auth.authenticate('emailpass', credentials);
    if (!existing.success || !existing.authIdentity) {
      throw new MedusaError(
        // INVALID_DATA, not CONFLICT: Medusa replaces a conflict's message with a generic one.
        MedusaError.Types.INVALID_DATA,
        'An account with this email already exists. Enter its existing password to link it.'
      );
    }
    identityId = existing.authIdentity.id;
    existingMetadata = (existing.authIdentity.app_metadata as Record<string, unknown>) ?? {};
  }

  await auth.updateAuthIdentities({
    id: identityId,
    // Merge, never overwrite: keep the customer_id / user_id already on this login.
    app_metadata: { ...existingMetadata, [actorKey]: record.id },
  });

  const now = new Date();
  if (isAdmin) {
    await portal.updatePortalAdmins({ id: record.id, activated_at: now });
  } else {
    await portal.updateCollaborators({ id: record.id, activated_at: now });
    const invited = await portal.listStoreCollaborators({
      collaborator_id: record.id,
      status: 'invited',
    });
    if (invited.length) {
      await portal.updateStoreCollaborators(
        invited.map((m) => ({ id: m.id, status: 'active' as const }))
      );
    }
  }
  return { actor: payload.actor, email: record.email, linked_existing_login: !registered.success };
}
