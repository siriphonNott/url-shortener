import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { roles, userRoles } from '../db/schema';
import { fail } from '../lib/errorCodes';

export const checkPermission = (menu: string, action: string): MiddlewareHandler<AppBindings> => async (c, next) => {
  const user = c.get('user');
  if (!user?.id) return fail(c, 'AUTH_INVALID_TOKEN');
  const db = getDb(c.env);
  const rows = await db
    .select({ permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, user.id))
    .all();
  const allowed = rows.some((r) => {
    try { return JSON.parse(r.permissions)?.[menu]?.[action] === true; } catch { return false; }
  });
  if (!allowed) return fail(c, 'FORBIDDEN');
  return next();
};
