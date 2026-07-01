require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bookingsRouter = require('./routes/bookings');
const ticketsRouter = require('./routes/tickets');

const rootDir = path.join(__dirname, '..');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    email: Boolean(
      process.env.RESEND_API_KEY
      || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    ),
  });
});

app.use('/api/bookings', bookingsRouter);
app.use('/api/tickets', ticketsRouter);

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
