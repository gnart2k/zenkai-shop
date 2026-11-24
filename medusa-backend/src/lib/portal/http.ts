import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import type { ZodTypeAny, z } from '@medusajs/framework/zod';
import { PORTAL_MODULE } from '../../modules/portal';
import type PortalModuleService from '../../modules/portal/service';

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ')
    );
  }
  return result.data;
}

export const portalOf = (req: MedusaRequest) =>
  req.scope.resolve<PortalModuleService>(PORTAL_MODULE);

type AuthedRequest = MedusaRequest & {
  portal_admin?: { id: string; store_id: string; email: string };
};

/**
 * Portal admins are scoped to exactly one store: the store id comes from their own
 * record, never from the URL or body, so they cannot reach another store.
 */
export async function requirePortalAdmin(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const actorId = (req as AuthenticatedMedusaRequest).auth_context?.actor_id;
  const admin = actorId
    ? await portalOf(req)
        .retrievePortalAdmin(actorId)
        .catch(() => null)
    : null;
  if (!admin) {
    return res.status(403).json({ type: 'not_allowed', message: 'Not a portal admin' });
  }
  (req as AuthedRequest).portal_admin = admin;
  next();
}

export const adminOf = (req: MedusaRequest) => {
  const admin = (req as AuthedRequest).portal_admin;
  if (!admin) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, 'Portal admin required');
  }
  return admin;
};

/** Collaborators may only touch stores where their membership is active. */
export async function requireStoreMembership(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const [membership] = await portalOf(req).listStoreCollaborators(
    {
      store_id: req.params.store_id,
      collaborator_id: (req as AuthenticatedMedusaRequest).auth_context?.actor_id,
      status: 'active',
    },
    { take: 1 }
  );
  if (!membership) {
    return res
      .status(403)
      .json({ type: 'not_allowed', message: 'Not a collaborator of this store' });
  }
  next();
}

/** /portal routes sit outside Medusa's /store|/admin|/auth CORS handling. */
export function portalCors(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const origin = req.headers.origin;
  const allowed = (process.env.PORTAL_CORS || process.env.STORE_CORS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ok =
    origin &&
    allowed.some((a) => {
      try {
        return a === origin || new RegExp(`^${a}$`).test(origin);
      } catch {
        return false;
      }
    });
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin as string);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    return res.status(ok ? 204 : 403).end();
  }
  next();
}

export const actorIdOf = (req: MedusaRequest) =>
  (req as AuthenticatedMedusaRequest).auth_context.actor_id;
