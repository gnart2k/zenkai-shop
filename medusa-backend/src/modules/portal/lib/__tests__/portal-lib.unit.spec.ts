import { computeDeposit, computeEarning, computeStoreMargin, netAmount } from '../money';
import { signToken, verifyToken } from '../token';

describe('portal money', () => {
  it('computes deposit on commercial price x qty', () => {
    expect(computeDeposit(1_000_000, 3, 20)).toBe(600_000);
  });

  it('computes earning per unit x qty', () => {
    expect(computeEarning(1_200_000, 1_000_000, 3)).toBe(600_000);
  });

  it('computes store margin from cost', () => {
    expect(computeStoreMargin(1_000_000, 700_000, 2)).toBe(600_000);
  });

  it('nets reversals against earnings', () => {
    expect(netAmount([{ amount: 500 }, { amount: -200 }, { amount: 100 }])).toBe(400);
  });
});

describe('portal token', () => {
  it('round-trips a payload', () => {
    const t = signToken({ a: 1 }, 60);
    expect(verifyToken<{ a: number }>(t)?.a).toBe(1);
  });

  it('rejects tampering and expiry', () => {
    const t = signToken({ a: 1 }, 60);
    expect(verifyToken(t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')))).toBeNull();
    expect(verifyToken(signToken({ a: 1 }, -10))).toBeNull();
    expect(verifyToken('garbage')).toBeNull();
  });

  it('is safe to put in a URL path (no dots)', () => {
    expect(signToken({ a: 1 })).not.toContain('.');
  });

  it('allows non-expiring tokens', () => {
    expect(verifyToken<{ a: number }>(signToken({ a: 2 }))?.a).toBe(2);
  });
});
