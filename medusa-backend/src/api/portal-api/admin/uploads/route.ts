import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { z } from '@medusajs/framework/zod';
import { uploadFilesWorkflow } from '@medusajs/medusa/core-flows';
import { parse } from '../../../../lib/portal/http';
import { slugify } from '../../../../lib/portal/products';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const schema = z.object({
  filename: z.string().min(1).max(200),
  mime_type: z.enum([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'video/mp4',
    'video/webm',
  ]),
  content_base64: z.string().min(1),
});

/**
 * Product image upload. The bucket is private, so files use the `lumpa-media-` key prefix
 * and are served by the backend at /media/<id> (see api/media/[id]/route.ts); the
 * returned `url` is that relative path, ready to store as a product thumbnail.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = parse(schema, req.body);
  const buffer = Buffer.from(body.content_base64, 'base64');
  const isVideo = body.mime_type.startsWith('video/');
  if (!buffer.length || buffer.length > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      isVideo ? 'Video must be between 1 byte and 20 MB' : 'File must be between 1 byte and 5 MB'
    );
  }
  const base = slugify(body.filename.replace(/\.[^.]+$/, '')).slice(0, 60);
  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename: `lumpa-media-${base}.${EXT[body.mime_type]}`,
          mimeType: body.mime_type,
          content: buffer.toString('base64'),
          access: 'private',
        },
      ],
    },
  });
  res.status(201).json({ file: { id: result[0].id, url: `/media/${result[0].id}` } });
}
