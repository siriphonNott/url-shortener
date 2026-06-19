import { describe, it, expect } from 'vitest';
import { serializeLink, serializeRole, serializeLog, userPayload, formatKey } from '../src/serializers';

describe('serializers', () => {
  it('serializeLink exposes _id and camelCase, hides snake_case', () => {
    const row = { id: 'l1', code: 'abc', destinationUrl: 'https://x.com', title: 't', description: null,
      createdBy: 'u1', clickCount: 5, isActive: 1, expiresAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const out = serializeLink(row as any);
    expect(out._id).toBe('l1');
    expect(out).not.toHaveProperty('id');
    expect(out.isActive).toBe(true);
    expect(out.clickCount).toBe(5);
  });
  it('serializeRole includes userCount and parsed permissions', () => {
    const row = { id: 'r1', name: 'admin', description: '', permissions: '{"urls":{"view":true}}', createdAt: 'x', updatedAt: 'x' };
    const out = serializeRole(row as any, 3);
    expect(out._id).toBe('r1');
    expect(out.permissions).toEqual({ urls: { view: true } });
    expect(out.userCount).toBe(3);
  });
  it('formatKey returns id + keyPrefix, never a full key', () => {
    const row = { id: 'k1', keyName: 'Personal', keyPrefix: 'ak_live_abc123', scopes: '{"links":"read"}',
      status: 'active', expiresAt: null, lastUsedAt: null, createdAt: 'x' };
    const out = formatKey(row as any);
    expect(out.id).toBe('k1');
    expect(out.keyPrefix).toBe('ak_live_abc123');
    expect(out).not.toHaveProperty('keyHash');
  });
  it('userPayload returns id/email/fullName', () => {
    expect(userPayload({ id: 'u1', email: 'a@b.co', fullName: 'A' } as any)).toEqual({ id: 'u1', email: 'a@b.co', fullName: 'A' });
  });
  it('serializeLog exposes _id and camelCase userAgent', () => {
    const out = serializeLog({ id: 'g1', linkId: 'l1', ip: '1.2.3.4', userAgent: 'UA', referer: null, country: 'TH', city: null, createdAt: 'x' } as any);
    expect(out._id).toBe('g1');
    expect(out.userAgent).toBe('UA');
  });
});
