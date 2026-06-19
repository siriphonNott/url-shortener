import type { Context } from 'hono';
import { eq, and, desc, inArray, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { links, redirectLogs } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { fetchPageMeta } from '../lib/meta';
import { serializeLink, serializeLog } from '../serializers';
import { nowIso, last7Days } from '../lib/time';
import { parseDevice, COUNTRY_NAMES } from '../lib/geo';

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

const sevenDaysAgoIso = (now: Date) => new Date(now.getTime() - 7 * 864e5).toISOString();
const dayOf = (iso: string) => iso.split('T')[0];

export const getLogs = async (c: C) => {
  const db = getDb(c.env);
  const link = await db.select().from(links).where(and(eq(links.id, c.req.param('id')), eq(links.createdBy, c.get('user').id))).get();
  if (!link) return fail(c, 'LINK_NOT_FOUND');
  const rows = await db.select().from(redirectLogs).where(eq(redirectLogs.linkId, link.id)).orderBy(desc(redirectLogs.createdAt)).limit(200).all();
  return ok(c, { data: rows.map(serializeLog) });
};

function buildAnalytics(linkRows: any[], logs: any[], now: Date) {
  const days = last7Days(now);
  const timeline = days.map((date) => ({
    date,
    clicks: logs.filter((l) => dayOf(l.createdAt) === date).length,
    qrScans: 0,
    linksCreated: linkRows.filter((l) => dayOf(l.createdAt) === date).length,
  }));
  const deviceMap: Record<string, number> = {};
  for (const l of logs) { const d = parseDevice(l.userAgent); deviceMap[d] = (deviceMap[d] || 0) + 1; }
  const devices = Object.entries(deviceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const direct = logs.filter((l) => !l.referer).length;
  const referral = logs.filter((l) => !!l.referer).length;
  const countryMap: Record<string, number> = {}; const cityMap: Record<string, number> = {};
  for (const l of logs) {
    if (l.country) { const cn = COUNTRY_NAMES[l.country] || l.country; countryMap[cn] = (countryMap[cn] || 0) + 1; }
    if (l.city) cityMap[l.city] = (cityMap[l.city] || 0) + 1;
  }
  const total = Math.max(logs.length, 1);
  const top = (m: Record<string, number>) => Object.entries(m).map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) })).sort((a, b) => b.count - a.count).slice(0, 10);
  return { timeline, devices, trafficType: { direct, qr: 0, referral }, locations: { countries: top(countryMap), cities: top(cityMap) } };
}

export const getAnalytics = async (c: C) => {
  const db = getDb(c.env);
  const now = new Date();
  const linkRows = await db.select().from(links).where(eq(links.createdBy, c.get('user').id)).all();
  const ids = linkRows.map((l) => l.id);
  const logs = ids.length
    ? await db.select().from(redirectLogs).where(and(inArray(redirectLogs.linkId, ids), gte(redirectLogs.createdAt, sevenDaysAgoIso(now)))).orderBy(desc(redirectLogs.createdAt)).limit(1000).all()
    : [];
  const totalClicks = linkRows.reduce((s, l) => s + l.clickCount, 0);
  const activeLinks = linkRows.filter((l) => l.isActive === 1 && (!l.expiresAt || new Date(l.expiresAt) > now)).length;
  const a = buildAnalytics(linkRows, logs, now);
  return ok(c, { stats: { totalLinks: linkRows.length, activeLinks, totalClicks, qrScans: 0 }, ...a, lastUpdated: now.toISOString() });
};

export const getLinkAnalytics = async (c: C) => {
  const db = getDb(c.env);
  const now = new Date();
  const link = await db.select().from(links).where(and(eq(links.id, c.req.param('id')), eq(links.createdBy, c.get('user').id))).get();
  if (!link) return fail(c, 'LINK_NOT_FOUND');
  const logs = await db.select().from(redirectLogs).where(and(eq(redirectLogs.linkId, link.id), gte(redirectLogs.createdAt, sevenDaysAgoIso(now)))).orderBy(desc(redirectLogs.createdAt)).limit(1000).all();
  const a = buildAnalytics([], logs, now);
  return ok(c, {
    link: { code: link.code, title: link.title, totalClicks: link.clickCount, createdAt: link.createdAt },
    timeline: a.timeline.map(({ date, clicks }) => ({ date, clicks })),
    devices: a.devices, trafficType: a.trafficType, locations: a.locations,
  });
};
