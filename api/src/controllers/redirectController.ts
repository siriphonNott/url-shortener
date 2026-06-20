import { eq, and, sql } from 'drizzle-orm';
import type { Env } from '../env';
import { getDb } from '../db/client';
import { links, redirectLogs } from '../db/schema';
import { ERRORS } from '../lib/errorCodes';
import { errorPageResponse } from '../lib/errorPage';
import { nowIso } from '../lib/time';

const errJson = (key: 'SERVER_ERROR') => {
  const e = ERRORS[key];
  return Response.json({ success: false, errorCode: e.code, message: e.message }, { status: e.status }); // FLAT, matches fail()
};

export async function handleRedirect(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const code = new URL(request.url).pathname.slice(1);
  const accept = request.headers.get('accept-language');
  const db = getDb(env);
  try {
    const link = await db.select().from(links).where(and(eq(links.code, code), eq(links.isActive, 1))).get();
    // Human-facing branded HTML page (unknown/inactive → 404, expired → 410) instead of a raw JSON envelope.
    if (!link) return errorPageResponse('not-found', accept);
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return errorPageResponse('expired', accept);

    const cf = (request as any).cf || {};
    const log = {
      id: crypto.randomUUID(), linkId: link.id,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer') || null,
      country: cf.country || null, city: cf.city || null,
      createdAt: nowIso(),
    };
    ctx.waitUntil((async () => {
      try {
        await db.batch([
          // SQL-expression increment (not read-modify-write) so concurrent redirects don't lose counts
          db.update(links).set({ clickCount: sql`${links.clickCount} + 1` }).where(eq(links.id, link.id)),
          db.insert(redirectLogs).values(log),
        ]);
      } catch { /* never fail the redirect */ }
    })());

    return new Response(null, { status: 302, headers: { Location: link.destinationUrl } });
  } catch {
    return errJson('SERVER_ERROR');
  }
}
