const crypto = require('crypto');
const { getPackage } = require('./packages');

function generateBookingId() {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
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

  return {
    booking_id: generateBookingId(),
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
  generateBookingId,
  generateToken,
  rowToDraft,
  buildBookingRow,
  formatBookedAt,
};
