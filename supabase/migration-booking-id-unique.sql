-- Ensures booking_id cannot duplicate (safe to run on existing projects).

create unique index if not exists bookings_booking_id_key on public.bookings (booking_id);
