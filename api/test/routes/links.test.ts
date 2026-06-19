import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect, vi } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  (env as any).BASE_SHORT_URL = 'https://blly.to';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('lu','l@x.co','h','','free','active','x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,title,description,created_by,click_count,is_active,created_at,updated_at) VALUES ('seed-id','seedcode','https://seed.com','Seed','Seed desc','lu',0,1,'x','x')").run();
  token = await signToken('lu', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });
const post = (body: any) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify(body) });

describe('links routes', () => {
  it('createLink generates a 7-char code and shortUrl from BASE_SHORT_URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<title>T</title>', { status: 200 })));
    const res = await app.request('/api/v1/links', post({ destinationUrl: 'https://example.com', title: 'My', description: 'D' }), env);
    expect(res.status).toBe(201);
    const b = await res.json() as any;
    expect(b.code).toHaveLength(7);
    expect(b.shortUrl).toBe(`https://blly.to/${b.code}`);
  });
  it('createLink missing url → LINK_MISSING_URL', async () => {
    const res = await app.request('/api/v1/links', post({}), env);
    expect((await res.json() as any).errorCode).toBe('LINK_MISSING_URL');
  });
  it('createLink with duplicate custom code → LINK_CODE_EXISTS', async () => {
    await app.request('/api/v1/links', post({ destinationUrl: 'https://a.com', code: 'dupcode', title: 't', description: 'd' }), env);
    const res = await app.request('/api/v1/links', post({ destinationUrl: 'https://b.com', code: 'dupcode', title: 't', description: 'd' }), env);
    expect((await res.json() as any).errorCode).toBe('LINK_CODE_EXISTS');
  });
  it('getLinks returns the user links with _id', async () => {
    const res = await app.request('/api/v1/links', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(Array.isArray(b.data)).toBe(true);
    expect(b.data[0]).toHaveProperty('_id');
    expect(b.data[0]).toHaveProperty('isActive');
  });
  it('shorten endpoint maps to createLink', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<title>T</title>', { status: 200 })));
    const res = await app.request('/api/v1/shorten', post({ destinationUrl: 'https://ex2.com', title: 't', description: 'd' }), env);
    expect(res.status).toBe(201);
  });
  it('deleteLink by code (non-uuid) removes it', async () => {
    await app.request('/api/v1/links', post({ destinationUrl: 'https://del.com', code: 'delme', title: 't', description: 'd' }), env);
    const res = await app.request('/api/v1/links/delme', { method: 'DELETE', headers: authH() }, env);
    expect(res.status).toBe(200);
  });
});
