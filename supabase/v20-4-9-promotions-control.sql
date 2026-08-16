-- Silkcrayon Studio OS — owner-controlled site promotions
begin;

create table if not exists public.site_promotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  badge_text text,
  banner_title text,
  banner_copy text,
  cta_label text not null default 'Book now',
  cta_href text not null default '/booking',
  service_slug text,
  duration_minutes integer,
  amount_pence integer,
  list_amount_pence integer,
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses_per_customer integer not null default 1,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings add column if not exists promotion_slug text;

insert into public.site_promotions (
 slug,name,badge_text,banner_title,banner_copy,cta_label,cta_href,
 service_slug,duration_minutes,amount_pence,list_amount_pence,
 active,starts_at,ends_at,max_uses_per_customer,priority
) values (
 'relaunch-2h-100','2 Hours for £100','2H FOR £100',
 '2 hours. £100.',
 'Usually £120. Book two hours during the Silkcrayon relaunch and save £20.',
 'Book 2 hours for £100','/booking?service=vocal-recording',
 'vocal-recording',120,10000,12000,
 true,now(),'2026-08-31 22:59:59+00',1,100
)
on conflict (slug) do update set
 badge_text=excluded.badge_text,
 banner_title=excluded.banner_title,
 banner_copy=excluded.banner_copy,
 cta_label=excluded.cta_label,
 cta_href=excluded.cta_href,
 service_slug=excluded.service_slug,
 duration_minutes=excluded.duration_minutes,
 amount_pence=excluded.amount_pence,
 list_amount_pence=excluded.list_amount_pence,
 ends_at=excluded.ends_at,
 max_uses_per_customer=excluded.max_uses_per_customer,
 priority=excluded.priority,
 updated_at=now();

alter table public.site_promotions enable row level security;
-- Public reads are served only through the server API with the service-role client.

commit;
