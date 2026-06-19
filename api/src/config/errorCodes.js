/**
 * Centralised error codes for the Blly.to API.
 * Each entry: { code, message, status }
 */
const ERRORS = {
  // ─── Authentication ────────────────────────────────────────────────────────
  AUTH_MISSING_FIELDS: {
    code: 'AUTH_MISSING_FIELDS',
    message: 'Email and password are required',
    status: 400,
  },
  AUTH_EMAIL_EXISTS: {
    code: 'AUTH_EMAIL_EXISTS',
    message: 'Email already exists',
    status: 400,
  },
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    status: 401,
  },
  AUTH_NO_TOKEN: {
    code: 'AUTH_NO_TOKEN',
    message: 'No token provided',
    status: 401,
  },
  AUTH_INVALID_TOKEN: {
    code: 'AUTH_INVALID_TOKEN',
    message: 'Invalid or expired token',
    status: 401,
  },
  AUTH_INVALID_API_KEY: {
    code: 'AUTH_INVALID_API_KEY',
    message: 'Invalid API key',
    status: 401,
  },
  AUTH_API_KEY_INACTIVE: {
    code: 'AUTH_API_KEY_INACTIVE',
    message: 'API key is inactive',
    status: 401,
  },
  AUTH_API_KEY_EXPIRED: {
    code: 'AUTH_API_KEY_EXPIRED',
    message: 'API key has expired',
    status: 401,
  },
  AUTH_API_KEY_REVOKED: {
    code: 'AUTH_API_KEY_REVOKED',
    message: 'API key has been revoked',
    status: 401,
  },
  AUTH_MISSING_PW_FIELDS: {
    code: 'AUTH_MISSING_PW_FIELDS',
    message: 'currentPassword and newPassword are required',
    status: 400,
  },
  AUTH_WRONG_PASSWORD: {
    code: 'AUTH_WRONG_PASSWORD',
    message: 'Current password is incorrect',
    status: 400,
  },
  AUTH_WEAK_PASSWORD: {
    code: 'AUTH_WEAK_PASSWORD',
    message: 'Password must be at least 6 characters',
    status: 400,
  },

  AUTH_ACCOUNT_INACTIVE: {
    code: 'AUTH_ACCOUNT_INACTIVE',
    message: 'Your account is inactive',
    status: 403,
  },
  AUTH_ACCOUNT_SUSPENDED: {
    code: 'AUTH_ACCOUNT_SUSPENDED',
    message: 'Your account has been suspended',
    status: 403,
  },
  AUTH_ACCOUNT_PENDING: {
    code: 'AUTH_ACCOUNT_PENDING',
    message: 'Your account is pending verification',
    status: 403,
  },

  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action',
    status: 403,
  },

  // ─── User ──────────────────────────────────────────────────────────────────
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    status: 404,
  },

  // ─── Role ──────────────────────────────────────────────────────────────────
  ROLE_NOT_FOUND: {
    code: 'ROLE_NOT_FOUND',
    message: 'Role not found',
    status: 404,
  },
  ROLE_NAME_EXISTS: {
    code: 'ROLE_NAME_EXISTS',
    message: 'Role name already exists',
    status: 400,
  },

  // ─── Link ──────────────────────────────────────────────────────────────────
  LINK_MISSING_URL: {
    code: 'LINK_MISSING_URL',
    message: 'destinationUrl is required',
    status: 400,
  },
  LINK_CODE_EXISTS: {
    code: 'LINK_CODE_EXISTS',
    message: 'Short code already exists',
    status: 400,
  },
  LINK_NOT_FOUND: {
    code: 'LINK_NOT_FOUND',
    message: 'Link not found',
    status: 404,
  },
  LINK_EXPIRED: {
    code: 'LINK_EXPIRED',
    message: 'This link has expired',
    status: 410,
  },

  // ─── Server ────────────────────────────────────────────────────────────────
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    status: 500,
  },
};

/**
 * Send a standardised error response.
 * @param {object} res   - Express response
 * @param {string} key   - Key from ERRORS (e.g. 'LINK_NOT_FOUND')
 */
const fail = (res, key) => {
  const e = ERRORS[key] || ERRORS.SERVER_ERROR;
  return res.status(e.status).json({
    success: false,
    errorCode: e.code,
    message: e.message,
  });
};

/**
 * Send a standardised success response.
 * @param {object} res    - Express response
 * @param {object} data   - Data fields to include in the response body
 * @param {number} status - HTTP status code (default 200)
 */
const ok = (res, data = {}, status = 200) => {
  return res.status(status).json({ success: true, ...data });
};

module.exports = { ERRORS, fail, ok };
