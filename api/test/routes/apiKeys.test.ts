import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('ka','ka@x.co','h','K','free','active','x','x')").run();
  token = await signToken('ka', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });
const post = (body: any) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify(body) });

describe('api-keys routes', () => {
  it('create returns full key once + keyPrefix (201)', async () => {
    const res = await app.request('/api/v1/api-keys', post({ keyName: 'CI' }), env);
    expect(res.status).toBe(201);
    const b = await res.json() as any;
    expect(b.key.apiKey).toMatch(/^ak_live_[A-Za-z0-9]{40}$/);
    expect(b.key.keyPrefix).toBe(b.key.apiKey.slice(0, 14));
  });
  it('list returns keyPrefix only, never full key or hash', async () => {
    const res = await app.request('/api/v1/api-keys', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.keys[0]).toHaveProperty('keyPrefix');
    expect(b.keys[0]).not.toHaveProperty('apiKey');
    expect(b.keys[0]).not.toHaveProperty('keyHash');
    expect(b.pagination).toHaveProperty('total');
  });
  it('create without keyName → ad-hoc 400 body (no code)', async () => {
    const res = await app.request('/api/v1/api-keys', post({}), env);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, message: 'keyName is required' });
  });
  it('update/delete missing id → ad-hoc 404 body', async () => {
    const u = await app.request('/api/v1/api-keys/nope', { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: '{}' }, env);
    expect(u.status).toBe(404);
    expect(await u.json()).toEqual({ success: false, message: 'API Key not found' });
  });
  it('getKeyStats returns key + stats + timeline + devices', async () => {
    const created = await app.request('/api/v1/api-keys', post({ keyName: 'S' }), env);
    const id = (await created.json() as any).key.id;
    const res = await app.request(`/api/v1/api-keys/${id}/stats`, { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.key.id).toBe(id);
    expect(b.stats).toHaveProperty('totalLinks');
    expect(Array.isArray(b.timeline)).toBe(true);
    expect(Array.isArray(b.devices)).toBe(true);
  });
});
