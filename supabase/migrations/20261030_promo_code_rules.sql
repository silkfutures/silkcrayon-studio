alter table public.promotions add column if not exists code_only boolean not null default false;
alter table public.promotions add column if not exists discount_percent numeric(5,2);
alter table public.promotions add column if not exists min_duration_minutes integer;
