const jwt = require('jsonwebtoken');
const ApiKey = require('../models/ApiKey');
const { fail } = require('../config/errorCodes');

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  if (apiKeyHeader) {
    const apiKey = await ApiKey.findOne({ apiKey: apiKeyHeader }).populate('userId', '_id email fullName');
    if (!apiKey) return fail(res, 'AUTH_INVALID_API_KEY');

    if (apiKey.status === 'revoked') return fail(res, 'AUTH_API_KEY_REVOKED');
    if (apiKey.status === 'inactive') return fail(res, 'AUTH_API_KEY_INACTIVE');

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      await ApiKey.findByIdAndUpdate(apiKey._id, { status: 'expired' });
      return fail(res, 'AUTH_API_KEY_EXPIRED');
    }
    if (apiKey.status === 'expired') return fail(res, 'AUTH_API_KEY_EXPIRED');

    ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).exec();

    const user = apiKey.userId;
    req.user = { id: user._id, email: user.email, fullName: user.fullName };
    req.apiKey = apiKey;
    return next();
  }

  const token = authHeader?.split(' ')[1];
  if (!token) return fail(res, 'AUTH_NO_TOKEN');

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    fail(res, 'AUTH_INVALID_TOKEN');
  }
};

module.exports = auth;
