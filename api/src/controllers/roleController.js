const Role = require('../models/Role');
const User = require('../models/User');
const { fail, ok } = require('../config/errorCodes');

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    const userCounts = await User.aggregate([
      { $unwind: '$roles' },
      { $group: { _id: '$roles', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(userCounts.map((r) => [r._id.toString(), r.count]));
    return ok(res, {
      data: roles.map((r) => ({ ...r.toObject(), userCount: countMap[r._id.toString()] || 0 })),
    });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return fail(res, 'ROLE_NAME_EXISTS');
    const role = await Role.create({ name, description, permissions: permissions || {} });
    return ok(res, { data: role }, 201);
  } catch (err) {
    if (err.code === 11000) return fail(res, 'ROLE_NAME_EXISTS');
    return fail(res, 'SERVER_ERROR');
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description, permissions },
      { new: true }
    );
    if (!role) return fail(res, 'ROLE_NOT_FOUND');
    return ok(res, { data: role });
  } catch (err) {
    if (err.code === 11000) return fail(res, 'ROLE_NAME_EXISTS');
    return fail(res, 'SERVER_ERROR');
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return fail(res, 'ROLE_NOT_FOUND');
    await User.updateMany({ roles: req.params.id }, { $pull: { roles: req.params.id } });
    return ok(res, { message: 'Role deleted successfully' });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};
