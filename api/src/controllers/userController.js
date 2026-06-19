const User = require('../models/User');
const { fail, ok } = require('../config/errorCodes');

const userPayload = (u) => ({
  id: u._id,
  fullName: u.fullName || '',
  email: u.email,
  accountType: u.accountType,
  status: u.status,
  roles: (u.roles || []).map((r) => (typeof r === 'object' && r._id ? { id: r._id, name: r.name } : r)),
  createdAt: u.createdAt,
});

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -apiKey -apiKeyStatus -apiKeyExpiresAt')
      .populate('roles', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return ok(res, {
      data: users.map(userPayload),
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, fullName, accountType, status, roles } = req.body;
    if (!email || !password) return fail(res, 'AUTH_MISSING_FIELDS');
    const user = await User.create({ email, password, fullName, accountType, status, roles: roles || [] });
    return ok(res, { data: userPayload(user) }, 201);
  } catch (err) {
    if (err.code === 11000) return fail(res, 'AUTH_EMAIL_EXISTS');
    return fail(res, 'SERVER_ERROR');
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { fullName, accountType, status, email, roles } = req.body;
    const update = { fullName, accountType, status, email };
    if (roles !== undefined) update.roles = roles;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).populate('roles', 'name');
    if (!user) return fail(res, 'USER_NOT_FOUND');
    return ok(res, { data: userPayload(user) });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return fail(res, 'USER_NOT_FOUND');
    return ok(res, { message: 'User deleted successfully' });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};
