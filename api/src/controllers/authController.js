const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const { fail, ok } = require('../config/errorCodes');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const userPayload = (u) => ({ id: u._id, email: u.email, fullName: u.fullName || '' });

const userPayloadWithRoles = (u) => ({
  ...userPayload(u),
  roles: (u.roles || []).map((r) => ({
    id: r._id,
    name: r.name,
    permissions: r.permissions || {},
  })),
});

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const genKey = () => {
  const bytes = crypto.randomBytes(40);
  let rand = '';
  for (let i = 0; i < 40; i++) rand += CHARS[bytes[i] % CHARS.length];
  return `ak_live_${rand}`;
};

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 'AUTH_MISSING_FIELDS');
    const user = await User.create({ email, password });
    const token = signToken(user._id);
    return ok(res, { token, user: userPayload(user) }, 201);
  } catch (err) {
    if (err.code === 11000) return fail(res, 'AUTH_EMAIL_EXISTS');
    return fail(res, 'SERVER_ERROR');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 'AUTH_MISSING_FIELDS');
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return fail(res, 'AUTH_INVALID_CREDENTIALS');
    if (user.status === 'inactive') return fail(res, 'AUTH_ACCOUNT_INACTIVE');
    if (user.status === 'suspended') return fail(res, 'AUTH_ACCOUNT_SUSPENDED');
    if (user.status === 'pending_verification') return fail(res, 'AUTH_ACCOUNT_PENDING');
    const token = signToken(user._id);
    return ok(res, { token, user: userPayload(user) });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('roles', 'name permissions');
    return ok(res, { user: userPayloadWithRoles(user) });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { fullName: fullName?.trim() ?? '' },
      { new: true }
    );
    return ok(res, { user: userPayload(user) });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.getApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    if (!apiKey) return ok(res, { hasKey: false });
    return ok(res, {
      hasKey: true,
      keyId: apiKey._id,
      apiKey: apiKey.apiKey,
      apiKeyStatus: apiKey.status,
      apiKeyExpiresAt: apiKey.expiresAt,
    });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.regenerateApiKey = async (req, res) => {
  try {
    await ApiKey.deleteMany({ userId: req.user.id, isPersonal: true });

    const key = genKey();
    const apiKey = await ApiKey.create({
      userId: req.user.id,
      keyName: 'Personal',
      apiKey: key,
      scopes: { links: 'write', stats: 'read' },
      status: 'active',
      isPersonal: true,
    });

    return ok(res, {
      keyId: apiKey._id,
      apiKey: apiKey.apiKey,
      apiKeyStatus: apiKey.status,
      apiKeyExpiresAt: apiKey.expiresAt,
    });
  } catch (e) {
    console.error('[regenerateApiKey]', e.message);
    return fail(res, 'SERVER_ERROR');
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return fail(res, 'AUTH_MISSING_PW_FIELDS');
    if (newPassword.length < 6) return fail(res, 'AUTH_WEAK_PASSWORD');
    const user = await User.findById(req.user.id);
    if (!(await user.comparePassword(currentPassword))) return fail(res, 'AUTH_WRONG_PASSWORD');
    user.password = newPassword;
    await user.save();
    return ok(res, { message: 'Password updated successfully' });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};
