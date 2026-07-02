function getAppUrl() {
  return String(process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function appUrl(path = '') {
  const base = getAppUrl();
  if (!path) return base;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

module.exports = { getAppUrl, appUrl };
