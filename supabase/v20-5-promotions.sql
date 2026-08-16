-- V20.5 — owner-controlled promotions
create table if not exists public.promotions (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 name text not null,
 active boolean not null default false,
 badge_text text,
 headline text,
 description text,
 offer_price_pence integer not null check (offer_price_pence >= 30),
 normal_price_pence integer not null check (normal_price_pence >= offer_price_pence),
 service_slug text,
 duration_minutes integer,
 starts_at timestamptz,
 ends_at timestamptz,
 cta_text text,
 usage_limit_per_customer integer check (usage_limit_per_customer is null or usage_limit_per_customer > 0),
 priority integer not null default 0,
 show_on_homepage boolean not null default true,
 show_on_booking boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.bookings add column if not exists promotion_id uuid references public.promotions(id) on delete set null;
alter table public.bookings add column if not exists promotion_code text;
alter table public.bookings add column if not exists list_amount_pence integer;
alter table public.bookings add column if not exists discount_amount_pence integer not null default 0;
create index if not exists promotions_live_idx on public.promotions(active,priority desc);
create index if not exists bookings_promotion_customer_idx on public.bookings(promotion_id,customer_id);
insert into public.promotions(code,name,active,badge_text,headline,description,offer_price_pence,normal_price_pence,service_slug,duration_minutes,starts_at,ends_at,cta_text,usage_limit_per_customer,priority,show_on_homepage,show_on_booking)
values('RELAUNCH_2H_100','2 Hours for £100',true,'2 HOURS · £100','Two hours. One hundred pounds.','A focused two-hour vocal recording session at the relaunch rate.',10000,12000,'vocal-recording',120,'2026-08-16T00:00:00+01:00','2026-08-31T23:59:59+01:00','Book the offer',1,100,true,true)
on conflict(code) do update set name=excluded.name,badge_text=excluded.badge_text,headline=excluded.headline,description=excluded.description,offer_price_pence=excluded.offer_price_pence,normal_price_pence=excluded.normal_price_pence,service_slug=excluded.service_slug,duration_minutes=excluded.duration_minutes,ends_at=excluded.ends_at,cta_text=excluded.cta_text,usage_limit_per_customer=excluded.usage_limit_per_customer,priority=excluded.priority,show_on_homepage=excluded.show_on_homepage,show_on_booking=excluded.show_on_booking;
