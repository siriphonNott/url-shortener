import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { apiKeys, users } from '../db/schema';
import { hashKey } from '../lib/keys';
import { verifyToken } from '../lib/jwt';
import { fail } from '../lib/errorCodes';
import { nowIso } from '../lib/time';

export const auth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const db = getDb(c.env);
  const apiKeyHeader = c.req.header('x-api-key');

  if (apiKeyHeader) {
    const hash = await hashKey(apiKeyHeader);
    const key = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).get();
    if (!key) return fail(c, 'AUTH_INVALID_API_KEY');
    if (key.status === 'revoked') return fail(c, 'AUTH_API_KEY_REVOKED');
    if (key.status === 'inactive') return fail(c, 'AUTH_API_KEY_INACTIVE');
    if (key.expiresAt && new Date() > new Date(key.expiresAt)) {
      await db.update(apiKeys).set({ status: 'expired' }).where(eq(apiKeys.id, key.id));
      return fail(c, 'AUTH_API_KEY_EXPIRED');
    }
    if (key.status === 'expired') return fail(c, 'AUTH_API_KEY_EXPIRED');
    // Fire-and-forget lastUsedAt update. The promise starts immediately; only the
    // waitUntil scheduling is guarded because c.executionCtx THROWS when no
    // ExecutionContext was provided (e.g. app.request(...) in tests without a ctx arg).
    const touch = db.update(apiKeys).set({ lastUsedAt: nowIso() }).where(eq(apiKeys.id, key.id)).then(() => {}, () => {});
    try { c.executionCtx.waitUntil(touch); } catch { /* no execution context (tests) */ }
    const u = await db.select().from(users).where(eq(users.id, key.userId)).get();
    c.set('user', { id: key.userId, email: u?.email, fullName: u?.fullName });
    return next();
  }

  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return fail(c, 'AUTH_NO_TOKEN');
  try {
    c.set('user', await verifyToken(token, c.env.JWT_SECRET));
    return next();
  } catch {
    return fail(c, 'AUTH_INVALID_TOKEN');
  }
};
