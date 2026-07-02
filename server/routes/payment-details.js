const express = require('express');
const { supabase } = require('../lib/supabase');
const {
  getPaymentSettingsRow,
  getPublicPaymentSettings,
  downloadPaymentQr,
} = require('../lib/payment-settings');

const router = express.Router();

function requireSupabase(_req, res, next) {
  if (!supabase) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }
  next();
}

router.get('/', requireSupabase, async (_req, res) => {
  try {
    const settings = await getPublicPaymentSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not load payment details' });
  }
});

router.get('/qr', requireSupabase, async (_req, res) => {
  try {
    const row = await getPaymentSettingsRow();
    const blob = await downloadPaymentQr(row);
    if (!blob) {
      res.status(404).json({ error: 'QR image not configured' });
      return;
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    const ext = (row.qr_image_path || '').split('.').pop()?.toLowerCase();
    const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'webp' ? 'image/webp'
        : 'image/png';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not load QR image' });
  }
});

module.exports = router;
