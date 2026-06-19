import { env } from 'cloudflare:test';
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

const OTHER_LINK_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  (env as any).BASE_SHORT_URL = 'https://blly.to';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('lu','l@x.co','h','','free','active','x','x')").run();
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('other-user-id','other@x.co','h','','free','active','x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,title,description,created_by,click_count,is_active,created_at,updated_at) VALUES ('seed-id','seedcode','https://seed.com','Seed','Seed desc','lu',0,1,'x','x')").run();
  // Seed a link owned by a different user for IDOR tests
  await env.DB.prepare(`INSERT INTO links (id,code,destination_url,title,description,created_by,click_count,is_active,created_at,updated_at) VALUES ('${OTHER_LINK_ID}','otherlink','https://other.com','Other','Other desc','other-user-id',0,1,'x','x')`).run();
  token = await signToken('lu', 'sec');
});
afterEach(() => vi.unstubAllGlobals());
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
  it('updateLink happy path updates title and returns _id', async () => {
    const createRes = await app.request('/api/v1/links', post({ destinationUrl: 'https://update-me.com', title: 'Original', description: 'D' }), env);
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;
    // Retrieve the id by fetching the link list and finding it by code
    const listRes = await app.request('/api/v1/links', { headers: authH() }, env);
    const list = (await listRes.json() as any).data as any[];
    const row = list.find((l: any) => l.code === created.code);
    expect(row).toBeDefined();
    const putRes = await app.request(`/api/v1/links/${row._id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify({ title: 'Updated Title' }) }, env);
    expect(putRes.status).toBe(200);
    const b = await putRes.json() as any;
    expect(b.data).toHaveProperty('_id');
    expect(b.data.title).toBe('Updated Title');
  });
  it('updateLink cross-user denied → LINK_NOT_FOUND', async () => {
    const res = await app.request(`/api/v1/links/${OTHER_LINK_ID}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify({ title: 'hacked' }) }, env);
    const b = await res.json() as any;
    expect(b.errorCode).toBe('LINK_NOT_FOUND');
  });
  it('deleteLink by-id cross-user denied → LINK_NOT_FOUND', async () => {
    const res = await app.request(`/api/v1/links/${OTHER_LINK_ID}`, { method: 'DELETE', headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.errorCode).toBe('LINK_NOT_FOUND');
  });
  it('getLinkByCode returns _id and destinationUrl', async () => {
    const createRes = await app.request('/api/v1/links', post({ destinationUrl: 'https://getbycode.com', code: 'mycode7', title: 'T', description: 'D' }), env);
    expect(createRes.status).toBe(201);
    const res = await app.request('/api/v1/links/code/mycode7', { headers: authH() }, env);
    expect(res.status).toBe(200);
    const b = await res.json() as any;
    expect(b.data).toHaveProperty('_id');
    expect(b.data.destinationUrl).toBe('https://getbycode.com');
  });
});
