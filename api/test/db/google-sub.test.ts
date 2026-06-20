import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

const ins = (id: string, email: string, sub: string | null) =>
  sub === null
    ? env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES (?,?,'','','free','active','x','x')").bind(id, email).run()
    : env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,google_sub,created_at,updated_at) VALUES (?,?,'','','free','active',?,'x','x')").bind(id, email, sub).run();

describe('users.google_sub migration', () => {
  it('stores a google_sub value', async () => {
    await ins('u1', 'a@b.co', 'sub-1');
    const row = await env.DB.prepare("SELECT google_sub FROM users WHERE id='u1'").first() as any;
    expect(row.google_sub).toBe('sub-1');
  });
  it('rejects a duplicate google_sub (unique index)', async () => {
    await ins('u2', 'c@d.co', 'dup');
    await expect(ins('u3', 'e@f.co', 'dup')).rejects.toThrow();
  });
  it('allows multiple NULL google_sub', async () => {
    await ins('n1', 'n1@x.co', null);
    await ins('n2', 'n2@x.co', null);
    const r = await env.DB.prepare("SELECT COUNT(*) c FROM users WHERE google_sub IS NULL").first() as any;
    expect(r.c).toBeGreaterThanOrEqual(2);
  });
});
