import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('au','an@x.co','h','','free','active','2026-06-10T00:00:00Z','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('al1','aco','https://x.com','au',2,1,'2026-06-18T00:00:00Z','x')").run();
  await env.DB.prepare("INSERT INTO redirect_logs (id,link_id,ip,user_agent,referer,country,city,created_at) VALUES ('g1','al1','1.1.1.1','Mozilla Windows Chrome',NULL,'TH','Bangkok','2026-06-18T10:00:00Z')").run();
  await env.DB.prepare("INSERT INTO redirect_logs (id,link_id,ip,user_agent,referer,country,city,created_at) VALUES ('g2','al1','2.2.2.2','iPhone Safari','https://t.co','US','NY','2026-06-18T11:00:00Z')").run();
  // Seed a different user and their link for IDOR tests
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('ou','ou@x.co','h','','free','active','2026-06-10T00:00:00Z','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('ol1','oco','https://o.com','ou',5,1,'2026-06-18T00:00:00Z','x')").run();
  token = await signToken('au', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });

describe('links analytics', () => {
  it('getAnalytics returns stats/timeline/devices/trafficType/locations', async () => {
    const res = await app.request('/api/v1/links/analytics', { headers: authH() }, env);
    expect(res.status).toBe(200);
    const b = await res.json() as any;
    expect(b.stats).toMatchObject({ totalLinks: 1, totalClicks: 2, qrScans: 0 });
    expect(Array.isArray(b.timeline)).toBe(true);
    expect(b.timeline).toHaveLength(7);
    expect(b.trafficType).toMatchObject({ direct: 1, qr: 0, referral: 1 });
    expect(b.locations.countries.find((x: any) => x.name === 'Thailand')).toBeTruthy();
    expect(b.locations.cities.find((x: any) => x.name === 'Bangkok')).toBeTruthy();
  });
  it('getLogs returns logs with _id and userAgent', async () => {
    const res = await app.request('/api/v1/links/al1/logs', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.data[0]).toHaveProperty('_id');
    expect(b.data[0]).toHaveProperty('userAgent');
  });
  it('getLinkAnalytics returns link header + timeline', async () => {
    const res = await app.request('/api/v1/links/al1/analytics', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.link).toMatchObject({ code: 'aco', totalClicks: 2 });
    expect(b.timeline).toHaveLength(7);
  });
  it('getLogs denies access to another user link (IDOR)', async () => {
    const res = await app.request('/api/v1/links/ol1/logs', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.errorCode).toBe('LINK_NOT_FOUND');
  });
  it('getLinkAnalytics denies access to another user link (IDOR)', async () => {
    const res = await app.request('/api/v1/links/ol1/analytics', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.errorCode).toBe('LINK_NOT_FOUND');
  });
});
