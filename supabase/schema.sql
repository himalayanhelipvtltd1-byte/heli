-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique,
  access_token text not null,
  package_id integer not null,
  package_name text not null,
  email text not null,
  mobile text not null,
  departure_date date not null,
  return_date date,
  time_slot text not null,
  return_time_slot text,
  passenger_count integer not null check (passenger_count between 1 and 20),
  passengers jsonb not null default '[]'::jsonb,
  total_amount numeric(12, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  payment_utr text,
  payment_screenshot_path text,
  booked_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_booking_id_idx on public.bookings (booking_id);
create index if not exists bookings_email_idx on public.bookings (email);
create index if not exists bookings_status_idx on public.bookings (status);

alter table public.bookings enable row level security;

-- Service role (backend) bypasses RLS. No public policies needed.

-- Storage bucket for payment screenshots (create in Dashboard → Storage):
--   Bucket name: payment-screenshots
--   Public: false
--   Allowed MIME: image/jpeg, image/png, image/webp, application/pdf
--   Max file size: 5MB
