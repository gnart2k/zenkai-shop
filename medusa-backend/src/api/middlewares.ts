import { defineMiddlewares } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';

export default defineMiddlewares({
  routes: [
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
