-- V20.11 — universal commercial settings + reschedule schema compatibility
create table if not exists public.studio_settings (
 key text primary key,
 value text not null,
 updated_at timestamptz not null default now()
);

insert into public.studio_settings(key,value) values
 ('studio_hourly_price_pence','5000'),
 ('full_day_price_pence','40000'),
 ('relaunch_offer_price_pence','9000'),
 ('studio_finish_price_pence','6000'),
 ('studio_finish_turnaround','within 7 days'),
 ('studio_finish_revisions','1')
on conflict(key) do nothing;

-- Some production databases pre-date the optional note column used by change requests.
alter table public.bookings add column if not exists change_request_note text;

-- Keep the historical code for usage tracking; only correct its current price/value.
update public.promotions
set offer_price_pence=9000, normal_price_pence=10000, updated_at=now()
where code='RELAUNCH_2H_100'
  and not exists (select 1 from public.studio_settings where key='relaunch_offer_price_pence' and value<>'9000');
