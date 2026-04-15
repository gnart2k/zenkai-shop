import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productMediaService = req.scope.resolve('productMedia');

  const categoryId = req.params.id;

  const images = await productMediaService.listProductCategoryImages({
    category_id: categoryId,
  });

  res.status(200).json({ images });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const productMediaService = req.scope.resolve('productMedia');

  const categoryId = req.params.id;
  const body = req.body as Record<string, unknown>;
  const url = body.url as string | undefined;
  const file_id = body.file_id as string | undefined;
  const type = body.type as string | undefined;

  if (!url || !type) {
    res.status(400).json({
      error: 'url and type are required',
    });
    return;
  }

  if (type !== 'thumbnail' && type !== 'image') {
    res.status(400).json({
      error: "type must be 'thumbnail' or 'image'",
    });
    return;
  }

  const image = await productMediaService.createProductCategoryImages({
    url,
    file_id: file_id || null,
    type,
    category_id: categoryId,
  });

  res.status(201).json({ image });
}
