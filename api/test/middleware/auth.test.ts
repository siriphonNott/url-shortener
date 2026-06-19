import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import { Hono } from 'hono';
import { auth } from '../../src/middleware/auth';
import { hashKey } from '../../src/lib/keys';
import { signToken } from '../../src/lib/jwt';
import type { AppBindings } from '../../src/env';

const app = new Hono<AppBindings>();
app.use('/protected', auth);
app.get('/protected', (c) => c.json({ user: c.get('user') }));

beforeAll(async () => {
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('u1','a@b.co','h','Alice','free','active','x','x')").run();
  const fullKey = 'ak_live_' + 'a'.repeat(40);
  await env.DB.prepare("INSERT INTO api_keys (id,user_id,key_name,key_hash,key_prefix,scopes,status,is_personal,created_at,updated_at) VALUES ('k1','u1','Personal',?,?, '{}','active',1,'x','x')")
    .bind(await hashKey(fullKey), fullKey.slice(0,14)).run();
});

describe('auth middleware', () => {
  it('accepts a valid JWT and sets user.id', async () => {
    (env as any).JWT_SECRET = 'sec';
    const token = await signToken('u1', 'sec');
    const res = await app.request('/protected', { headers: { Authorization: `Bearer ${token}` } }, env);
    expect(res.status).toBe(200);
    expect((await res.json() as any).user.id).toBe('u1');
  });
  it('accepts a valid x-api-key and sets user email/fullName', async () => {
    const res = await app.request('/protected', { headers: { 'x-api-key': 'ak_live_' + 'a'.repeat(40) } }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.user.email).toBe('a@b.co');
    expect(body.user.fullName).toBe('Alice');
  });
  it('rejects a missing token with AUTH_NO_TOKEN (401)', async () => {
    const res = await app.request('/protected', {}, env);
    expect(res.status).toBe(401);
    expect((await res.json() as any).errorCode).toBe('AUTH_NO_TOKEN');
  });
  it('rejects an unknown api key with AUTH_INVALID_API_KEY', async () => {
    const res = await app.request('/protected', { headers: { 'x-api-key': 'ak_live_' + 'z'.repeat(40) } }, env);
    expect((await res.json() as any).errorCode).toBe('AUTH_INVALID_API_KEY');
  });
});
