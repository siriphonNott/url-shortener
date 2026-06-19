import { describe, it, expect } from 'vitest';
import { generateKey, hashKey, keyPrefixOf } from '../../src/lib/keys';

describe('keys', () => {
  it('generates ak_live_ + 40 chars', async () => {
    const { fullKey } = await generateKey();
    expect(fullKey).toMatch(/^ak_live_[A-Za-z0-9]{40}$/);
  });
  it('prefix is the first 14 chars', async () => {
    const { fullKey, keyPrefix } = await generateKey();
    expect(keyPrefix).toBe(fullKey.slice(0, 14));
    expect(keyPrefix.startsWith('ak_live_')).toBe(true);
  });
  it('hashKey is a deterministic 64-char hex', async () => {
    const { fullKey, keyHash } = await generateKey();
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashKey(fullKey)).toBe(keyHash);
  });
});
