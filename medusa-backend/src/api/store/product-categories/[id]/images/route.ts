import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productMediaService = req.scope.resolve('productMedia');

  const categoryId = req.params.id;

  const images = await productMediaService.listProductCategoryImages({
    category_id: categoryId,
  });

  res.status(200).json({ images });
}
