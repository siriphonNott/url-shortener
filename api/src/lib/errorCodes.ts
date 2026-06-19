import type { Context } from 'hono';

// Verbatim from OLD api/src/config/errorCodes.js (all 24 entries).
export const ERRORS = {
  AUTH_MISSING_FIELDS: { code: 'AUTH_MISSING_FIELDS', message: 'Email and password are required', status: 400 },
  AUTH_EMAIL_EXISTS: { code: 'AUTH_EMAIL_EXISTS', message: 'Email already exists', status: 400 },
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password', status: 401 },
  AUTH_NO_TOKEN: { code: 'AUTH_NO_TOKEN', message: 'No token provided', status: 401 },
  AUTH_INVALID_TOKEN: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid or expired token', status: 401 },
  AUTH_INVALID_API_KEY: { code: 'AUTH_INVALID_API_KEY', message: 'Invalid API key', status: 401 },
  AUTH_API_KEY_INACTIVE: { code: 'AUTH_API_KEY_INACTIVE', message: 'API key is inactive', status: 401 },
  AUTH_API_KEY_EXPIRED: { code: 'AUTH_API_KEY_EXPIRED', message: 'API key has expired', status: 401 },
  AUTH_API_KEY_REVOKED: { code: 'AUTH_API_KEY_REVOKED', message: 'API key has been revoked', status: 401 },
  AUTH_MISSING_PW_FIELDS: { code: 'AUTH_MISSING_PW_FIELDS', message: 'currentPassword and newPassword are required', status: 400 },
  AUTH_WRONG_PASSWORD: { code: 'AUTH_WRONG_PASSWORD', message: 'Current password is incorrect', status: 400 },
  AUTH_WEAK_PASSWORD: { code: 'AUTH_WEAK_PASSWORD', message: 'Password must be at least 6 characters', status: 400 },
  AUTH_ACCOUNT_INACTIVE: { code: 'AUTH_ACCOUNT_INACTIVE', message: 'Your account is inactive', status: 403 },
  AUTH_ACCOUNT_SUSPENDED: { code: 'AUTH_ACCOUNT_SUSPENDED', message: 'Your account has been suspended', status: 403 },
  AUTH_ACCOUNT_PENDING: { code: 'AUTH_ACCOUNT_PENDING', message: 'Your account is pending verification', status: 403 },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action', status: 403 },
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 },
  ROLE_NOT_FOUND: { code: 'ROLE_NOT_FOUND', message: 'Role not found', status: 404 },
  ROLE_NAME_EXISTS: { code: 'ROLE_NAME_EXISTS', message: 'Role name already exists', status: 400 },
  LINK_MISSING_URL: { code: 'LINK_MISSING_URL', message: 'destinationUrl is required', status: 400 },
  LINK_CODE_EXISTS: { code: 'LINK_CODE_EXISTS', message: 'Short code already exists', status: 400 },
  LINK_NOT_FOUND: { code: 'LINK_NOT_FOUND', message: 'Link not found', status: 404 },
  LINK_EXPIRED: { code: 'LINK_EXPIRED', message: 'This link has expired', status: 410 },
  SERVER_ERROR: { code: 'SERVER_ERROR', message: 'Internal server error', status: 500 },
} as const satisfies Record<string, { code: string; message: string; status: number }>;

export type ErrorKey = keyof typeof ERRORS;

export const ok = (c: Context, data: Record<string, unknown> = {}, status = 200) =>
  c.json({ success: true, ...data }, status as any);

// FLAT body, byte-identical to OLD fail(): { success:false, errorCode, message }
export const fail = (c: Context, key: ErrorKey) => {
  const e = ERRORS[key] || ERRORS.SERVER_ERROR;
  return c.json({ success: false, errorCode: e.code, message: e.message }, e.status as any);
};
