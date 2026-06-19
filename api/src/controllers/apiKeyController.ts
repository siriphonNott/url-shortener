import type { Context } from 'hono';
import { eq, and, or, like, desc, inArray, gte, sql } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { apiKeys, users, links, redirectLogs } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { generateKey } from '../lib/keys';
import { formatKey } from '../serializers';
import { last7Days, nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();
const adhoc = (c: C, message: string, status: 400 | 404) => c.json({ success: false, message }, status);
const dayOf = (iso: string) => iso.split('T')[0];

export const listKeys = async (c: C) => {
  const db = getDb(c.env);
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || '';
  const conds = [] as any[];
  if (status) conds.push(eq(apiKeys.status, status));
  if (search) conds.push(or(like(apiKeys.keyName, `%${search}%`), like(apiKeys.keyPrefix, `%${search}%`)));
  const where = conds.length ? and(...conds) : undefined;
  const totalRow = await db.select({ n: sql<number>`count(*)` }).from(apiKeys).where(where).get();
  const total = totalRow?.n ?? 0;
  const rows = await db.select().from(apiKeys).where(where).orderBy(desc(apiKeys.createdAt)).limit(limit).offset((page - 1) * limit).all();
  const userMap = new Map<string, any>();
  const uids = [...new Set(rows.map((r) => r.userId))];
  if (uids.length) for (const u of await db.select().from(users).where(inArray(users.id, uids)).all()) userMap.set(u.id, u);
  return ok(c, {
    keys: rows.map((k) => formatKey(k, userMap.get(k.userId))),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

export const createKey = async (c: C) => {
  const { keyName, userId, scopes, expiresAt } = await c.req.json().catch(() => ({}));
  if (!keyName) return adhoc(c, 'keyName is required', 400);
  const db = getDb(c.env);
  const targetUserId = userId || c.get('user').id;
  const user = await db.select().from(users).where(eq(users.id, targetUserId)).get();
  if (!user) return fail(c, 'USER_NOT_FOUND');
  const { fullKey, keyHash, keyPrefix } = await generateKey();
  const id = uuid(); const now = nowIso();
  await db.insert(apiKeys).values({ id, userId: targetUserId, keyName, keyHash, keyPrefix, scopes: JSON.stringify(scopes || { links: 'read', stats: 'read' }), status: 'active', expiresAt: expiresAt || null, lastUsedAt: null, isPersonal: 0, createdAt: now, updatedAt: now });
  const row = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();
  return ok(c, { key: { ...formatKey(row, user), apiKey: fullKey } }, 201);
};

export const updateKey = async (c: C) => {
  const { keyName, scopes, status, expiresAt } = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const set: Record<string, unknown> = { updatedAt: nowIso() };
  if (keyName !== undefined) set.keyName = keyName;
  if (scopes !== undefined) set.scopes = JSON.stringify(scopes);
  if (status !== undefined) set.status = status;
  if (expiresAt !== undefined) set.expiresAt = expiresAt || null;
  const updated = await db.update(apiKeys).set(set).where(eq(apiKeys.id, c.req.param('id'))).returning().get();
  if (!updated) return adhoc(c, 'API Key not found', 404);
  const user = await db.select().from(users).where(eq(users.id, updated.userId)).get();
  return ok(c, formatKey(updated, user));
};

export const deleteKey = async (c: C) => {
  const db = getDb(c.env);
  const deleted = await db.delete(apiKeys).where(eq(apiKeys.id, c.req.param('id'))).returning().get();
  if (!deleted) return adhoc(c, 'API Key not found', 404);
  return ok(c, {});
};

export const getKeyStats = async (c: C) => {
  const db = getDb(c.env);
  const key = await db.select().from(apiKeys).where(eq(apiKeys.id, c.req.param('id'))).get();
  if (!key) return adhoc(c, 'API Key not found', 404);
  const user = await db.select().from(users).where(eq(users.id, key.userId)).get();
  const now = new Date();
  const userLinks = await db.select().from(links).where(eq(links.createdBy, key.userId)).all();
  const ids = userLinks.map((l) => l.id);
  const logs = ids.length
    ? await db.select().from(redirectLogs).where(and(inArray(redirectLogs.linkId, ids), gte(redirectLogs.createdAt, new Date(now.getTime() - 7 * 864e5).toISOString()))).orderBy(desc(redirectLogs.createdAt)).limit(1000).all()
    : [];
  const totalClicks = userLinks.reduce((s, l) => s + l.clickCount, 0);
  const activeLinks = userLinks.filter((l) => l.isActive === 1 && (!l.expiresAt || new Date(l.expiresAt) > now)).length;
  const timeline = last7Days(now).map((date) => ({
    date,
    clicks: logs.filter((l) => dayOf(l.createdAt) === date).length,
    linksCreated: userLinks.filter((l) => dayOf(l.createdAt) === date).length,
  }));
  const deviceMap: Record<string, number> = {};
  for (const l of logs) { const ua = (l.userAgent || '').toLowerCase(); let d = 'Unknown'; if (/mobile|android|iphone|ipad/.test(ua)) d = 'Mobile'; else if (/windows|mac|linux/.test(ua)) d = 'Desktop'; deviceMap[d] = (deviceMap[d] || 0) + 1; }
  const devices = Object.entries(deviceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return ok(c, { key: formatKey(key, user), stats: { totalLinks: userLinks.length, activeLinks, totalClicks }, timeline, devices });
};
