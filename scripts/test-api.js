/**
 * Integration test: Supabase booking flow (no Gmail required for DB tests)
 * Run: node scripts/test-api.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');

const BASE = process.env.APP_URL || 'http://localhost:3000';

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { res, data };
}

async function main() {
  console.log('=== Trans Bharat Aviation API / Supabase Test ===\n');
  console.log(`Base URL: ${BASE}\n`);

  // 1. Health
  try {
    const { res, data } = await jsonFetch(`${BASE}/api/health`);
    if (!res.ok) throw new Error(data.error || res.status);
    pass('Health check', `supabase=${data.supabase}, email=${data.email}`);
    if (!data.supabase) fail('Supabase configured', 'SUPABASE_URL or SERVICE_ROLE_KEY missing');
    else pass('Supabase env vars present');
  } catch (e) {
    fail('Health check', e.message);
    console.log('\nIs the server running? npm start');
    process.exit(1);
  }

  // 2. Create booking (Guptkashi one-way, no return date)
  let bookingId;
  let token;
  try {
    const body = {
      packageId: '9',
      departureDate: '2026-08-10',
      timeSlot: '06:00 AM - 09:00 AM',
      email: 'supabase-test@example.com',
      mobile: '9876543210',
      passengerCount: 1,
      passengers: [{
        name: 'Supabase Test',
        gender: 'Male',
        age: '28',
        aadhaar: '123456789012',
        registration: 'YATRA-TEST-01',
      }],
    };
    const { res, data } = await jsonFetch(`${BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    bookingId = data.bookingId || data.draft?.bookingId;
    token = data.token || data.draft?.token;
    if (!bookingId || !token) throw new Error('Missing bookingId or token in response');
    pass('Create booking', `ID ${bookingId}`);
  } catch (e) {
    fail('Create booking', e.message);
    if (e.message.includes('relation') || e.message.includes('bookings')) {
      console.error('  → Run supabase/schema.sql in Supabase SQL Editor');
    }
    printSummary();
    process.exit(1);
  }

  // 3. Get booking with token
  try {
    const { res, data } = await jsonFetch(
      `${BASE}/api/bookings/${bookingId}?token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) throw new Error(data.error || res.status);
    if (data.draft?.packageId !== '9') throw new Error('Wrong package in draft');
    pass('Fetch booking by token', data.draft.packageName);
  } catch (e) {
    fail('Fetch booking by token', e.message);
  }

  // 4. Verify before confirm (should fail)
  try {
    const { res } = await jsonFetch(`${BASE}/api/bookings/verify/${bookingId}`);
    if (res.status === 404) pass('Verify pending booking returns 404 (expected)');
    else fail('Verify pending booking', `expected 404, got ${res.status}`);
  } catch (e) {
    fail('Verify pending booking', e.message);
  }

  // 5. Confirm with screenshot upload (PDF is an allowed MIME type)
  const testFile = path.join(__dirname, '..', 'assets', 'tickets', 'ticket-template.pdf');
  if (!fs.existsSync(testFile)) {
    fail('Confirm booking', 'ticket-template.pdf missing for upload test');
  } else {
    try {
      const FormData = require('form-data');
      const http = require('http');
      const form = new FormData();
      form.append('payment_utr', '123456789012');
      form.append('payment_screenshot', fs.createReadStream(testFile), {
        filename: 'payment-proof.pdf',
        contentType: 'application/pdf',
      });

      const confirmUrl = new URL(`${BASE}/api/bookings/${bookingId}/confirm`);
      const data = await new Promise((resolve, reject) => {
        form.submit(
          {
            protocol: confirmUrl.protocol,
            host: confirmUrl.hostname,
            port: confirmUrl.port || (confirmUrl.protocol === 'https:' ? 443 : 80),
            path: confirmUrl.pathname,
            headers: { Authorization: `Bearer ${token}` },
          },
          (err, res) => {
            if (err) return reject(err);
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
              let parsed = {};
              try { parsed = JSON.parse(body); } catch { /* ignore */ }
              if (res.statusCode >= 400) {
                reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
              } else {
                resolve(parsed);
              }
            });
          },
        );
      });

      if (data.draft?.confirmed) pass('Confirm booking', 'status=confirmed');
      else fail('Confirm booking', 'draft not confirmed');

      if (data.emailSent) {
        pass('Confirmation email sent');
      } else {
        pass('Email skipped (Gmail not configured yet)', data.emailError?.split('\n')[0] || 'ok');
      }
    } catch (e) {
      fail('Confirm booking', e.message);
      if (e.message.includes('Bucket') || e.message.includes('storage')) {
        console.error('  → Create bucket "payment-screenshots" in Supabase Storage');
      }
    }
  }

  // 6. Verify after confirm
  try {
    const { res, data } = await jsonFetch(`${BASE}/api/bookings/verify/${bookingId}`);
    if (!res.ok) throw new Error(data.error || res.status);
    if (data.draft?.confirmed) pass('Verify confirmed booking', data.draft.packageName);
    else fail('Verify confirmed booking', 'not confirmed');
  } catch (e) {
    fail('Verify confirmed booking', e.message);
  }

  // 7. Ticket PDF
  try {
    const res = await fetch(
      `${BASE}/api/bookings/${bookingId}/ticket.pdf?token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) throw new Error('PDF too small');
    pass('Ticket PDF download (dynamic)', `${Math.round(buf.length / 1024)} KB`);
  } catch (e) {
    fail('Ticket PDF download', e.message);
  }

  // 8. Static pages
  for (const page of ['/booking_summary.html', '/booking_summary', '/api/health']) {
    try {
      const res = await fetch(`${BASE}${page}`);
      if (res.ok) pass(`Page ${page}`, `HTTP ${res.status}`);
      else fail(`Page ${page}`, `HTTP ${res.status}`);
    } catch (e) {
      fail(`Page ${page}`, e.message);
    }
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${ok} passed, ${bad} failed ===`);
  if (bad) {
    console.log('\nFailed:');
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
