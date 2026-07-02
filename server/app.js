require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bookingsRouter = require('./routes/bookings');
const ticketsRouter = require('./routes/tickets');
const paymentDetailsRouter = require('./routes/payment-details');
const adminRouter = require('./routes/admin');
const { getAppUrl } = require('./lib/app-url');

const rootDir = path.join(__dirname, '..');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    appUrl: getAppUrl(),
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    email: Boolean(
      process.env.RESEND_API_KEY
      || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    ),
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    appUrl: getAppUrl(),
  });
});

app.use('/api/bookings', bookingsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/payment-details', paymentDetailsRouter);
app.use('/api/admin', adminRouter);

// /booking_summary → booking_summary.html
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path === '/' || path.extname(req.path)) return next();
  const htmlFile = path.join(rootDir, `${req.path.slice(1)}.html`);
  if (fs.existsSync(htmlFile)) {
    res.sendFile(htmlFile);
    return;
  }
  next();
});

app.use(express.static(rootDir, { extensions: ['html'] }));

app.use((_req, res) => {
  res.status(404).send('Not found');
});

module.exports = app;
