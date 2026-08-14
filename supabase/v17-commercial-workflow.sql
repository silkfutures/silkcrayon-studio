-- V17 — commercial workflow, discounts and project status
-- Run after V14/V13 migrations.

alter table public.studio_payments drop constraint if exists studio_payments_kind_check;
alter table public.studio_payments add constraint studio_payments_kind_check check (kind in ('session','package','mix_master','other'));
alter table public.studio_payments add column if not exists list_amount_pence integer;
alter table public.studio_payments add column if not exists discount_code text;
alter table public.studio_payments add column if not exists discount_percent numeric(5,2) not null default 0;
alter table public.studio_payments add column if not exists discount_amount_pence integer not null default 0;

alter table public.session_reports add column if not exists project_status text;
