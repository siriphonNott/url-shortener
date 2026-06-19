const Link = require('../models/Link');
const RedirectLog = require('../models/RedirectLog');
const { fail } = require('../config/errorCodes');

exports.redirect = async (req, res) => {
  try {
    const link = await Link.findOne({ code: req.params.code, isActive: true });
    if (!link) return fail(res, 'LINK_NOT_FOUND');
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return fail(res, 'LINK_EXPIRED');
    }

    await Link.findByIdAndUpdate(link._id, { $inc: { clickCount: 1 } });
    await RedirectLog.create({
      link: link._id,
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer || null,
    });

    res.redirect(link.destinationUrl);
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};
