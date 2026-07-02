const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase, SCREENSHOT_BUCKET } = require('../lib/supabase');
const { getPackage } = require('../lib/packages');
const { buildBookingRow, rowToDraft, insertBookingWithUniqueId, mobileMatches } = require('../lib/booking');
const { sendBookingConfirmation } = require('../lib/email');
const { generateTicketPdf } = require('../lib/ticket-pdf');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
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

async function findByBookingId(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function getToken(req) {
  const header = req.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.body?.token || req.query?.token || '';
}

router.post('/', requireSupabase, async (req, res) => {
  try {
    const row = buildBookingRow(req.body);
    const data = await insertBookingWithUniqueId(row);

    const draft = rowToDraft(data);
    res.status(201).json({
      bookingId: draft.bookingId,
      token: draft.token,
      draft,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not create booking' });
  }
});

router.get('/packages/:id', (req, res) => {
  const pkg = getPackage(req.params.id);
  if (!pkg) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  res.json({ package: pkg });
});

function getVerifyMobile(req) {
  return req.query.mobile || req.body?.mobile || '';
}

function canVerifyBooking(booking, mobile) {
  if (!booking || booking.status !== 'confirmed') return false;
  if (!mobileMatches(booking.mobile, mobile)) return false;
  return true;
}

router.get('/verify/:bookingId', requireSupabase, async (req, res) => {
  try {
    const booking = await findByBookingId(req.params.bookingId);
    if (!canVerifyBooking(booking, getVerifyMobile(req))) {
      res.status(404).json({ error: 'Booking not found or not confirmed' });
      return;
    }
    res.json({ draft: rowToDraft(booking) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Lookup failed' });
  }
});

router.get('/verify/:bookingId/ticket.pdf', requireSupabase, async (req, res) => {
  try {
    const booking = await findByBookingId(req.params.bookingId);
    if (!canVerifyBooking(booking, getVerifyMobile(req))) {
      res.status(404).json({ error: 'Ticket not available' });
      return;
    }
    const pdf = await generateTicketPdf(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ticket-${booking.booking_id}.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Download failed' });
  }
});

router.get('/:bookingId/ticket.pdf', requireSupabase, async (req, res) => {
  try {
    const booking = await findByBookingId(req.params.bookingId);
    if (!booking || booking.status !== 'confirmed') {
      res.status(404).json({ error: 'Ticket not available' });
      return;
    }
    const token = getToken(req);
    if (token !== booking.access_token) {
      res.status(403).json({ error: 'Invalid access token' });
      return;
    }
    const pdf = await generateTicketPdf(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ticket-${booking.booking_id}.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Download failed' });
  }
});

router.get('/:bookingId', requireSupabase, async (req, res) => {
  try {
    const booking = await findByBookingId(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    const token = getToken(req);
    if (token !== booking.access_token) {
      res.status(403).json({ error: 'Invalid access token' });
      return;
    }
    res.json({ draft: rowToDraft(booking) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Lookup failed' });
  }
});

router.post(
  '/:bookingId/confirm',
  requireSupabase,
  upload.single('payment_screenshot'),
  async (req, res) => {
    try {
      const booking = await findByBookingId(req.params.bookingId);
      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }
      const token = getToken(req);
      if (token !== booking.access_token) {
        res.status(403).json({ error: 'Invalid access token' });
        return;
      }
      if (booking.status === 'confirmed') {
        res.json({ draft: rowToDraft(booking), alreadyConfirmed: true });
        return;
      }

      const paymentUtr = String(req.body.payment_utr || '').trim();
      if (!paymentUtr || paymentUtr.length < 3) {
        res.status(400).json({ error: 'Valid payment UTR is required' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Payment screenshot is required' });
        return;
      }

      const ext = path.extname(req.file.originalname) || '.jpg';
      const storagePath = `${booking.booking_id}/${Date.now()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(SCREENSHOT_BUCKET)
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const bookedAt = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_utr: paymentUtr,
          payment_screenshot_path: storagePath,
          booked_at: bookedAt,
          updated_at: bookedAt,
        })
        .eq('id', booking.id)
        .select('*')
        .single();
      if (updateError) throw updateError;

      let emailSent = false;
      let emailError = null;
      try {
        await sendBookingConfirmation(updated);
        emailSent = true;
        await supabase
          .from('bookings')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', booking.id);
      } catch (emailErr) {
        emailError = emailErr.message;
        console.error('[email]', emailErr);
      }

      res.json({
        draft: rowToDraft(updated),
        emailSent,
        emailError,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Confirmation failed' });
    }
  },
);

module.exports = router;
