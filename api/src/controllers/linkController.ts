import type { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { links, redirectLogs } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { fetchPageMeta } from '../lib/meta';
import { serializeLink } from '../serializers';
import { nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isUniqueErr = (e: unknown) => String((e as any)?.message || e).includes('UNIQUE constraint failed');

export const getLinks = async (c: C) => {
  const db = getDb(c.env);
  const rows = await db.select().from(links).where(eq(links.createdBy, c.get('user').id)).orderBy(desc(links.createdAt)).all();
  return ok(c, { data: rows.map(serializeLink) });
};

export const createLink = async (c: C) => {
  const body = await c.req.json().catch(() => ({}));
  const { destinationUrl, code, expiresAt } = body;
  let { title, description } = body;
  if (!destinationUrl) return fail(c, 'LINK_MISSING_URL');
  if (!title?.trim() || !description?.trim()) {
    const meta = await fetchPageMeta(destinationUrl);
    if (!title?.trim()) title = meta.title;
    if (!description?.trim()) description = meta.description;
  }
  const shortCode = code?.trim() || nanoid(7);
  const db = getDb(c.env);
  const id = uuid(); const now = nowIso();
  try {
    await db.insert(links).values({ id, code: shortCode, destinationUrl, title: title || null, description: description || null, expiresAt: expiresAt || null, createdBy: c.get('user').id, clickCount: 0, isActive: 1, createdAt: now, updatedAt: now });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'LINK_CODE_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
  return ok(c, {
    code: shortCode,
    destinationUrl,
    shortUrl: `${c.env.BASE_SHORT_URL.replace(/\/$/, '')}/${shortCode}`,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  }, 201);
};

export const updateLink = async (c: C) => {
  const body = await c.req.json().catch(() => ({}));
  const { title, description, destinationUrl, code, isActive, expiresAt } = body;
  // Guard each field: only write provided keys (destinationUrl is NOT NULL — never overwrite with undefined).
  const set: Record<string, unknown> = { updatedAt: nowIso() };
  if (title !== undefined) set.title = title;
  if (description !== undefined) set.description = description;
  if (destinationUrl !== undefined) set.destinationUrl = destinationUrl;
  if (expiresAt !== undefined) set.expiresAt = expiresAt || null;
  if (typeof isActive === 'boolean') set.isActive = isActive ? 1 : 0;
  if (code?.trim()) set.code = code.trim();
  const db = getDb(c.env);
  try {
    const updated = await db.update(links).set(set).where(and(eq(links.id, c.req.param('id')), eq(links.createdBy, c.get('user').id))).returning().get();
    if (!updated) return fail(c, 'LINK_NOT_FOUND');
    return ok(c, { data: serializeLink(updated) });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'LINK_CODE_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
};

export const deleteLink = async (c: C) => {
  const ref = c.req.param('id');
  const db = getDb(c.env);
  const row = isUuid(ref)
    ? await db.select().from(links).where(and(eq(links.id, ref), eq(links.createdBy, c.get('user').id))).get()
    : await db.select().from(links).where(and(eq(links.code, ref), eq(links.createdBy, c.get('user').id))).get();
  if (!row) return fail(c, 'LINK_NOT_FOUND');
  await db.delete(links).where(eq(links.id, row.id)); // redirect_logs cascade via FK
  return ok(c, { message: 'Link deleted successfully' });
};

export const getLinkByCode = async (c: C) => {
  const db = getDb(c.env);
  const row = await db.select().from(links).where(and(eq(links.code, c.req.param('code')), eq(links.createdBy, c.get('user').id))).get();
  if (!row) return fail(c, 'LINK_NOT_FOUND');
  return ok(c, { data: serializeLink(row) });
};
