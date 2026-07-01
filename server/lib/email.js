const nodemailer = require('nodemailer');
const { generateTicketPdf } = require('./ticket-pdf');

const FROM_EMAIL = process.env.FROM_EMAIL || 'info@transbharataviation.com';
const FROM_NAME = process.env.FROM_NAME || 'Trans Bharat Aviation';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

let resendClient = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    const { Resend } = require('resend');
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function getSmtpTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: String(process.env.SMTP_PASS || '').replace(/\s/g, ''),
    },
  });
}

function fmtInr(n) {
  return `₹${Math.round(Number(n)).toLocaleString('en-IN')}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function buildHtml(booking) {
  const passengerList = (booking.passengers || [])
    .map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.gender}</td><td>${p.age}</td></tr>`)
    .join('');

  const returnLine = booking.return_date
    ? `<p><strong>Return:</strong> ${fmtDate(booking.return_date)}${booking.return_time_slot ? ` · ${booking.return_time_slot}` : ''}</p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.5;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#166534;margin:0 0 8px">Booking Confirmed</h1>
  <p>Your Trans Bharat Aviation helicopter booking is confirmed.</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
    <p style="margin:4px 0"><strong>Booking ID:</strong> ${booking.booking_id}</p>
    <p style="margin:4px 0"><strong>Package:</strong> ${booking.package_name}</p>
    <p style="margin:4px 0"><strong>Journey:</strong> ${fmtDate(booking.departure_date)} · ${booking.time_slot}</p>
    ${returnLine}
    <p style="margin:4px 0"><strong>Passengers:</strong> ${booking.passenger_count}</p>
    <p style="margin:4px 0"><strong>Total Paid:</strong> ${fmtInr(booking.total_amount)}</p>
  </div>
  <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:14px">
    <thead><tr><th>#</th><th>Name</th><th>Gender</th><th>Age</th></tr></thead>
    <tbody>${passengerList}</tbody>
  </table>
  <p style="margin-top:20px">
    <a href="${APP_URL}/ticket.html" style="background:#dc2626;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;display:inline-block">View Ticket</a>
    &nbsp;
    <a href="${APP_URL}/verify.html" style="color:#2563eb">Verify booking anytime</a>
  </p>
  <p style="font-size:13px;color:#64748b;margin-top:24px">
    Carry original ID proofs and report at the helipad at least 2 hours before departure.
  </p>
</body>
</html>`;
}

async function sendBookingConfirmation(booking) {
  const subject = `Trans Bharat Aviation Booking Confirmed — ${booking.booking_id}`;
  const html = buildHtml(booking);
  const ticketBuffer = await generateTicketPdf(booking);

  const transport = getSmtpTransport();
  if (transport) {
    const mail = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: booking.email,
      subject,
      html,
      attachments: [{
        filename: `ticket-${booking.booking_id}.pdf`,
        content: ticketBuffer,
        contentType: 'application/pdf',
      }],
    };
    await transport.sendMail(mail);
    return { provider: 'smtp' };
  }

  const resend = getResend();
  if (resend) {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [booking.email],
      subject,
      html,
      attachments: [{
        filename: `ticket-${booking.booking_id}.pdf`,
        content: ticketBuffer,
      }],
    });
    if (error) throw new Error(error.message || 'Resend failed');
    return { provider: 'resend' };
  }

  throw new Error(
    'No email provider configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS (Gmail) or RESEND_API_KEY in .env',
  );
}

module.exports = { sendBookingConfirmation };
