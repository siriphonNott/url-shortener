const boolOut = (n: number | boolean | null) => n === 1 || n === true;
const json = (s: string | null) => (s ? JSON.parse(s) : {});

export const serializeLink = (r: any) => ({
  _id: r.id,
  code: r.code,
  destinationUrl: r.destinationUrl,
  title: r.title ?? null,
  description: r.description ?? null,
  createdBy: r.createdBy ?? null,
  clickCount: r.clickCount,
  isActive: boolOut(r.isActive),
  expiresAt: r.expiresAt ?? null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export const serializeRole = (r: any, userCount?: number) => ({
  _id: r.id,
  name: r.name,
  description: r.description ?? '',
  permissions: json(r.permissions),
  ...(userCount !== undefined ? { userCount } : {}),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export const serializeLog = (r: any) => ({
  _id: r.id,
  link: r.linkId,
  ip: r.ip ?? null,
  userAgent: r.userAgent ?? null,
  referer: r.referer ?? null,
  country: r.country ?? null,
  city: r.city ?? null,
  createdAt: r.createdAt,
});

export const userPayload = (u: any) => ({ id: u.id, email: u.email, fullName: u.fullName || '' });

export const userPayloadWithRoles = (u: any, roles: any[]) => ({
  ...userPayload(u),
  roles: roles.map((r) => ({ id: r.id, name: r.name, permissions: json(r.permissions) })),
});

export const formatKey = (k: any, user?: any) => ({
  id: k.id,
  keyName: k.keyName,
  keyPrefix: k.keyPrefix,
  scopes: json(k.scopes),
  status: k.status,
  expiresAt: k.expiresAt ?? null,
  lastUsedAt: k.lastUsedAt ?? null,
  createdAt: k.createdAt,
  user: user ? { id: user.id, email: user.email, fullName: user.fullName } : null, // OLD always emits user (null when absent)
});
