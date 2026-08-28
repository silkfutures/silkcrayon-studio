-- V20.8 — owner-adjustable studio settings
create table if not exists public.studio_settings (
 key text primary key,
 value text not null,
 updated_at timestamptz not null default now()
);
insert into public.studio_settings(key,value) values
 ('studio_finish_price_pence','6000'),
 ('studio_finish_turnaround','within 7 days'),
 ('studio_finish_revisions','1')
on conflict(key) do nothing;
