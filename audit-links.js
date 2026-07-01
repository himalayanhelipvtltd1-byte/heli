const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));

const broken = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

for (const hf of htmlFiles) {
  const html = fs.readFileSync(path.join(root, hf), 'utf8');
  const re = /(?:href|src)=["']([^"'#?]+)/g;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (/^(https?:|data:|mailto:|javascript:)/i.test(u)) continue;
    if (u.startsWith('/')) u = u.slice(1);
    const target = path.normalize(path.join(root, u));
    if (!fs.existsSync(target)) {
      broken.push({ page: hf, link: m[1], resolved: path.relative(root, target) });
    }
  }
}

const requiredPages = [
  'index.html',
  'gallery.html',
  'verify.html',
  'booking_summary.html',
  'payment.html',
  'ticket.html',
  'booking_success.html',
  ...['1', '2', '4', '7', '8', '9', '10', '11', '12'].map((id) => `booking_package_id_${id}.html`),
];

for (const p of requiredPages) {
  if (!exists(p)) warnings.push({ type: 'missing-page', page: p });
}

const requiredAssets = [
  'assets/css/style.css',
  'assets/js/app.js',
  'assets/js/mock-flow.js',
  'assets/tickets/ticket-template.pdf',
  'assets/images/cropped-logo01.webp',
  'assets/images/payment-google-pay.svg',
  'assets/images/payment-phonepe.svg',
  'assets/images/payment-bhim-upi.svg',
  'assets/images/payment-paytm.svg',
];

for (const a of requiredAssets) {
  if (!exists(a)) broken.push({ page: '(assets)', link: a, resolved: 'MISSING' });
}

// Package IDs referenced in booking forms
const packageIds = new Set();
for (const hf of htmlFiles.filter((f) => f.startsWith('booking_'))) {
  const html = fs.readFileSync(path.join(root, hf), 'utf8');
  const opts = html.matchAll(/<option value="(\d+)"/g);
  for (const o of opts) {
    if (Number(o[1]) <= 20) packageIds.add(o[1]);
  }
  const hidden = html.match(/name="package_id" value="(\d+)"/);
  if (hidden) packageIds.add(hidden[1]);
}

for (const id of packageIds) {
  const page = `booking_package_id_${id}.html`;
  if (!exists(page)) {
    warnings.push({ type: 'package-switch-target', packageId: id, page });
  }
}

// PACKAGES in mock-flow.js
const mockFlow = fs.readFileSync(path.join(root, 'assets/js/mock-flow.js'), 'utf8');
const mockPkgIds = [...mockFlow.matchAll(/'(\d+)':\s*\{/g)].map((m) => m[1]);
for (const id of mockPkgIds) {
  if (!exists(`booking_package_id_${id}.html`)) {
    warnings.push({ type: 'mock-flow-package', packageId: id, page: `booking_package_id_${id}.html` });
  }
}

console.log('=== LINK AUDIT ===');
console.log('HTML pages:', htmlFiles.length);
console.log('Broken file links:', broken.length);
broken.forEach((b) => console.log('  BROKEN', b.page, '->', b.link));
console.log('Warnings:', warnings.length);
warnings.forEach((w) => console.log('  WARN', JSON.stringify(w)));
console.log('Package IDs in forms:', [...packageIds].sort((a, b) => a - b).join(', '));
process.exit(broken.length ? 1 : 0);
