-- Run this in Supabase SQL Editor if you already created the bookings table earlier.

create table if not exists public.payment_settings (
  id integer primary key default 1 check (id = 1),
  merchant text not null default 'Trans Bharat Aviation',
  manager text not null default 'Raja Kumar',
  account_number text not null default '38408100014453',
  ifsc text not null default 'BARB0FATWAH',
  bank text not null default 'Bank of Baroda',
  qr_image_path text,
  updated_at timestamptz not null default now()
);

alter table public.payment_settings enable row level security;

insert into public.payment_settings (id)
values (1)
on conflict (id) do nothing;
