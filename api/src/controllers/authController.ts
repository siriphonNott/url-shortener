import type { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { users, roles, userRoles, apiKeys } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { verifyTurnstile } from '../lib/turnstile';
import { verifyGoogleIdToken } from '../lib/google';
import { hashPassword, verifyPassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { generateKey } from '../lib/keys';
import { userPayload, userPayloadWithRoles } from '../serializers';
import { nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();

export const register = async (c: C) => {
  const { email, password, turnstileToken } = (await c.req.json().catch(() => ({}))) ?? {};
  if (!email || !password) return fail(c, 'AUTH_MISSING_FIELDS');
  if (String(password).length < 6) return fail(c, 'AUTH_WEAK_PASSWORD');
  const ip = c.req.header('CF-Connecting-IP') ?? undefined;
  if (!(await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, ip))) return fail(c, 'AUTH_TURNSTILE_FAILED');
  const db = getDb(c.env);
  const id = uuid(); const now = nowIso();
  try {
    await db.insert(users).values({ id, email: String(email).toLowerCase(), password: await hashPassword(password), fullName: '', accountType: 'free', status: 'active', createdAt: now, updatedAt: now });
  } catch (e: any) {
    if (String(e?.message || e).includes('UNIQUE constraint failed')) return fail(c, 'AUTH_EMAIL_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
  const token = await signToken(id, c.env.JWT_SECRET);
  return ok(c, { token, user: userPayload({ id, email: String(email).toLowerCase(), fullName: '' }) }, 201);
};

export const login = async (c: C) => {
  const { email, password } = (await c.req.json().catch(() => ({}))) ?? {};
  if (!email || !password) return fail(c, 'AUTH_MISSING_FIELDS');
  const db = getDb(c.env);
  const u = await db.select().from(users).where(eq(users.email, String(email).toLowerCase())).get();
  if (!u || !(await verifyPassword(password, u.password))) return fail(c, 'AUTH_INVALID_CREDENTIALS');
  if (u.status === 'inactive') return fail(c, 'AUTH_ACCOUNT_INACTIVE');
  if (u.status === 'suspended') return fail(c, 'AUTH_ACCOUNT_SUSPENDED');
  if (u.status === 'pending_verification') return fail(c, 'AUTH_ACCOUNT_PENDING');
  const token = await signToken(u.id, c.env.JWT_SECRET);
  return ok(c, { token, user: userPayload(u) });
};

export const me = async (c: C) => {
  const db = getDb(c.env);
  const u = await db.select().from(users).where(eq(users.id, c.get('user').id)).get();
  if (!u) return fail(c, 'SERVER_ERROR');
  const rs = await db.select({ id: roles.id, name: roles.name, permissions: roles.permissions })
    .from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(eq(userRoles.userId, u.id)).all();
  return ok(c, { user: userPayloadWithRoles(u, rs) });
};

export const updateProfile = async (c: C) => {
  const { fullName } = (await c.req.json().catch(() => ({}))) ?? {};
  const db = getDb(c.env);
  const id = c.get('user').id;
  await db.update(users).set({ fullName: (fullName ?? '').trim(), updatedAt: nowIso() }).where(eq(users.id, id));
  const u = await db.select().from(users).where(eq(users.id, id)).get();
  return ok(c, { user: userPayload(u) });
};

export const changePassword = async (c: C) => {
  const { currentPassword, newPassword } = (await c.req.json().catch(() => ({}))) ?? {};
  if (!currentPassword || !newPassword) return fail(c, 'AUTH_MISSING_PW_FIELDS');
  if (newPassword.length < 6) return fail(c, 'AUTH_WEAK_PASSWORD');
  const db = getDb(c.env);
  const id = c.get('user').id;
  const u = await db.select().from(users).where(eq(users.id, id)).get();
  if (!u || !(await verifyPassword(currentPassword, u.password))) return fail(c, 'AUTH_WRONG_PASSWORD');
  await db.update(users).set({ password: await hashPassword(newPassword), updatedAt: nowIso() }).where(eq(users.id, id));
  return ok(c, { message: 'Password updated successfully' });
};

export const getApiKey = async (c: C) => {
  const db = getDb(c.env);
  const k = await db.select().from(apiKeys).where(eq(apiKeys.userId, c.get('user').id)).orderBy(desc(apiKeys.createdAt)).get();
  if (!k) return ok(c, { hasKey: false });
  return ok(c, { hasKey: true, keyId: k.id, keyPrefix: k.keyPrefix, apiKeyStatus: k.status, apiKeyExpiresAt: k.expiresAt });
};

export const regenerateApiKey = async (c: C) => {
  const db = getDb(c.env);
  const userId = c.get('user').id;
  await db.delete(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.isPersonal, 1)));
  const { fullKey, keyHash, keyPrefix } = await generateKey();
  const id = uuid(); const now = nowIso();
  await db.insert(apiKeys).values({ id, userId, keyName: 'Personal', keyHash, keyPrefix, scopes: JSON.stringify({ links: 'write', stats: 'read' }), status: 'active', isPersonal: 1, expiresAt: null, lastUsedAt: null, createdAt: now, updatedAt: now });
  return ok(c, { keyId: id, apiKey: fullKey, keyPrefix, apiKeyStatus: 'active', apiKeyExpiresAt: null });
};

export const googleSignin = async (c: C) => {
  const { idToken } = (await c.req.json().catch(() => ({}))) ?? {};
  if (!idToken) return fail(c, 'AUTH_GOOGLE_INVALID');
  let claims;
  try {
    claims = await verifyGoogleIdToken(idToken, c.env.GOOGLE_CLIENT_ID);
  } catch {
    return fail(c, 'AUTH_GOOGLE_INVALID');
  }
  const db = getDb(c.env);
  let created = false;

  // 1) Existing Google account (matched by sub).
  let u = await db.select().from(users).where(eq(users.googleSub, claims.sub)).get();

  // 2) Otherwise link onto an existing password account with the same email.
  if (!u) {
    const byEmail = await db.select().from(users).where(eq(users.email, claims.email)).get();
    if (byEmail) {
      await db.update(users)
        .set({ googleSub: claims.sub, fullName: byEmail.fullName || claims.name, updatedAt: nowIso() })
        .where(eq(users.id, byEmail.id));
      u = await db.select().from(users).where(eq(users.id, byEmail.id)).get();
    }
  }

  // 3) Otherwise create a new Google-only account (empty-string password sentinel).
  if (!u) {
    const id = uuid(); const now = nowIso();
    await db.insert(users).values({ id, email: claims.email, password: '', fullName: claims.name || '', accountType: 'free', status: 'active', googleSub: claims.sub, createdAt: now, updatedAt: now });
    u = await db.select().from(users).where(eq(users.id, id)).get();
    created = true;
  }

  if (!u) return fail(c, 'SERVER_ERROR');
  if (u.status === 'inactive') return fail(c, 'AUTH_ACCOUNT_INACTIVE');
  if (u.status === 'suspended') return fail(c, 'AUTH_ACCOUNT_SUSPENDED');
  if (u.status === 'pending_verification') return fail(c, 'AUTH_ACCOUNT_PENDING');

  const token = await signToken(u.id, c.env.JWT_SECRET);
  return ok(c, { token, user: userPayload(u) }, created ? 201 : 200);
};
