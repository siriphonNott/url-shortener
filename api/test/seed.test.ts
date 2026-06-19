import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { seedAdmin, ADMIN_PERMISSIONS } from '../src/seed';

describe('seed', () => {
  it('creates an admin role with the full matrix and an admin user', async () => {
    const { roleId, userId } = await seedAdmin(env as any, { email: 'admin@blly.to', password: 'admin12345' });
    const role = await env.DB.prepare('SELECT permissions FROM roles WHERE id=?').bind(roleId).first<{ permissions: string }>();
    expect(JSON.parse(role!.permissions)).toEqual(ADMIN_PERMISSIONS);
    const link = await env.DB.prepare('SELECT COUNT(*) n FROM user_roles WHERE user_id=? AND role_id=?').bind(userId, roleId).first<{ n: number }>();
    expect(link!.n).toBe(1);
  });
  it('is idempotent (second call does not duplicate)', async () => {
    await seedAdmin(env as any, { email: 'admin2@blly.to', password: 'admin12345' });
    await seedAdmin(env as any, { email: 'admin2@blly.to', password: 'admin12345' });
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE email='admin2@blly.to'").first<{ n: number }>();
    expect(n!.n).toBe(1);
  });
});
