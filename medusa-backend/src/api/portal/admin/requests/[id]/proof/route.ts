import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError, Modules } from '@medusajs/framework/utils';
import { adminOf, portalOf } from '../../../../../../lib/portal/http';

/**
 * Streams a request's proof of deposit to the portal admin of the same store.
 * The bucket is private, so the file is read with a short-lived signed URL and
 * proxied; the signed URL itself never reaches the browser.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const [request] = await portalOf(req).listCollabRequests(
    { id: req.params.id, store_id },
    { take: 1 }
  );
  if (!request?.proof_file_id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Proof not found');
  }
  const file = await req.scope.resolve(Modules.FILE).retrieveFile(request.proof_file_id);
  const upstream = await fetch(file.url);
  if (!upstream.ok || !upstream.body) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, 'Proof file is unavailable');
  }
  res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/octet-stream');
  res.setHeader('content-disposition', 'inline');
  res.setHeader('cache-control', 'private, no-store');
  Readable.fromWeb(upstream.body as unknown as WebReadableStream).pipe(res);
}
