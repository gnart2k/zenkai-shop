import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => process.env.JWT_SECRET || 'supersecret';

const b64 = (s: string) => Buffer.from(s).toString('base64url');

/**
 * Small HMAC-signed token (invite links, payment links). exp is epoch seconds.
 * The separator is `~`, not `.`: the storefront middleware treats any path containing a
 * dot as a static file and would skip the locale redirect for /pay/<token>.
 */
export function signToken(payload: Record<string, unknown>, ttlSeconds?: number): string {
  const body = b64(
    JSON.stringify({
      ...payload,
      ...(ttlSeconds ? { exp: Math.floor(Date.now() / 1000) + ttlSeconds } : {}),
    })
  );
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}~${sig}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string): T | null {
  const [body, sig] = (token || '').split('~');
  if (!body || !sig) {
    return null;
  }
  const expected = createHmac('sha256', secret()).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload as T;
  } catch {
    return null;
  }
}
