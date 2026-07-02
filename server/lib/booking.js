const crypto = require('crypto');
const { getPackage } = require('./packages');
const { supabase } = require('./supabase');

const BOOKING_ID_MIN = 1_000_000_000;
const BOOKING_ID_MAX = 10_000_000_000;

function generateBookingId() {
  return String(crypto.randomInt(BOOKING_ID_MIN, BOOKING_ID_MAX));
}

function isValidBookingId(value) {
  return /^\d{10}$/.test(String(value || ''));
}

function isDuplicateBookingIdError(error) {
  if (!error) return false;
  if (String(error.code || '') !== '23505') return false;
  const text = [
    error.message,
    error.details,
    error.hint,
    error.constraint,
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes('booking_id') || text.includes('bookings_booking_id');
}

async function insertBookingWithUniqueId(row, maxAttempts = 10) {
  if (!supabase) throw new Error('Database not configured');

  let payload = { ...row, booking_id: generateBookingId() };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      payload = { ...payload, booking_id: generateBookingId() };
    }

    if (!isValidBookingId(payload.booking_id)) {
      throw new Error('Invalid booking ID generated');
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert(payload)
      .select('*')
      .single();

    if (!error) return data;
    if (!isDuplicateBookingIdError(error)) throw error;
  }

  throw new Error('Could not generate a unique booking ID. Please try again.');
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function rowToDraft(row) {
  const pkg = getPackage(row.package_id);
  return {
    bookingId: row.booking_id,
    token: row.access_token,
    packageId: String(row.package_id),
    packageName: row.package_name,
    departureDate: row.departure_date,
    returnDate: row.return_date || '',
    timeSlot: row.time_slot,
    returnTimeSlot: row.return_time_slot || '',
    email: row.email,
    mobile: row.mobile,
    passengerCount: row.passenger_count,
    passengers: row.passengers,
    total: Number(row.total_amount),
    paymentUtr: row.payment_utr || '',
    bookedAt: row.booked_at ? formatBookedAt(row.booked_at) : '',
    confirmed: row.status === 'confirmed',
    pkg: pkg || {},
  };
}

function formatBookedAt(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  const hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(h12)}:${pad(d.getMinutes())} ${ampm}`;
}

function normalizeMobile(value) {
  return String(value || '').replace(/\D/g, '');
}

function mobileMatches(stored, provided) {
  const a = normalizeMobile(stored);
  const b = normalizeMobile(provided);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 10 && b.length >= 10) {
    return a.slice(-10) === b.slice(-10);
  }
  return false;
}

function validatePassengers(passengers, count) {
  if (!Array.isArray(passengers) || passengers.length !== count) {
    throw new Error('Passenger count does not match passenger details');
  }
  for (const p of passengers) {
    if (!p.name || !p.gender || !p.age) {
      throw new Error('Each passenger must have name, gender, and age');
    }
  }
}

function buildBookingRow(body) {
  const packageId = Number(body.packageId);
  const pkg = getPackage(packageId);
  if (!pkg) throw new Error('Invalid package');

  const passengerCount = Number(body.passengerCount || 1);
  const passengers = body.passengers || [];
  validatePassengers(passengers, passengerCount);

  if (!body.email || !body.mobile || !body.departureDate || !body.timeSlot) {
    throw new Error('Missing required booking fields');
  }

  if (pkg.hasReturn && !body.returnDate) {
    throw new Error('Return date is required for this package');
  }

  const total = pkg.total * passengerCount;

  // Public booking_id is always generated server-side — never taken from the client.
  return {
    access_token: generateToken(),
    package_id: packageId,
    package_name: pkg.name,
    email: String(body.email).trim().toLowerCase(),
    mobile: String(body.mobile).trim(),
    departure_date: body.departureDate,
    return_date: body.returnDate || null,
    time_slot: body.timeSlot,
    return_time_slot: body.returnTimeSlot || null,
    passenger_count: passengerCount,
    passengers,
    total_amount: total,
    status: 'pending',
  };
}

module.exports = {
  BOOKING_ID_MIN,
  BOOKING_ID_MAX,
  generateBookingId,
  generateToken,
  isValidBookingId,
  isDuplicateBookingIdError,
  insertBookingWithUniqueId,
  rowToDraft,
  buildBookingRow,
  formatBookedAt,
  normalizeMobile,
  mobileMatches,
};
