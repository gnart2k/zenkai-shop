import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';

/**
 * Public, stable URLs for storefront media kept in the private S3 bucket.
 *
 * The bucket rejects unsigned reads and presigned URLs expire, so product
 * images / videos are stored as `/media/<file id>` and streamed through here.
 * Range requests are forwarded so <video> can seek.
 *
 * Only keys uploaded with the `lumpa-media-` prefix are served, so this route
 * can't be used to read arbitrary (private) objects from the bucket.
 */
const MEDIA_KEY_PREFIX = 'lumpa-media-';
// The local file provider prepends `private-<timestamp>-` to private uploads.
const LOCAL_PRIVATE_PREFIX = /^private-\d+-/;

const KEY_RE = /^[A-Za-z0-9._-]+$/;
const PASSTHROUGH_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
];

// Presigned URLs from the S3 provider are valid for an hour; reuse them a bit less.
const SIGNED_TTL_MS = 50 * 60 * 1000;
const signedCache = new Map<string, { url: string; expires: number }>();

async function signedUrl(req: MedusaRequest, key: string): Promise<string> {
  const hit = signedCache.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.url;
  }
  const fileModule = req.scope.resolve(Modules.FILE);
  const file = await fileModule.retrieveFile(key);
  signedCache.set(key, { url: file.url, expires: Date.now() + SIGNED_TTL_MS });
  return file.url;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const key = req.params.id;
  if (!key || !KEY_RE.test(key) || !key.replace(LOCAL_PRIVATE_PREFIX, '').startsWith(MEDIA_KEY_PREFIX)) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  let upstream: Response;
  try {
    const range = req.headers.range;
    upstream = await fetch(await signedUrl(req, key), {
      headers: range ? { range } : undefined,
    });
  } catch {
    signedCache.delete(key);
    res.status(502).json({ message: 'Media unavailable' });
    return;
  }

  if (upstream.status === 416) {
    // Unsatisfiable Range header: tell the client the real size instead of failing.
    const total = upstream.headers.get('content-range');
    if (total) {
      res.setHeader('content-range', total);
    }
    res.status(416).end();
    return;
  }

  if (!upstream.ok || !upstream.body) {
    signedCache.delete(key);
    res.status(upstream.status === 403 || upstream.status === 404 ? 404 : 502).json({
      message: 'Media unavailable',
    });
    return;
  }

  res.status(upstream.status);
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      res.setHeader(name, value);
    }
  }
  // Keys embed a ULID, so the content behind a key never changes.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  Readable.fromWeb(upstream.body as unknown as WebReadableStream).pipe(res);
}
