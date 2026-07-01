const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE = 'https://irctc-heliservice.com';
const OUT = __dirname;

const PAGES = [
  '/index.php',
  '/gallery.php',
  '/verify.php',
  '/booking.php?package_id=1',
  '/booking.php?package_id=2',
  '/booking.php?package_id=8',
  '/booking.php?package_id=10',
  '/booking.php?package_id=12',
  '/booking.php?package_id=4',
  '/booking.php?package_id=3',
  '/booking.php?package_id=7',
  '/booking.php?package_id=9',
  '/booking.php?package_id=11',
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetch(next).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ body: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function localPath(urlPath) {
  const clean = urlPath.split('?')[0].replace(/^\//, '');
  if (!clean || clean.endsWith('/')) return path.join(OUT, clean, 'index.html');
  return path.join(OUT, clean);
}

function extractAssets(html) {
  const assets = new Set();
  const patterns = [
    /(?:href|src)=["'](\/[^"']+)["']/g,
    /url\(["']?(\/[^"')]+)["']?\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) assets.add(m[1].split('?')[0]);
  }
  return [...assets];
}

function rewriteHtml(html) {
  return html
    .replace(/href="\/([^"]+)"/g, 'href="$1"')
    .replace(/src="\/([^"]+)"/g, 'src="$1"')
    .replace(/url\(\/([^)]+)\)/g, 'url($1)');
}

async function downloadAsset(assetPath) {
  const url = BASE + assetPath;
  const dest = localPath(assetPath);
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const { body } = await fetch(url);
    fs.writeFileSync(dest, body);
    console.log('  asset:', assetPath);
  } catch (e) {
    console.warn('  FAIL asset:', assetPath, e.message);
  }
}

async function downloadPage(pagePath) {
  const url = BASE + pagePath;
  const query = pagePath.includes('?') ? '?' + pagePath.split('?')[1] : '';
  const filePart = pagePath.split('?')[0].replace(/^\//, '');
  const dest = path.join(OUT, filePart.replace('.php', query ? filePart.split('/').pop().replace('.php', '') + query.replace(/[?&=]/g, '_') + '.html' : '.html'));
  // simpler naming: booking.php?package_id=1 -> booking_package_id_1.html
  let destFile;
  if (pagePath.includes('booking.php')) {
    const id = new URL(url).searchParams.get('package_id');
    destFile = path.join(OUT, `booking_package_id_${id}.html`);
  } else {
    destFile = path.join(OUT, filePart.replace('.php', '.html'));
  }

  console.log('page:', pagePath);
  try {
    const { body } = await fetch(url);
    let html = body.toString('utf8');
    const assets = extractAssets(html);
    for (const a of assets) await downloadAsset(a);
    html = rewriteHtml(html)
      .replace(/href="index\.php"/g, 'href="index.html"')
      .replace(/href="gallery\.php"/g, 'href="gallery.html"')
      .replace(/href="verify\.php"/g, 'href="verify.html"')
      .replace(/href="booking\.php\?package_id=(\d+)"/g, 'href="booking_package_id_$1.html"');
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.writeFileSync(destFile, html);
    console.log('  saved:', path.basename(destFile));
    return html;
  } catch (e) {
    console.warn('  FAIL page:', pagePath, e.message);
    return '';
  }
}

(async () => {
  console.log('Mirroring', BASE, '->', OUT);
  const allAssets = new Set();
  for (const page of PAGES) {
    const url = BASE + page;
    try {
      const { body } = await fetch(url);
      const html = body.toString('utf8');
      extractAssets(html).forEach((a) => allAssets.add(a));
    } catch (_) {}
  }
  // also grab from index.html already saved
  if (fs.existsSync(path.join(OUT, 'index.html'))) {
    extractAssets(fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')).forEach((a) => allAssets.add(a));
  }
  console.log('Downloading', allAssets.size, 'assets...');
  for (const a of allAssets) await downloadAsset(a);
  for (const page of PAGES) await downloadPage(page);
  // rename index
  const idxPhp = path.join(OUT, 'index.html');
  if (fs.existsSync(idxPhp)) {
    let html = fs.readFileSync(idxPhp, 'utf8');
    html = rewriteHtml(html)
      .replace(/href="index\.php"/g, 'href="index.html"')
      .replace(/href="gallery\.php"/g, 'href="gallery.html"')
      .replace(/href="verify\.php"/g, 'href="verify.html"')
      .replace(/href="booking\.php\?package_id=(\d+)"/g, 'href="booking_package_id_$1.html"');
    fs.writeFileSync(idxPhp, html);
  }
  console.log('Done.');
})();
