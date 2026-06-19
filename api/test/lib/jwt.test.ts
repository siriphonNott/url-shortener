import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../src/lib/jwt';

const SECRET = 'test-secret';

describe('jwt', () => {
  it('signs and verifies, returning id/iat/exp', async () => {
    const token = await signToken('user-1', SECRET);
    const payload = await verifyToken(token, SECRET);
    expect(payload.id).toBe('user-1');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp! - payload.iat!).toBe(7 * 24 * 60 * 60);
  });
  it('throws on a tampered token', async () => {
    const token = await signToken('user-1', SECRET);
    await expect(verifyToken(token + 'x', SECRET)).rejects.toThrow();
  });
});
