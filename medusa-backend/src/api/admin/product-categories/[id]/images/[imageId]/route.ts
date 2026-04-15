import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const productMediaService = req.scope.resolve('productMedia');

  const { id, imageId } = req.params;

  await productMediaService.deleteProductCategoryImages(imageId);

  res.status(204).send();
}
