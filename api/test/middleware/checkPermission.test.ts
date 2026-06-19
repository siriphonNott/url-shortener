import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import { Hono } from 'hono';
import { checkPermission } from '../../src/middleware/checkPermission';
import type { AppBindings } from '../../src/env';

const app = new Hono<AppBindings>();
app.use('*', async (c, next) => { c.set('user', { id: 'u1' }); return next(); });
app.get('/urls', checkPermission('urls', 'view'), (c) => c.json({ ok: true }));
app.get('/secret', checkPermission('admin', 'view'), (c) => c.json({ ok: true }));

beforeAll(async () => {
  await env.DB.prepare("INSERT INTO roles (id,name,description,permissions,created_at,updated_at) VALUES ('r1','viewer','','{\"urls\":{\"view\":true}}','x','x')").run();
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('u1','p@b.co','h','','free','active','x','x')").run();
  await env.DB.prepare("INSERT INTO user_roles (user_id,role_id) VALUES ('u1','r1')").run();
});

describe('checkPermission', () => {
  it('allows when a role grants the permission', async () => {
    const res = await app.request('/urls', {}, env);
    expect(res.status).toBe(200);
  });
  it('forbids when no role grants it', async () => {
    const res = await app.request('/secret', {}, env);
    expect(res.status).toBe(403);
    expect((await res.json() as any).errorCode).toBe('FORBIDDEN');
  });
});
