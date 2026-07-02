const crypto = require('crypto');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getAdminSecret() {
  return String(process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY || '').trim();
}

function createAdminToken() {
  const secret = getAdminSecret();
  if (!secret) return null;
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  const secret = getAdminSecret();
  if (!secret || !token) return false;
  const parts = String(token).split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

function verifyAdminPassword(password) {
  const secret = getAdminSecret();
  const candidate = String(password ?? '').trim();
  if (!secret || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getAdminToken(req) {
  const header = req.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.body?.token || req.query?.token || '';
}

function requireAdmin(req, res, next) {
  if (!getAdminSecret()) {
    res.status(503).json({ error: 'Admin access is not configured' });
    return;
  }
  if (!verifyAdminToken(getAdminToken(req))) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

module.exports = {
  createAdminToken,
  verifyAdminPassword,
  verifyAdminToken,
  getAdminToken,
  requireAdmin,
  getAdminSecret,
};
