import { eq } from 'drizzle-orm';
import type { Env } from './env.d';
import { getDb } from './db/client';
import { users, roles, userRoles } from './db/schema';
import { hashPassword } from './lib/password';
import { nowIso } from './lib/time';

const MENUS = ['dashboard', 'urls', 'users', 'docs', 'api_key', 'api_keys', 'roles'] as const;
const ACTIONS = ['view', 'edit', 'delete'] as const;
export const ADMIN_PERMISSIONS = Object.fromEntries(
  MENUS.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, true]))])
);

export async function seedAdmin(env: Env, opts: { email: string; password: string }) {
  const db = getDb(env);
  const email = opts.email.toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    const r = await db.select().from(roles).where(eq(roles.name, 'admin')).get();
    return { roleId: r!.id, userId: existing.id };
  }
  const now = nowIso();
  let role = await db.select().from(roles).where(eq(roles.name, 'admin')).get();
  let roleId = role?.id;
  if (!roleId) {
    roleId = crypto.randomUUID();
    await db.insert(roles).values({ id: roleId, name: 'admin', description: 'Administrator', permissions: JSON.stringify(ADMIN_PERMISSIONS), createdAt: now, updatedAt: now });
  }
  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, email, password: await hashPassword(opts.password), fullName: 'Admin', accountType: 'enterprise', status: 'active', createdAt: now, updatedAt: now });
  await db.insert(userRoles).values({ userId, roleId });
  return { roleId, userId };
}
