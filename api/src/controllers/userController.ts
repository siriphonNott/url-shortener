import type { Context } from 'hono';
import { eq, and, or, like, desc, inArray, sql } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb, type DB } from '../db/client';
import { users, roles, userRoles } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { hashPassword } from '../lib/password';
import { nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();
const isUniqueErr = (e: unknown) => String((e as any)?.message || e).includes('UNIQUE constraint failed');

const toUserAdmin = (u: any, roleList: { id: string; name: string }[]) => ({
  id: u.id, fullName: u.fullName || '', email: u.email,
  accountType: u.accountType, status: u.status, roles: roleList, createdAt: u.createdAt,
});

async function rolesByUser(db: DB, userIds: string[]) {
  const map = new Map<string, { id: string; name: string }[]>();
  if (!userIds.length) return map;
  const rows = await db.select({ userId: userRoles.userId, id: roles.id, name: roles.name })
    .from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(userRoles.userId, userIds)).all();
  for (const r of rows) { const a = map.get(r.userId) || []; a.push({ id: r.id, name: r.name }); map.set(r.userId, a); }
  return map;
}

export const getUsers = async (c: C) => {
  const db = getDb(c.env);
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.max(1, Number(c.req.query('limit') || 10));
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || '';
  const conds = [] as any[];
  if (search) conds.push(or(like(users.fullName, `%${search}%`), like(users.email, `%${search}%`)));
  if (status) conds.push(eq(users.status, status));
  const where = conds.length ? and(...conds) : undefined;
  const totalRow = await db.select({ n: sql<number>`count(*)` }).from(users).where(where).get();
  const total = totalRow?.n ?? 0;
  const rows = await db.select({ id: users.id, fullName: users.fullName, email: users.email, accountType: users.accountType, status: users.status, createdAt: users.createdAt }).from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset((page - 1) * limit).all();
  const map = await rolesByUser(db, rows.map((r) => r.id));
  return ok(c, { data: rows.map((u) => toUserAdmin(u, map.get(u.id) || [])), pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
};

export const createUser = async (c: C) => {
  const { email, password, fullName, accountType, status, roles: roleIds } = (await c.req.json().catch(() => ({}))) ?? {};
  if (!email || !password) return fail(c, 'AUTH_MISSING_FIELDS');
  const db = getDb(c.env);
  const id = uuid(); const now = nowIso(); const lower = String(email).toLowerCase();
  try {
    await db.insert(users).values({ id, email: lower, password: await hashPassword(password), fullName: fullName || '', accountType: accountType || 'free', status: status || 'active', createdAt: now, updatedAt: now });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'AUTH_EMAIL_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
  const list: { id: string; name: string }[] = [];
  for (const rid of (roleIds || [])) {
    await db.insert(userRoles).values({ userId: id, roleId: rid });
    const r = await db.select({ id: roles.id, name: roles.name }).from(roles).where(eq(roles.id, rid)).get();
    if (r) list.push(r);
  }
  return ok(c, { data: toUserAdmin({ id, email: lower, fullName: fullName || '', accountType: accountType || 'free', status: status || 'active', createdAt: now }, list) }, 201);
};

export const updateUser = async (c: C) => {
  const { fullName, accountType, status, email, roles: roleIds } = (await c.req.json().catch(() => ({}))) ?? {};
  const db = getDb(c.env);
  const id = c.req.param('id');
  const set: Record<string, unknown> = { updatedAt: nowIso() };
  if (fullName !== undefined) set.fullName = fullName;
  if (accountType !== undefined) set.accountType = accountType;
  if (status !== undefined) set.status = status;
  if (email !== undefined) set.email = String(email).toLowerCase();
  const updated = await db.update(users).set(set).where(eq(users.id, id)).returning().get();
  if (!updated) return fail(c, 'USER_NOT_FOUND');
  if (roleIds !== undefined) {
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    for (const rid of roleIds) await db.insert(userRoles).values({ userId: id, roleId: rid });
  }
  const map = await rolesByUser(db, [id]);
  return ok(c, { data: toUserAdmin(updated, map.get(id) || []) });
};

export const deleteUser = async (c: C) => {
  const db = getDb(c.env);
  const deleted = await db.delete(users).where(eq(users.id, c.req.param('id'))).returning().get();
  if (!deleted) return fail(c, 'USER_NOT_FOUND');
  return ok(c, { message: 'User deleted successfully' });
};
