-- V20.2.3 — promote legacy CRM contacts into the Artists/customer database
-- Safe to re-run. Existing customers are matched by email and not duplicated.
insert into public.customers(
  full_name,email,phone,artist_name,marketing_consent,created_at,updated_at
)
select
  cc.full_name,
  lower(cc.email),
  cc.phone,
  null,
  cc.marketing_consent,
  coalesce(cc.wix_created_at,cc.created_at,now()),
  now()
from public.crm_contacts cc
where cc.email is not null
  and not exists(
    select 1 from public.customers c where lower(c.email)=lower(cc.email)
  )
on conflict (email) do nothing;

-- Link all CRM rows back to the corresponding Artist/customer record.
update public.crm_contacts cc
set customer_id=c.id,updated_at=now()
from public.customers c
where cc.email is not null
  and lower(cc.email)=lower(c.email);
