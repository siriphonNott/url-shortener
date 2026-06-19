const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const Link = require('../models/Link');
const RedirectLog = require('../models/RedirectLog');
const { ok, fail } = require('../config/errorCodes');

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const genKey = () => {
  const bytes = crypto.randomBytes(40);
  let rand = '';
  for (let i = 0; i < 40; i++) rand += CHARS[bytes[i] % CHARS.length];
  return `ak_live_${rand}`;
};

const formatKey = (k) => ({
  id: k._id,
  keyName: k.keyName,
  apiKey: k.apiKey,
  scopes: k.scopes,
  status: k.status,
  expiresAt: k.expiresAt,
  lastUsedAt: k.lastUsedAt,
  createdAt: k.createdAt,
  user: k.userId ? { id: k.userId._id, email: k.userId.email, fullName: k.userId.fullName } : null,
});

exports.listKeys = async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { keyName: { $regex: search, $options: 'i' } },
        { apiKey: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [keys, total] = await Promise.all([
      ApiKey.find(filter).populate('userId', 'email fullName').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      ApiKey.countDocuments(filter),
    ]);

    return ok(res, {
      keys: keys.map(formatKey),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (e) {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.createKey = async (req, res) => {
  try {
    const { keyName, userId, scopes, expiresAt } = req.body;
    if (!keyName) return res.status(400).json({ success: false, message: 'keyName is required' });

    const targetUserId = userId || req.user.id;
    const user = await User.findById(targetUserId);
    if (!user) return fail(res, 'USER_NOT_FOUND');

    const key = genKey();
    const apiKey = await ApiKey.create({
      userId: targetUserId,
      keyName,
      apiKey: key,
      scopes: scopes || { links: 'read', stats: 'read' },
      status: 'active',
      expiresAt: expiresAt || null,
    });

    await apiKey.populate('userId', 'email fullName');

    return ok(res, { key: formatKey(apiKey) }, 201);
  } catch (e) {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.updateKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { keyName, scopes, status, expiresAt } = req.body;

    const apiKey = await ApiKey.findById(id).populate('userId', 'email fullName');
    if (!apiKey) return res.status(404).json({ success: false, message: 'API Key not found' });

    if (keyName !== undefined) apiKey.keyName = keyName;
    if (scopes !== undefined) apiKey.scopes = scopes;
    if (status !== undefined) apiKey.status = status;
    if (expiresAt !== undefined) apiKey.expiresAt = expiresAt || null;

    await apiKey.save();
    return ok(res, formatKey(apiKey));
  } catch (e) {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.deleteKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findByIdAndDelete(req.params.id);
    if (!apiKey) return res.status(404).json({ success: false, message: 'API Key not found' });
    return ok(res, {});
  } catch (e) {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.getKeyStats = async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id).populate('userId', 'email fullName');
    if (!apiKey) return res.status(404).json({ success: false, message: 'API Key not found' });

    const userId = apiKey.userId._id;
    const links = await Link.find({ createdBy: userId });
    const linkIds = links.map((l) => l._id);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const logs = await RedirectLog.find({
      link: { $in: linkIds },
      createdAt: { $gte: sevenDaysAgo },
    }).sort({ createdAt: -1 }).limit(1000);

    const totalLinks = links.length;
    const activeLinks = links.filter(
      (l) => l.isActive && (!l.expiresAt || new Date(l.expiresAt) > now)
    ).length;
    const totalClicks = links.reduce((s, l) => s + l.clickCount, 0);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const timeline = days.map((date) => {
      const dayLogs = logs.filter((l) => l.createdAt.toISOString().split('T')[0] === date);
      const dayLinks = links.filter((l) => l.createdAt.toISOString().split('T')[0] === date);
      return { date, clicks: dayLogs.length, linksCreated: dayLinks.length };
    });

    const deviceMap = {};
    logs.forEach((log) => {
      const ua = (log.userAgent || '').toLowerCase();
      let device = 'Unknown';
      if (/mobile|android|iphone|ipad/.test(ua)) device = 'Mobile';
      else if (/windows|mac|linux/.test(ua)) device = 'Desktop';
      deviceMap[device] = (deviceMap[device] || 0) + 1;
    });
    const devices = Object.entries(deviceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return ok(res, {
      key: formatKey(apiKey),
      stats: { totalLinks, activeLinks, totalClicks },
      timeline,
      devices,
    });
  } catch (e) {
    return fail(res, 'SERVER_ERROR');
  }
};
