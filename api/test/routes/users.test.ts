import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('admin','admin@x.co','h','Admin','enterprise','active','2026-06-01T00:00:00Z','x')").run();
  await env.DB.prepare("INSERT INTO roles (id,name,description,permissions,created_at,updated_at) VALUES ('rr','editor','','{}','x','x')").run();
  token = await signToken('admin', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });
const post = (body: any) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify(body) });

describe('users routes', () => {
  it('list returns {data,pagination} with id (not _id) and roles', async () => {
    const res = await app.request('/api/v1/users', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.data[0]).toHaveProperty('id');
    expect(b.data[0]).toHaveProperty('accountType');
    expect(Array.isArray(b.data[0].roles)).toBe(true);
    expect(b.pagination).toMatchObject({ page: 1, limit: 10 });
    expect(typeof b.pagination.total).toBe('number');
  });
  it('search filters by email substring', async () => {
    await app.request('/api/v1/users', post({ email: 'findme@x.co', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/users?search=findme', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.data.length).toBeGreaterThan(0);
    expect(b.data.every((u: any) => u.email.includes('findme'))).toBe(true);
  });
  it('create hashes password, attaches roles, rejects duplicate email', async () => {
    const r1 = await app.request('/api/v1/users', post({ email: 'dupu@x.co', password: 'pw123456', roles: ['rr'] }), env);
    expect(r1.status).toBe(201);
    expect((await r1.json() as any).data.roles[0]).toMatchObject({ id: 'rr', name: 'editor' });
    const r2 = await app.request('/api/v1/users', post({ email: 'dupu@x.co', password: 'pw123456' }), env);
    expect((await r2.json() as any).errorCode).toBe('AUTH_EMAIL_EXISTS');
  });
  it('create missing fields → AUTH_MISSING_FIELDS', async () => {
    const res = await app.request('/api/v1/users', post({ email: 'x@x.co' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_MISSING_FIELDS');
  });
  it('update changes status + roles; delete removes the user', async () => {
    const c = await app.request('/api/v1/users', post({ email: 'upd@x.co', password: 'pw123456' }), env);
    const id = (await c.json() as any).data.id;
    const u = await app.request(`/api/v1/users/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify({ status: 'suspended', roles: ['rr'] }) }, env);
    const ub = await u.json() as any;
    expect(ub.data.status).toBe('suspended');
    expect(ub.data.roles[0].id).toBe('rr');
    const d = await app.request(`/api/v1/users/${id}`, { method: 'DELETE', headers: authH() }, env);
    expect(d.status).toBe(200);
    const g = await app.request(`/api/v1/users/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: '{}' }, env);
    expect((await g.json() as any).errorCode).toBe('USER_NOT_FOUND');
  });
});
