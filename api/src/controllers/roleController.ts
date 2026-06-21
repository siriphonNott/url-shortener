import type { Context } from 'hono';
import { eq, asc, sql } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { roles, userRoles } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { serializeRole } from '../serializers';
import { nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();
const isUniqueErr = (e: unknown) => String((e as any)?.message || e).includes('UNIQUE constraint failed');

export const getRoles = async (c: C) => {
  const db = getDb(c.env);
  const rows = await db.select().from(roles).orderBy(asc(roles.createdAt)).all();
  const counts = await db.select({ roleId: userRoles.roleId, n: sql<number>`count(*)` }).from(userRoles).groupBy(userRoles.roleId).all();
  const countMap = new Map(counts.map((r) => [r.roleId, r.n]));
  return ok(c, { data: rows.map((r) => serializeRole(r, countMap.get(r.id) || 0)) });
};

export const createRole = async (c: C) => {
  const { name, description, permissions } = (await c.req.json().catch(() => ({}))) ?? {};
  if (!name) return fail(c, 'ROLE_NAME_EXISTS'); // preserved quirk: missing name → ROLE_NAME_EXISTS (NOT a validation error); do NOT "fix" — ARCHITECTURE.md §5
  const db = getDb(c.env);
  const id = uuid(); const now = nowIso();
  try {
    await db.insert(roles).values({ id, name, description: description || '', permissions: JSON.stringify(permissions || {}), createdAt: now, updatedAt: now });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'ROLE_NAME_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
  const row = await db.select().from(roles).where(eq(roles.id, id)).get();
  return ok(c, { data: serializeRole(row) }, 201);
};

export const updateRole = async (c: C) => {
  const { name, description, permissions } = (await c.req.json().catch(() => ({}))) ?? {};
  const db = getDb(c.env);
  const set: Record<string, unknown> = { updatedAt: nowIso() };
  if (name !== undefined) set.name = name;
  if (description !== undefined) set.description = description;
  if (permissions !== undefined) set.permissions = JSON.stringify(permissions);
  try {
    const updated = await db.update(roles).set(set).where(eq(roles.id, c.req.param('id'))).returning().get();
    if (!updated) return fail(c, 'ROLE_NOT_FOUND');
    return ok(c, { data: serializeRole(updated) });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'ROLE_NAME_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
};

export const deleteRole = async (c: C) => {
  const db = getDb(c.env);
  const id = c.req.param('id');
  const deleted = await db.delete(roles).where(eq(roles.id, id)).returning().get();
  if (!deleted) return fail(c, 'ROLE_NOT_FOUND');
  await db.delete(userRoles).where(eq(userRoles.roleId, id));
  return ok(c, { message: 'Role deleted successfully' });
};
