import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';

async function resolveFileUrl(
  fileModule: { retrieveFile: (id: string) => Promise<{ url: string }> },
  fileId: string | null | undefined
): Promise<string | null> {
  if (!fileId) return null;
  try {
    const file = await fileModule.retrieveFile(fileId);
    return file.url ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productMediaService = req.scope.resolve('productMedia');
  const fileModule = req.scope.resolve(Modules.FILE);

  const categoryId = req.params.id;

  const images = await productMediaService.listProductCategoryImages({
    category_id: categoryId,
  });

  const resolved = await Promise.all(
    images.map(async (img) => ({
      ...img,
      url: (await resolveFileUrl(fileModule, img.file_id)) ?? img.url,
    }))
  );

  res.status(200).json({ images: resolved });
}
