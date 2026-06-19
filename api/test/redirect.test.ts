import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import worker from '../src/index';

beforeAll(async () => {
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('ru','r@x.co','h','','free','active','x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('rl1','go','https://dest.example','ru',0,1,'x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,expires_at,created_at,updated_at) VALUES ('rl2','old','https://dest2.example','ru',0,1,'2000-01-01T00:00:00Z','x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('rl3','off','https://dest3.example','ru',0,0,'x','x')").run();
});

const hit = async (path: string) => {
  const ctx = createExecutionContext();
  const res = await worker.fetch(new Request(`https://blly.to${path}`), env, ctx);
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
    const row = await env.DB.prepare("SELECT click_count FROM links WHERE id='rl1'").first<{ click_count: number }>();
    expect(row!.click_count).toBeGreaterThanOrEqual(1);
    const logs = await env.DB.prepare("SELECT COUNT(*) n FROM redirect_logs WHERE link_id='rl1'").first<{ n: number }>();
    expect(logs!.n).toBeGreaterThanOrEqual(1);
  });
  it('expired link → LINK_EXPIRED', async () => {
    const res = await hit('/old');
    expect((await res.json() as any).errorCode).toBe('LINK_EXPIRED');
  });
  it('inactive link → LINK_NOT_FOUND', async () => {
    const res = await hit('/off');
    expect((await res.json() as any).errorCode).toBe('LINK_NOT_FOUND');
  });
  it('unknown code → LINK_NOT_FOUND', async () => {
    const res = await hit('/nope');
    expect((await res.json() as any).errorCode).toBe('LINK_NOT_FOUND');
  });
});
