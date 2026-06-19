import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('schema', () => {
  it('creates all six tables', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all<{ name: string }>();
    const names = results.map((r) => r.name);
    for (const t of ['users', 'roles', 'user_roles', 'links', 'api_keys', 'redirect_logs']) {
      expect(names).toContain(t);
    }
  });

  it('enforces the account_type CHECK', async () => {
    await env.DB.prepare(
      "INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)"
    ).bind('u1', 'a@b.co', 'h', '', 'free', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z').run();
    await expect(
      env.DB.prepare(
        "INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)"
      ).bind('u2', 'c@d.co', 'h', '', 'WRONG', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z').run()
    ).rejects.toThrow();
  });
});
