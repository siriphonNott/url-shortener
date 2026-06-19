import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';

beforeAll(() => { (env as any).JWT_SECRET = 'sec'; });

const json = (body: any, headers: any = {}) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('auth routes', () => {
  it('register returns token + user (201) and hashes password', async () => {
    const res = await app.request('/api/v1/auth/register', json({ email: 'New@X.com', password: 'pw123456' }), env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe('new@x.com'); // lowercased
    expect(body.user).not.toHaveProperty('password');
  });
  it('register with duplicate email → AUTH_EMAIL_EXISTS', async () => {
    await app.request('/api/v1/auth/register', json({ email: 'dup@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/register', json({ email: 'dup@x.com', password: 'pw123456' }), env);
    expect(res.status).toBe(400);
    expect((await res.json() as any).errorCode).toBe('AUTH_EMAIL_EXISTS');
  });
  it('register missing fields → AUTH_MISSING_FIELDS', async () => {
    const res = await app.request('/api/v1/auth/register', json({ email: 'x@x.com' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_MISSING_FIELDS');
  });
  it('login with correct creds returns token', async () => {
    await app.request('/api/v1/auth/register', json({ email: 'log@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/login', json({ email: 'log@x.com', password: 'pw123456' }), env);
    expect(res.status).toBe(200);
    expect((await res.json() as any).token).toBeTruthy();
  });
  it('login wrong password → AUTH_INVALID_CREDENTIALS', async () => {
    await app.request('/api/v1/auth/register', json({ email: 'log2@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/login', json({ email: 'log2@x.com', password: 'nope' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_INVALID_CREDENTIALS');
  });
  it('null JSON body is handled (flat envelope, not 500)', async () => {
    const res = await app.request('/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'null' }, env);
    const b = await res.json() as any;
    expect(res.status).toBe(400);
    expect(b.success).toBe(false);
    expect(b.errorCode).toBe('AUTH_MISSING_FIELDS');
  });
  it('regenerate then getApiKey returns prefix only (no full key)', async () => {
    const reg = await app.request('/api/v1/auth/register', json({ email: 'key@x.com', password: 'pw123456' }), env);
    const token = (await reg.json() as any).token;
    const gen = await app.request('/api/v1/auth/api-key/regenerate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }, env);
    const genBody = await gen.json() as any;
    expect(genBody.apiKey).toMatch(/^ak_live_[A-Za-z0-9]{40}$/); // full key shown once
    const get = await app.request('/api/v1/auth/api-key', { headers: { Authorization: `Bearer ${token}` } }, env);
    const getBody = await get.json() as any;
    expect(getBody.hasKey).toBe(true);
    expect(getBody.keyPrefix).toBe(genBody.keyPrefix);
    expect(getBody).not.toHaveProperty('apiKey');
  });
});
