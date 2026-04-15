import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { StoreBrandingMetadata } from '../../../types/store-branding';

async function resolveFileUrl(
  fileModule: { retrieveFile: (id: string) => Promise<{ url: string }> },
  fileId: string | undefined
): Promise<string | null> {
  if (!fileId) {
    return null;
  }
  try {
    const file = await fileModule.retrieveFile(fileId);
    return file.url ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const fileModule = req.scope.resolve(Modules.FILE);

  const { data: stores } = await query.graph({
    entity: 'store',
    fields: ['id', 'name', 'metadata'],
    pagination: { take: 1, skip: 0 },
  });

  const store = stores[0];
  if (!store) {
    res.status(200).json({
      store_name: '',
      tagline: null,
      primary_color: null,
      logo_url: null,
      hero_url: null,
      favicon_url: null,
    });
    return;
  }

  const branding = store.metadata?.branding as StoreBrandingMetadata | undefined;

  const tagline = branding?.tagline?.trim() || null;
  const primary_color = branding?.primary_color?.trim() || null;

  const logoId = branding?.logo_file_id?.trim() || undefined;
  const heroId = branding?.hero_file_id?.trim() || undefined;
  const faviconId = branding?.favicon_file_id?.trim() || undefined;

  const [logo_url, hero_url, favicon_url] = await Promise.all([
    resolveFileUrl(fileModule, logoId),
    resolveFileUrl(fileModule, heroId),
    resolveFileUrl(fileModule, faviconId),
  ]);

  res.status(200).json({
    store_name: store.name,
    tagline,
    primary_color,
    logo_url,
    hero_url,
    favicon_url,
  });
}
