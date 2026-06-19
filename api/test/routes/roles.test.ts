import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('ra','ra@x.co','h','','free','active','x','x')").run();
  token = await signToken('ra', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });
const post = (body: any) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify(body) });

describe('roles routes', () => {
  it('create returns _id + parsed permissions; list shows numeric userCount', async () => {
    const c = await app.request('/api/v1/roles', post({ name: 'mgr', description: 'd', permissions: { urls: { view: true } } }), env);
    expect(c.status).toBe(201);
    const cb = await c.json() as any;
    expect(cb.data._id).toBeTruthy();
    expect(cb.data.permissions).toEqual({ urls: { view: true } });
    const list = await app.request('/api/v1/roles', { headers: authH() }, env);
    const lb = await list.json() as any;
    expect(lb.data.find((r: any) => r.name === 'mgr')).toMatchObject({ userCount: 0 });
  });
  it('create with no name → ROLE_NAME_EXISTS (the quirk)', async () => {
    const res = await app.request('/api/v1/roles', post({ description: 'x' }), env);
    expect(res.status).toBe(400);
    expect((await res.json() as any).errorCode).toBe('ROLE_NAME_EXISTS');
  });
  it('create duplicate name → ROLE_NAME_EXISTS', async () => {
    await app.request('/api/v1/roles', post({ name: 'dupr' }), env);
    const res = await app.request('/api/v1/roles', post({ name: 'dupr' }), env);
    expect((await res.json() as any).errorCode).toBe('ROLE_NAME_EXISTS');
  });
  it('delete removes role and its user_roles; update missing → ROLE_NOT_FOUND', async () => {
    const c = await app.request('/api/v1/roles', post({ name: 'tmp' }), env);
    const id = (await c.json() as any).data._id;
    await env.DB.prepare("INSERT INTO user_roles (user_id,role_id) VALUES ('ra',?)").bind(id).run();
    const d = await app.request(`/api/v1/roles/${id}`, { method: 'DELETE', headers: authH() }, env);
    expect(d.status).toBe(200);
    const n = await env.DB.prepare('SELECT COUNT(*) n FROM user_roles WHERE role_id=?').bind(id).first<{ n: number }>();
    expect(n!.n).toBe(0);
    const u = await app.request(`/api/v1/roles/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: '{}' }, env);
    expect((await u.json() as any).errorCode).toBe('ROLE_NOT_FOUND');
  });
});
