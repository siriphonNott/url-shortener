import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password', () => {
  it('hashes to the self-describing format', async () => {
    const h = await hashPassword('secret123');
    expect(h.startsWith('pbkdf2$sha256$100000$')).toBe(true);
    expect(h.split('$')).toHaveLength(5);
  });
  it('verifies the correct password', async () => {
    const h = await hashPassword('secret123');
    expect(await verifyPassword('secret123', h)).toBe(true);
  });
  it('rejects a wrong password', async () => {
    const h = await hashPassword('secret123');
    expect(await verifyPassword('nope', h)).toBe(false);
  });
});
