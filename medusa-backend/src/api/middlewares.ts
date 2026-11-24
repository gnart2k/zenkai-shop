import { authenticate, defineMiddlewares } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { portalCors, requirePortalAdmin, requireStoreMembership } from '../lib/portal/http';
import { COLLABORATOR_ACTOR, PORTAL_ADMIN_ACTOR } from '../modules/portal/lib/constants';

export default defineMiddlewares({
  routes: [
    // --- Portal: collaborators and single-store portal admins -----------------
    { matcher: '/portal-api*', middlewares: [portalCors] },
    {
      // Base64 proof files exceed Medusa's default 100kb JSON limit.
      matcher: '/portal-api/collaborator/uploads',
      method: ['POST'],
      bodyParser: { sizeLimit: '8mb' },
    },
    {
      matcher: '/portal-api/admin/uploads',
      method: ['POST'],
      bodyParser: { sizeLimit: '8mb' },
    },
    {
      matcher: '/portal-api/collaborator*',
      middlewares: [authenticate(COLLABORATOR_ACTOR, ['session', 'bearer'])],
    },
    {
      matcher: '/portal-api/collaborator/stores/:store_id*',
      middlewares: [requireStoreMembership],
    },
    {
      matcher: '/portal-api/admin*',
      middlewares: [authenticate(PORTAL_ADMIN_ACTOR, ['session', 'bearer']), requirePortalAdmin],
    },
    {
      matcher: '/admin/products',
      method: ['POST'],
      additionalDataValidator: {
        is_physical: z.boolean().optional(),
      },
    },
    {
      matcher: '/admin/products/:id',
      method: ['POST'],
      additionalDataValidator: {
        is_physical: z.boolean().nullish(),
      },
    },
  ],
});
