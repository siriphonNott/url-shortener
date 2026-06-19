const https = require('https');
const http = require('http');
const { nanoid } = require('nanoid');
const Link = require('../models/Link');
const RedirectLog = require('../models/RedirectLog');
const { fail, ok } = require('../config/errorCodes');

let geoip;
try { geoip = require('geoip-lite'); } catch (e) { geoip = null; }

const BASE_SHORT_URL = (process.env.BASE_SHORT_URL || 'http://localhost:3000').replace(/\/$/, '');

exports.getLinks = async (req, res) => {
  try {
    const links = await Link.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    return ok(res, { data: links });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.createLink = async (req, res) => {
  try {
    const { destinationUrl, code, expiresAt } = req.body;
    let { title, description } = req.body;
    if (!destinationUrl) return fail(res, 'LINK_MISSING_URL');
    if (!title?.trim() || !description?.trim()) {
      const meta = await fetchPageMeta(destinationUrl);
      if (!title?.trim()) title = meta.title;
      if (!description?.trim()) description = meta.description;
    }
    const shortCode = code?.trim() || nanoid(7);
    const link = await Link.create({
      code: shortCode,
      destinationUrl,
      title,
      description,
      expiresAt: expiresAt || null,
      createdBy: req.user.id,
    });
    return ok(res, {
      code: link.code,
      destinationUrl: link.destinationUrl,
      shortUrl: `${BASE_SHORT_URL}/${link.code}`,
      ...(link.title ? { title: link.title } : {}),
      ...(link.description ? { description: link.description } : {}),
    }, 201);
  } catch (err) {
    if (err.code === 11000) return fail(res, 'LINK_CODE_EXISTS');
    return fail(res, 'SERVER_ERROR');
  }
};

exports.updateLink = async (req, res) => {
  try {
    const { title, description, destinationUrl, code, isActive, expiresAt } = req.body;
    const update = { title, description, destinationUrl, isActive, expiresAt: expiresAt || null };
    if (code?.trim()) update.code = code.trim();
    const link = await Link.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!link) return fail(res, 'LINK_NOT_FOUND');
    return ok(res, { data: link });
  } catch (err) {
    if (err.code === 11000) return fail(res, 'LINK_CODE_EXISTS');
    return fail(res, 'SERVER_ERROR');
  }
};

exports.deleteLink = async (req, res) => {
  try {
    const ref = req.params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(ref);
    const link = isObjectId
      ? await Link.findByIdAndDelete(ref)
      : await Link.findOneAndDelete({ code: ref, createdBy: req.user.id });
    if (!link) return fail(res, 'LINK_NOT_FOUND');
    await RedirectLog.deleteMany({ link: link._id });
    return ok(res, { message: 'Link deleted successfully' });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.deleteLinkByCode = async (req, res) => {
  try {
    const link = await Link.findOneAndDelete({ code: req.params.code, createdBy: req.user.id });
    if (!link) return fail(res, 'LINK_NOT_FOUND');
    await RedirectLog.deleteMany({ link: link._id });
    return ok(res, { message: 'Link deleted successfully' });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.getLinkByCode = async (req, res) => {
  try {
    const link = await Link.findOne({ code: req.params.code, createdBy: req.user.id });
    if (!link) return fail(res, 'LINK_NOT_FOUND');
    return ok(res, { data: link });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.getLogs = async (req, res) => {
  try {
    const logs = await RedirectLog.find({ link: req.params.id })
      .sort({ createdAt: -1 })
      .limit(200);
    return ok(res, { data: logs });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const links = await Link.find({ createdBy: req.user.id });
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
      return { date, clicks: dayLogs.length, qrScans: 0, linksCreated: dayLinks.length };
    });

    const deviceMap = {};
    logs.forEach((log) => {
      const device = parseDevice(log.userAgent);
      deviceMap[device] = (deviceMap[device] || 0) + 1;
    });
    const devices = Object.entries(deviceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const direct = logs.filter((l) => !l.referer).length;
    const referral = logs.filter((l) => !!l.referer).length;

    const countryMap = {};
    const cityMap = {};
    if (geoip) {
      logs.forEach((log) => {
        if (log.ip) {
          const geo = geoip.lookup(log.ip);
          if (geo && geo.country) {
            const cName = COUNTRY_NAMES[geo.country] || geo.country;
            countryMap[cName] = (countryMap[cName] || 0) + 1;
            if (geo.city) cityMap[geo.city] = (cityMap[geo.city] || 0) + 1;
          }
        }
      });
    }

    const total = Math.max(logs.length, 1);
    const countries = Object.entries(countryMap)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
    const cities = Object.entries(cityMap)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    return ok(res, {
      stats: { totalLinks, activeLinks, totalClicks, qrScans: 0 },
      timeline,
      devices,
      trafficType: { direct, qr: 0, referral },
      locations: { countries, cities },
      lastUpdated: now.toISOString(),
    });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

exports.getLinkAnalytics = async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) return fail(res, 'LINK_NOT_FOUND');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const logs = await RedirectLog.find({ link: req.params.id, createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: -1 }).limit(1000);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const timeline = days.map((date) => ({
      date,
      clicks: logs.filter((l) => l.createdAt.toISOString().split('T')[0] === date).length,
    }));

    const deviceMap = {};
    logs.forEach((log) => {
      const device = parseDevice(log.userAgent);
      deviceMap[device] = (deviceMap[device] || 0) + 1;
    });
    const devices = Object.entries(deviceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    const direct = logs.filter((l) => !l.referer).length;
    const referral = logs.filter((l) => !!l.referer).length;

    const countryMap = {};
    const cityMap = {};
    if (geoip) {
      logs.forEach((log) => {
        if (log.ip) {
          const geo = geoip.lookup(log.ip);
          if (geo?.country) {
            const cName = COUNTRY_NAMES[geo.country] || geo.country;
            countryMap[cName] = (countryMap[cName] || 0) + 1;
            if (geo.city) cityMap[geo.city] = (cityMap[geo.city] || 0) + 1;
          }
        }
      });
    }
    const total = Math.max(logs.length, 1);
    const countries = Object.entries(countryMap)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
    const cities = Object.entries(cityMap)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    return ok(res, {
      link: { code: link.code, title: link.title, totalClicks: link.clickCount, createdAt: link.createdAt },
      timeline,
      devices,
      trafficType: { direct, qr: 0, referral },
      locations: { countries, cities },
    });
  } catch {
    return fail(res, 'SERVER_ERROR');
  }
};

function parseDevice(userAgent = '') {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('iphone')) os = 'iOS';
  else if (ua.includes('ipad')) os = 'iPadOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('mac os x') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  let browser = 'Unknown';
  if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('firefox') || ua.includes('fxios')) browser = 'Firefox';
  else if (ua.includes('chrome') || ua.includes('crios')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';

  return `${browser} / ${os}`;
}

const COUNTRY_NAMES = {
  US: 'USA', TH: 'Thailand', GB: 'United Kingdom', JP: 'Japan', CN: 'China',
  IN: 'India', DE: 'Germany', FR: 'France', AU: 'Australia', CA: 'Canada',
  SG: 'Singapore', KR: 'South Korea', BR: 'Brazil', MX: 'Mexico', ID: 'Indonesia',
  VN: 'Vietnam', MY: 'Malaysia', PH: 'Philippines', NL: 'Netherlands', IT: 'Italy',
  ES: 'Spain', RU: 'Russia', PL: 'Poland', SE: 'Sweden', NO: 'Norway',
  DK: 'Denmark', FI: 'Finland', CH: 'Switzerland', AT: 'Austria', BE: 'Belgium',
};

exports.fetchMeta = async (req, res) => {
  const { url } = req.query;
  if (!url) return ok(res, { title: '', description: '' });
  try { new URL(url); } catch { return ok(res, { title: '', description: '' }); }
  const meta = await fetchPageMeta(url);
  return ok(res, meta);
};

function fetchPageMeta(url, maxRedirects = 5) {
  return new Promise((resolve) => {
    const empty = { title: '', description: '' };
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const proto = isHttps ? https : http;
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: (parsed.pathname || '/') + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 8000,
        rejectUnauthorized: false,
      };
      const req = proto.request(options, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && maxRedirects > 0) {
          try { fetchPageMeta(new URL(response.headers.location, url).href, maxRedirects - 1).then(resolve); }
          catch { resolve(empty); }
          return;
        }
        let html = '';
        response.on('data', (chunk) => { html += chunk.toString(); if (html.length > 100000) req.destroy(); });
        response.on('end', () => {
          const extract = (patterns) => {
            for (const re of patterns) {
              const m = html.match(re);
              if (m?.[1]?.trim()) return decodeHtmlEntities(m[1].trim().replace(/\s+/g, ' '));
            }
            return '';
          };
          resolve({
            title: extract([
              /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
              /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
              /<title[^>]*>([^<]+)<\/title>/i,
            ]),
            description: extract([
              /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
              /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
              /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
              /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
            ]),
          });
        });
        response.on('error', () => resolve(empty));
      });
      req.on('error', () => resolve(empty));
      req.on('timeout', () => { req.destroy(); resolve(empty); });
      req.end();
    } catch { resolve(empty); }
  });
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)));
}
