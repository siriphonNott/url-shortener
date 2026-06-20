import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import worker from '../src/index';

beforeAll(async () => {
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('ru','r@x.co','h','','free','active','x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('rl1','go','https://dest.example','ru',0,1,'x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,expires_at,created_at,updated_at) VALUES ('rl2','old','https://dest2.example','ru',0,1,'2000-01-01T00:00:00Z','x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('rl3','off','https://dest3.example','ru',0,0,'x','x')").run();
});

const hit = async (path: string, headers?: Record<string, string>) => {
  const ctx = createExecutionContext();
  const res = await worker.fetch(new Request(`https://blly.to${path}`, { headers }), env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
};

describe('redirect', () => {
  it('redirects active code with 302 to destination', async () => {
    const res = await hit('/go');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://dest.example');
  });
  it('increments click_count and writes a log (via waitUntil)', async () => {
    await hit('/go');
    // isolatedStorage:true rolls back to the beforeAll snapshot (click_count=0, no logs) per `it`,
    // so exactly one hit must yield exactly one increment and one log — assert strict equality.
    const row = await env.DB.prepare("SELECT click_count FROM links WHERE id='rl1'").first<{ click_count: number }>();
    expect(row!.click_count).toBe(1);
    const logs = await env.DB.prepare("SELECT COUNT(*) n FROM redirect_logs WHERE link_id='rl1'").first<{ n: number }>();
    expect(logs!.n).toBe(1);
  });
  it('unknown code → 404 HTML not-found page (English default)', async () => {
    const res = await hit('/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('Page not found');
  });
  it('inactive link → 404 HTML not-found page', async () => {
    const res = await hit('/off');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('Page not found');
  });
  it('expired link → 410 HTML expired page', async () => {
    const res = await hit('/old');
    expect(res.status).toBe(410);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('This link has expired');
  });
  it('Accept-Language th → Thai not-found copy', async () => {
    const res = await hit('/nope', { 'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8' });
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('ไม่พบลิงก์นี้');
  });
  it('Accept-Language th → Thai expired copy', async () => {
    const res = await hit('/old', { 'Accept-Language': 'th-TH,th;q=0.9' });
    expect(res.status).toBe(410);
    expect(await res.text()).toContain('ลิงก์นี้หมดอายุแล้ว');
  });
});
