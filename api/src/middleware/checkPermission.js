const User = require('../models/User');
const { fail } = require('../config/errorCodes');

const checkPermission = (menu, action) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('roles');
    if (!user) return fail(res, 'AUTH_INVALID_TOKEN');
    const hasPermission = user.roles.some((role) => role.permissions?.[menu]?.[action] === true);
    if (!hasPermission) return fail(res, 'FORBIDDEN');
    next();
  } catch {
    fail(res, 'SERVER_ERROR');
  }
};

module.exports = checkPermission;
