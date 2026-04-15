import { defineMiddlewares } from '@medusajs/framework/http';

export default defineMiddlewares({
  routes: [
    {
      matcher: '/admin/product-categories/:id/images',
      method: ['GET', 'POST'],
      middlewares: [],
    },
    {
      matcher: '/admin/product-categories/:id/images/:imageId',
      method: ['DELETE'],
      middlewares: [],
    },
  ],
});
