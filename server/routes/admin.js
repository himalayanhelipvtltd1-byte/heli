const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase, SCREENSHOT_BUCKET } = require('../lib/supabase');
const {
  createAdminToken,
  verifyAdminPassword,
  requireAdmin,
  getAdminSecret,
} = require('../lib/admin-auth');
const {
  getPaymentSettingsRow,
  toPublicSettings,
  updatePaymentSettings,
  uploadPaymentQr,
} = require('../lib/payment-settings');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

function requireSupabase(_req, res, next) {
  if (!supabase) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }
  next();
}

function bookingSummary(row) {
  return {
    bookingId: row.booking_id,
    packageId: row.package_id,
    packageName: row.package_name,
    email: row.email,
    mobile: row.mobile,
    status: row.status,
    totalAmount: Number(row.total_amount),
    paymentUtr: row.payment_utr,
    hasScreenshot: Boolean(row.payment_screenshot_path),
    passengerCount: row.passenger_count,
    departureDate: row.departure_date,
    returnDate: row.return_date,
    timeSlot: row.time_slot,
    returnTimeSlot: row.return_time_slot,
    bookedAt: row.booked_at,
    emailSentAt: row.email_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function bookingDetail(row) {
  return {
    ...bookingSummary(row),
    passengers: row.passengers || [],
    paymentScreenshotPath: row.payment_screenshot_path,
  };
}

async function findByBookingId(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

router.post('/login', (req, res) => {
  if (!getAdminSecret()) {
    res.status(503).json({ error: 'Set ADMIN_PASSWORD in server environment' });
    return;
  }
  const password = String(req.body?.password || '');
  if (!verifyAdminPassword(password)) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  res.json({ ok: true, token: createAdminToken() });
});

router.get('/bookings', requireSupabase, requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (status === 'pending' || status === 'confirmed') {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;

    const bookings = (data || []).map(bookingSummary);
    const stats = {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    };
    res.json({ bookings, stats });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not load bookings' });
  }
});

router.get('/bookings/:bookingId', requireSupabase, requireAdmin, async (req, res) => {
  try {
    const booking = await findByBookingId(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json({ booking: bookingDetail(booking) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not load booking' });
  }
});

router.get('/bookings/:bookingId/screenshot', requireSupabase, requireAdmin, async (req, res) => {
  try {
    const booking = await findByBookingId(req.params.bookingId);
    if (!booking?.payment_screenshot_path) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }
    const { data, error } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .download(booking.payment_screenshot_path);
    if (error) throw error;

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = path.extname(booking.payment_screenshot_path).toLowerCase();
    const type = ext === '.pdf' ? 'application/pdf'
      : ext === '.webp' ? 'image/webp'
        : ext === '.png' ? 'image/png'
          : 'image/jpeg';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not load screenshot' });
  }
});

router.get('/payment-settings', requireSupabase, requireAdmin, async (_req, res) => {
  try {
    const row = await getPaymentSettingsRow();
    res.json({ settings: toPublicSettings(row) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not load payment settings' });
  }
});

router.put('/payment-settings', requireSupabase, requireAdmin, async (req, res) => {
  try {
    const row = await updatePaymentSettings(req.body || {});
    res.json({ settings: toPublicSettings(row) });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not update payment settings' });
  }
});

router.post(
  '/payment-settings/qr',
  requireSupabase,
  requireAdmin,
  upload.single('qr_image'),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'QR image file is required' });
        return;
      }
      const row = await uploadPaymentQr(req.file);
      res.json({ settings: toPublicSettings(row) });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Could not upload QR image' });
    }
  },
);

module.exports = router;
