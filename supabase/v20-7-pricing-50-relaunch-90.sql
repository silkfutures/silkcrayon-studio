-- V20.7 — £50/hour standard studio rate + 2 hours for £90 relaunch
-- Run once after deploying this patch.

-- Update the existing relaunch promotion in place. Keep the existing code so
-- historical payments/usage-limit checks continue to work against the same offer.
update public.promotions
set
  name='2 Hours for £90',
  badge_text='2 HOURS · £90',
  headline='Two hours. Ninety pounds.',
  description='A focused two-hour vocal recording session at the relaunch rate.',
  offer_price_pence=9000,
  normal_price_pence=10000,
  cta_text='Book the offer',
  updated_at=now()
where code='RELAUNCH_2H_100';

insert into public.promotions(
 code,name,active,badge_text,headline,description,offer_price_pence,normal_price_pence,
 service_slug,duration_minutes,starts_at,ends_at,cta_text,usage_limit_per_customer,
 priority,show_on_homepage,show_on_booking
)
select
 'RELAUNCH_2H_100','2 Hours for £90',true,'2 HOURS · £90','Two hours. Ninety pounds.',
 'A focused two-hour vocal recording session at the relaunch rate.',9000,10000,
 'vocal-recording',120,'2026-08-16T00:00:00+01:00','2026-08-31T23:59:59+01:00',
 'Book the offer',1,100,true,true
where not exists(select 1 from public.promotions where code='RELAUNCH_2H_100');
