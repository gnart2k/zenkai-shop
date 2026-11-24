import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { z } from '@medusajs/framework/zod';
import { uploadFilesWorkflow } from '@medusajs/medusa/core-flows';
import { parse } from '../../../../lib/portal/http';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

const schema = z.object({
  filename: z.string().min(1).max(200),
  mime_type: z.enum(ALLOWED as [string, ...string[]]),
  content_base64: z.string().min(1),
});

/**
 * Proof-of-deposit upload. JSON + base64 (body limit raised in middlewares.ts) so we
 * need no multipart dependency. Files go to the (private) bucket through the file
 * provider and are only readable by the store's portal admin via /requests/:id/proof.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = parse(schema, req.body);
  const buffer = Buffer.from(body.content_base64, 'base64');
  if (!buffer.length || buffer.length > MAX_BYTES) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, 'File must be between 1 byte and 5 MB');
  }
  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename: body.filename,
          mimeType: body.mime_type,
          content: buffer.toString('base64'),
          access: 'private',
        },
      ],
    },
  });
  res.status(201).json({ file: { id: result[0].id, url: result[0].url } });
}
