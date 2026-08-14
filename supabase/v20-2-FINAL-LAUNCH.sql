create table if not exists public.leads (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 enquiry_type text not null,
 client_type text not null default 'client',
 status text not null default 'new' check (status in ('new','contacted','interested','booked','won','lost')),
 full_name text not null,
 artist_or_company text,
 email text not null,
 phone text,
 preferred_call_time text,
 project_type text,
 project_details text,
 budget_range text,
 deadline text,
 word_count_runtime text,
 speakers text,
 editing_required text,
 track_count text,
 stems_available text,
 reference_tracks text,
 source text not null default 'website',
 notes text
);
create index if not exists leads_status_created_idx on public.leads(status,created_at desc);
alter table public.leads enable row level security;


-- V20.1 — Legacy contacts + simple marketing centre
create extension if not exists "pgcrypto";

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  first_name text,
  last_name text,
  full_name text not null,
  email text unique,
  email_2 text,
  phone text,
  phone_2 text,
  company text,
  labels text[] not null default '{}',
  source text,
  language text,
  city text,
  postcode text,
  country text,
  marketing_status text not null default 'unknown'
    check (marketing_status in ('subscribed','never_subscribed','unsubscribed','unknown')),
  marketing_consent boolean not null default false,
  wix_created_at timestamptz,
  last_activity text,
  last_activity_at timestamptz,
  resend_contact_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contacts_name_idx on public.crm_contacts(full_name);
create index if not exists crm_contacts_marketing_idx on public.crm_contacts(marketing_status);
create index if not exists crm_contacts_customer_idx on public.crm_contacts(customer_id);

create table if not exists public.marketing_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid,
  name text not null,
  subject text not null,
  preheader text,
  headline text,
  body text not null,
  cta_label text,
  cta_url text,
  segment_id text,
  resend_broadcast_id text,
  recipient_count integer not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.crm_contacts enable row level security;
alter table public.marketing_settings enable row level security;
alter table public.marketing_campaigns enable row level security;

create or replace function public.sync_customer_to_crm_contacts()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.crm_contacts(customer_id,full_name,email,phone,marketing_status,marketing_consent,source,updated_at)
  values(new.id,new.full_name,lower(new.email),new.phone,
    case when new.marketing_consent then 'subscribed' else 'unknown' end,
    new.marketing_consent,'Silkcrayon OS',now())
  on conflict (email) do update set
    customer_id=excluded.customer_id,
    full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
    phone=coalesce(excluded.phone,public.crm_contacts.phone),
    marketing_status=case
      when public.crm_contacts.marketing_status='unsubscribed' then 'unsubscribed'
      when excluded.marketing_consent then 'subscribed'
      else public.crm_contacts.marketing_status
    end,
    marketing_consent=case
      when public.crm_contacts.marketing_status='unsubscribed' then false
      else public.crm_contacts.marketing_consent or excluded.marketing_consent
    end,
    updated_at=now();
  return new;
end;
$$;

drop trigger if exists customers_sync_crm_contacts on public.customers;
create trigger customers_sync_crm_contacts
after insert or update of full_name,email,phone,marketing_consent on public.customers
for each row execute function public.sync_customer_to_crm_contacts();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Tomas',null,'Tomas','itiger20021968@gmail.com',null,
  '7392959944','07392959944',null,array['2 Hours At Canton','1 Hour At Canton']::text[],'Wix Stores',
  'pt',null,null,null,
  'never_subscribed',false,
  '2024-11-13 18:22'::timestamptz,'Booked a session','2025-03-06 16:59'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jamal','hirsi','Jamal hirsi','darkz_187kid@hotmail.com',null,
  '07301134422',null,null,array['2 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-05-13 11:23'::timestamptz,'Placed an order','2025-05-13 11:26'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Ausra',null,'Ausra','ausraceikauskene@gmail.com',null,
  null,null,null,array['2 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-02-02 11:35'::timestamptz,'Placed an order','2026-02-02 11:35'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'mattisse','jamal','mattisse jamal','mattissebennett@hotmail.com',null,
  null,null,null,'{}'::text[],'Site Members',
  null,null,null,null,
  'never_subscribed',false,
  '2024-08-22 13:49'::timestamptz,'Signed up to your site','2024-08-22 13:49'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Kyle williams',null,'Kyle williams','kjw16@hotmail.com',null,
  '07532767986',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,'United Kingdom',
  'never_subscribed',false,
  '2022-11-14 09:29'::timestamptz,'Placed an order','2023-02-27 18:22'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'AP',null,'AP','asripasha5@gmail.com',null,
  '07476147426',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-10-30 02:13'::timestamptz,'Placed an order','2023-10-30 02:15'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'hannah','grace.x','hannah grace.x','hcresswell00@gmail.com',null,
  null,null,null,array['2 Hours At Canton']::text[],'Site Members',
  null,null,null,null,
  'never_subscribed',false,
  '2025-04-22 10:49'::timestamptz,'Opened an email campaign','2025-05-22 13:14'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Raheem','Mohamed','Raheem Mohamed','rmh2014@icloud.com',null,
  '''+44 7466 411793',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-03-27 02:42'::timestamptz,'Contact was created','2026-03-27 02:42'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'7misra@gmail.com','7misra@gmail.com',null,
  null,null,null,array['Subscribe to get exclusive updates 2','1 Hour At Canton']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2023-05-17 14:13'::timestamptz,'Placed an order','2024-09-01 11:51'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jac','Lucas','Jac Lucas','jaclucas30@gmail.com',null,
  '''+44 7464 315112',null,null,array['2 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-11-25 22:11'::timestamptz,'Booked a session','2024-11-25 22:12'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Patrick Hegarty',null,'Patrick Hegarty','patrick.john.hegarty@gmail.com',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-09-20 13:45'::timestamptz,'Submitted a form','2023-09-20 13:48'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Sunil Yadav','delhi','Sunil Yadav delhi','sunilwebstudio@yahoo.com',null,
  null,null,null,array['Donate Now','Donate Now 4']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-02-10 09:49'::timestamptz,'Submitted a form','2023-02-10 09:50'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'jake_t_tone@hotmail.co.uk','jake_t_tone@hotmail.co.uk',null,
  null,null,null,'{}'::text[],'Site Members',
  null,null,null,null,
  'never_subscribed',false,
  '2026-02-24 13:42'::timestamptz,'Signed up to your site','2026-02-24 13:44'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Steven Hunter',null,'Steven Hunter','s.hunter56@yahoo.com',null,
  '''+44 7538 884607',null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-04-11 18:36'::timestamptz,'Booked a session','2026-04-11 18:36'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Sarah Williams','Help Musicians (charity)','Sarah Williams Help Musicians (charity)','sarah.williams@helpmusicians.org.uk',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-10-24 10:40'::timestamptz,'Submitted a form','2022-10-24 10:41'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Logan Harris',null,'Logan Harris','loganharris006@outlook.com',null,
  '''+44 7495 145322',null,null,array['Subscribe to get exclusive updates 2','3 Hours At Cardiff Bay']::text[],'Form Submission / Manual Creation',
  'en',null,null,null,
  'subscribed',true,
  '2023-06-05 02:35'::timestamptz,'Submitted a form','2023-06-05 02:35'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'wxw',null,'wxw','xww@xs.cxom',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-09-29 05:51'::timestamptz,'Contact was created','2022-09-29 05:51'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Douth','Reath','Douth Reath','douthreath2005@gmail.com',null,
  '''+44 7956 260407',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-03-01 16:29'::timestamptz,'Booked a session','2025-03-01 16:31'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'wade boulter',null,'wade boulter','wadeboulter@gmail.com',null,
  '07383512025',null,null,array['3 Hours At Cardiff Bay']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-09-21 10:35'::timestamptz,'Contact was created','2022-09-21 10:35'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Minhaaj',null,'Minhaaj','minhaaj_ahmed@hotmail.co.uk',null,
  '07849222361',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-10-21 18:57'::timestamptz,'Contact was created','2022-10-21 18:57'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Dan','Smith (Demo)','Dan Smith (Demo)','dan_demo@wix.com',null,
  null,null,null,'{}'::text[],'External App',
  null,null,null,null,
  'never_subscribed',false,
  '2022-08-24 15:42'::timestamptz,'Contact was created','2022-08-24 15:42'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Dusan',null,'Dusan','dp_06s@icloud.com',null,
  '07949192234',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-06-26 16:59'::timestamptz,'Placed an order','2025-06-26 17:02'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jake',null,'Jake','snakeytv@gmail.com',null,
  '07751699276',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-12-07 16:29'::timestamptz,'Booked a session','2025-02-16 11:11'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Mubarak','Oadan','Mubarak Oadan','oofu69@gmail.com',null,
  '07874146083',null,null,array['2 Hours At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-08-26 17:26'::timestamptz,'Booked a session','2024-08-26 17:40'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jude','Walker','Jude Walker','judewalker630@gmail.com',null,
  null,null,null,'{}'::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-07-20 19:51'::timestamptz,null,'2026-07-31 11:01'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Zika',null,'Zika','zikandiwe2@gmail.com',null,
  '07899234313',null,null,array['2 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-06-05 12:35'::timestamptz,'Opened an email campaign','2025-06-06 20:48'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Katy','Afzal','Katy Afzal','katyincardiff@hotmail.com',null,
  '07707413217',null,null,array['2 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-07-20 11:53'::timestamptz,'Opened an email campaign','2025-07-25 01:19'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Bianca','Nadine','Bianca Nadine','biancanadine34@gmail.com',null,
  '''+44 7908 228005',null,null,array['3 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-10-17 17:32'::timestamptz,'Opened an email campaign','2025-11-10 14:01'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'reuboyy@gmail.com','reuboyy@gmail.com',null,
  null,null,null,'{}'::text[],'Manual Creation',
  null,null,null,null,
  'never_subscribed',false,
  '2025-06-05 12:37'::timestamptz,'Opened an email campaign','2025-09-20 11:43'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Yehor',null,'Yehor','tofitomusic@gmail.com',null,
  '7719224043',null,null,array['2 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-12-28 18:30'::timestamptz,'Booked a session','2024-12-28 18:35'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Toda','Ogunbanwo','Toda Ogunbanwo','sagetodz@gmail.com',null,
  '07460803921',null,null,array['2 Hours At Canton','1 Hour At Canton']::text[],'Service Booking',
  'en','Cardiff','CF24 1QG','United Kingdom',
  'never_subscribed',false,
  '2023-01-05 14:43'::timestamptz,'Placed an order','2023-02-08 15:26'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Fakunle','Olufemi','Fakunle Olufemi','fakunle.olufemi@gmail.com',null,
  '''+44 7405 453934','7405 453934',null,array['2 Hours At Cardiff Bay']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-10-27 20:27'::timestamptz,'Email subscriber status changed to "Never subscribed"','2024-10-27 20:34'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Caroline Bell','Hillside Secure Children Home','Caroline Bell Hillside Secure Children Home','bellc57@hwbcymru.net',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-11-24 13:45'::timestamptz,'Contact was created','2025-11-24 13:45'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Emmet O''Neill',null,'Emmet O''Neill','emmetoneill489@gmail.com',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-09-11 15:26'::timestamptz,'Submitted a form','2023-09-11 15:34'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jomo',null,'Jomo','jomokays@gamil.com',null,
  '''+44 7501 267497',null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-12-11 16:46'::timestamptz,'Contact was created','2025-12-11 16:46'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Alex',null,'Alex','77289k@gmail.com',null,
  '07795086303',null,null,array['2 Hours At Canton']::text[],'Service Booking',
  'uk',null,null,null,
  'never_subscribed',false,
  '2023-12-16 22:01'::timestamptz,'Placed an order','2023-12-17 10:05'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Hannah',null,'Hannah','hannahgrace.x9@gmail.com',null,
  '07801297046',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-01-30 00:13'::timestamptz,'Booked a session','2025-02-13 15:13'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'tshiamo',null,'tshiamo','tshiamordavies@gmail.com',null,
  '07570886927',null,null,array['2 Hours At Canton','3 Hours At Cardiff Bay']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-08-08 12:04'::timestamptz,'Placed an order','2023-11-24 10:05'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Lisa',null,'Lisa','lisamalunga1@gmail.com',null,
  null,null,null,array['2 Hours At Canton']::text[],'Other',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-08-27 20:43'::timestamptz,'Placed an order','2023-08-27 20:44'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Eretoda','Ogunbanwo','Eretoda Ogunbanwo','elderman.99@gmail.com',null,
  '07460803921',null,null,array['1 Hour At Canton','2 Hours At Canton']::text[],'Service Booking',
  'en','Cardiff','CF24 1QG','United Kingdom',
  'never_subscribed',false,
  '2023-03-10 17:52'::timestamptz,'Placed an order','2023-10-31 18:15'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jon','Kongolo','Jon Kongolo','jon.kongolo1@gmail.com',null,
  '07984860094',null,null,array['2 Hours At Canton','3 Hours At Cardiff Bay']::text[],'Site Members',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-05-01 13:35'::timestamptz,'Placed an order','2025-12-27 15:25'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Aaron','Williams','Aaron Williams','aaronwilliams619@hotmail.co.uk',null,
  '07308309102',null,null,array['2 Hours At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-04-29 16:15'::timestamptz,'Contact was created','2024-04-29 16:15'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Grave',null,'Grave','graveoneforty@gmail.com',null,
  null,null,null,array['2 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-01-27 12:16'::timestamptz,'Opened an email campaign','2026-01-27 12:17'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jac','Lucas','Jac Lucas','jaclucas2008@icloud.com',null,
  '''+44 7453 573105',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-11-22 13:59'::timestamptz,'Contact was created','2024-11-22 13:59'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jerry Wang',null,'Jerry Wang','wangjl610@163.com',null,
  null,null,null,array['Donate Now 4']::text[],'Form Submission',
  'zh',null,null,null,
  'never_subscribed',false,
  '2024-05-04 11:42'::timestamptz,'Contact was created','2024-05-04 11:42'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Zara Edwards',null,'Zara Edwards','zara_edwards261@hotmail.com',null,
  '07398785804',null,null,array['3 Hours At Cardiff Bay']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-06-25 14:22'::timestamptz,'Placed an order','2023-06-25 14:22'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Barrie','Davies','Barrie Davies','barrie@nodor-darts.com',null,
  '07454105515',null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-09-25 11:42'::timestamptz,'Contact was created','2024-09-25 11:42'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Josh WHyte','National Theatre Wales','Josh WHyte National Theatre Wales','joshwhyte@nationaltheatrewales.org',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-12-18 17:01'::timestamptz,'Submitted a form','2023-12-18 17:01'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Natalie','O''Dell','Natalie O''Dell','natalie-odell@hotmail.co.uk',null,
  '07837346831',null,null,array['1 Hour At Canton','Subscribe to get exclusive updates 2']::text[],'Service Booking',
  'en','Pontypridd','CF38 2PD','United Kingdom',
  'subscribed',true,
  '2023-02-13 06:08'::timestamptz,'Submitted a form','2023-05-27 12:06'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Huw','Ware','Huw Ware','huwware180@gmail.com',null,
  '''+44 7826 755147',null,null,array['2 Hours At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-01-10 00:39'::timestamptz,'Placed an order','2024-01-10 00:40'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Immzy',null,'Immzy','immzye3@gmail.com',null,
  '07538740954',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-10-21 07:11'::timestamptz,'Contact was created','2022-10-21 07:11'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Reece marsh',null,'Reece marsh','reecemarsh12@icloud.com',null,
  '''+44 7546 581409',null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-02-05 13:36'::timestamptz,'Contact was created','2026-02-05 13:36'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Gabin','Kongolo','Gabin Kongolo','gabzkongolo@hotmail.com',null,
  '07452819637',null,null,array['2 Hours At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-12-26 01:16'::timestamptz,'Placed an order','2023-12-26 01:22'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jon','Kongolo','Jon Kongolo','jonathank1996@hotmail.co.uk',null,
  '''+44 7984 860094',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-01-09 18:14'::timestamptz,'Placed an order','2026-01-09 18:14'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Adrian Cole',null,'Adrian Cole','adrian.cole@careerswales.gov.wales',null,
  null,null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-08-03 10:50'::timestamptz,'Submitted a form','2026-08-03 10:50'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Lewis','Jones','Lewis Jones','valleyzeromusic@gmail.com',null,
  '07933398029','''+44 7933 398029',null,array['2 Hours At Canton','3 Hours At Canton']::text[],'Service Booking',
  'en','Risca','NP11 6HY','United Kingdom',
  'never_subscribed',false,
  '2023-01-04 09:00'::timestamptz,'Opened an email campaign','2025-11-20 18:13'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Mk',null,'Mk','ysmusic11@outlook.com',null,
  '447851091291',null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-07-12 06:44'::timestamptz,'Contact was created','2023-07-12 06:44'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'H','H','H H','h@fir.com',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-05-26 14:08'::timestamptz,'Contact was created','2023-05-26 14:08'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Sam','Partridge','Sam Partridge','samuelpartridge6@hotmail.com',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-03-04 13:01'::timestamptz,'Contact was created','2023-03-04 13:01'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Mark Schneider',null,'Mark Schneider','markprobionic@gmail.com',null,
  '''+44 7979 040100',null,null,array['4 Hours At Cardiff Bay']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-08-14 11:50'::timestamptz,'Primary phone number was updated','2024-08-14 11:54'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Ivan','Mbika','Ivan Mbika','squeaky-frost.5s@icloud.com',null,
  '07584961292',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-12-26 11:00'::timestamptz,'Booked a session','2024-12-26 11:01'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Ahmed',null,'Ahmed','ahmedjames994@gmail.com',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-12-29 19:56'::timestamptz,'Contact was created','2022-12-29 19:56'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Waseem','Francis','Waseem Francis','waseemfrancis85@gmail.com',null,
  '''+44 7808 573800',null,null,array['2 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-07-08 18:52'::timestamptz,'Opened an email campaign','2025-07-09 17:03'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Naman',null,'Naman','namangulzaruk@gmail.com',null,
  '''+44 7376 144558',null,null,array['2 Hours At Canton']::text[],'Wix Stores / Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-12-10 12:36'::timestamptz,'Canceled a session','2025-12-10 15:43'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Megan',null,'Megan','megancalder38@gmail.com',null,
  '''+44 7495 039594',null,null,array['2 Hours At Canton']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-08-17 16:52'::timestamptz,'Placed an order','2025-09-09 22:16'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Alun Morgan','Cardiff City Foundation Charity','Alun Morgan Cardiff City Foundation Charity','info@alunrhysmorgan.com',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-07-04 18:41'::timestamptz,'Submitted a form','2023-07-04 18:41'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Steffaniee Leigh','Thomas','Steffaniee Leigh Thomas','steffaniethomas@outlook.com',null,
  '07922074638',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-12-22 13:51'::timestamptz,'Booked a session','2024-12-24 05:48'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Abass',null,'Abass','abbas9cantona@hotmail.com',null,
  '07956587059',null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-12-07 19:09'::timestamptz,'Contact was created','2022-12-07 19:09'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Mukhtia','Singh Taak','Mukhtia Singh Taak','mstaak@hotmail.com',null,
  '''+44 7359 778296',null,null,array['3 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-10-31 18:26'::timestamptz,'Opened an email campaign','2025-10-31 18:30'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Harri','Hughes','Harri Hughes','harriahughes@gmail.com',null,
  '07532299724',null,null,array['3 Hours At Cardiff Bay']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-11-18 13:31'::timestamptz,'Email subscriber status changed to "Never subscribed"','2024-11-18 13:33'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Levani',null,'Levani','levanigriffiths170@gmail.com',null,
  '''+44 7771 263602',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-04-12 23:49'::timestamptz,'Booked a session','2026-04-12 23:49'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Bombero',null,'Bombero','bbbhhh420420@gmail.com',null,
  '07532299724','''+44 7532 299724',null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-04-15 07:55'::timestamptz,'Opened an email campaign','2025-10-06 06:53'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Idris Jones','Anthem Cymru','Idris Jones Anthem Cymru','idris@anthem.wales',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-10-17 10:05'::timestamptz,'Submitted a form','2023-10-17 10:16'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Marcus',null,'Marcus','mrtraumatik@yahoo.com',null,
  '''+44 7535 624397','7535 624397',null,array['1 Hour At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-09-24 16:50'::timestamptz,'Booked a session','2024-09-24 16:51'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Gemma','Kingston','Gemma Kingston','salon.angels@outlook.com',null,
  null,null,null,array['3 Hours At Cardiff Bay']::text[],'Other',
  null,null,null,null,
  'never_subscribed',false,
  '2023-12-13 22:02'::timestamptz,'Placed an order','2023-12-13 22:03'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'William','Lewis','William Lewis','william.lewis2014@icloud.com',null,
  '07564834590',null,null,array['2 Hours At Canton','Subscriptions']::text[],'Form Submission',
  'en',null,null,'United Kingdom',
  'subscribed',true,
  '2023-02-04 00:31'::timestamptz,'Placed an order','2023-03-24 16:56'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'cutrupimatt@gmail.com','cutrupimatt@gmail.com',null,
  null,null,null,array['Subscriptions']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2024-08-23 21:10'::timestamptz,'Submitted a form','2024-08-23 21:10'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'ivan',null,'ivan','ivanmbika99@gmail.com',null,
  '07584961292','''+44 7584 961292',null,array['2 Hours At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-08-14 14:00'::timestamptz,'Placed an order','2024-08-14 14:04'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Kadno',null,'Kadno','mfree1989@gmail.com',null,
  '''+44 7377 458335',null,null,array['3 Hours Bespoke Production']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-09-12 14:50'::timestamptz,'Primary email was updated','2024-09-14 10:14'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  '3aundz',null,'3aundz','3aundzz@gmail.com',null,
  '07927301161',null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-12-06 23:53'::timestamptz,'Contact was created','2023-12-06 23:53'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Saliu','Susso','Saliu Susso','sussosaliu6@gmail.com',null,
  '''+44 7440 544959',null,null,'{}'::text[],'Wix Stores / Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-11-17 16:23'::timestamptz,'Contact was created','2025-11-17 16:23'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Oluwafunbi','Mafoluku','Oluwafunbi Mafoluku','mafolukudaniel@gmail.com',null,
  '07598880972',null,null,array['2 Hours At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-05-14 12:43'::timestamptz,'Placed an order','2023-05-14 12:46'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Charley','Saunders','Charley Saunders','crs.03@icloud.com',null,
  null,null,null,array['2 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-12-07 00:38'::timestamptz,'Placed an order','2023-12-07 00:38'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Reuben',null,'Reuben','scroodem23@icloud.com',null,
  '''+44 7594 752271',null,null,array['1 Hour At Canton','2 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-08-11 11:40'::timestamptz,'Placed an order','2025-08-28 17:51'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'felix','felix','felix felix','fjascha03@gmail.com',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-06-19 16:35'::timestamptz,'Contact was created','2023-06-19 16:35'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Kai','After Kai','Kai After Kai','kailoganredundant@gmail.com',null,
  null,null,null,'{}'::text[],'Site Members',
  null,null,null,null,
  'never_subscribed',false,
  '2024-04-28 20:33'::timestamptz,'Contact was created','2024-04-28 20:33'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Nathan','Misra','Nathan Misra','hello@nathanmisra.com',null,
  null,null,null,'{}'::text[],'Site Members',
  null,null,null,null,
  'never_subscribed',false,
  '2024-09-01 11:17'::timestamptz,'Opened an email campaign','2025-08-20 18:50'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Amlan',null,'Amlan','dr_amlan2004@yahoo.co.uk',null,
  '07877969442',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-03-05 17:46'::timestamptz,'Booked a session','2025-03-05 17:48'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Dylan',null,'Dylan','dylanjacobharris@gmail.com',null,
  '''+44 7495 039594','''+44 7983 777027',null,array['1 Hour At Canton']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-08-20 18:36'::timestamptz,'Placed an order','2025-10-03 23:14'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'quietqye@gmail.com','quietqye@gmail.com',null,
  null,null,null,array['Subscribe to get exclusive updates 2']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2023-05-24 08:31'::timestamptz,'Submitted a form','2023-05-24 08:31'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Clodagh',null,'Clodagh','clodagh.meehanmacken@gmail.com',null,
  '''+44 7921 094149',null,null,array['1 Hour At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-12-13 13:32'::timestamptz,'Booked a session','2024-12-13 13:33'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'sym255@outlook.com','sym255@outlook.com',null,
  null,null,null,array['Subscribe to get exclusive updates 2']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2023-06-15 21:17'::timestamptz,'Submitted a form','2023-06-15 21:17'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Nino',null,'Nino','nonchaoant7fr@gmail.com',null,
  '''+44 7728 233076',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-12-11 23:02'::timestamptz,'Contact was created','2024-12-11 23:02'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Daniel',null,'Daniel','ddebek@rocketmail.com',null,
  null,null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-09-24 10:30'::timestamptz,'Contact was created','2025-09-24 10:30'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Danny Blackaller',null,'Danny Blackaller','dannyblackaller1@gmail.com',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-05-26 21:36'::timestamptz,'Contact was created','2024-05-26 21:36'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'delvey2022@gmail.com','delvey2022@gmail.com',null,
  null,null,null,array['Subscribe to get exclusive updates 2']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2023-05-19 18:09'::timestamptz,'Submitted a form','2023-05-19 18:09'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Riley',null,'Riley','rileyb283@icloud.com',null,
  '''+44 7533 832433',null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-04-25 01:21'::timestamptz,'Contact was created','2026-04-25 01:21'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Kevin',null,'Kevin','kevinayalafretes@gmail.com',null,
  '07846324032',null,null,array['3 Hours At Cardiff Bay','2 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-05-01 19:35'::timestamptz,'Opened an email campaign','2025-10-14 15:01'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Owain Roberts',null,'Owain Roberts','owain_g_roberts@hotmail.com',null,
  '''+44 7966 526315',null,null,array['3 Hours At Cardiff Bay','2 Hours At Canton']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-11-13 22:11'::timestamptz,'Placed an order','2025-11-17 17:25'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Usayd Issa',null,'Usayd Issa','usaydissa2@gmail.com',null,
  '''+44 7735 659642',null,null,array['1 Hour At Canton']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-09-18 00:26'::timestamptz,'Opened an email campaign','2025-09-18 04:50'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Alex',null,'Alex','aargentework@gmail.com',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-10-29 15:09'::timestamptz,'Contact was created','2025-10-29 15:09'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'm1💯',null,'m1💯','musaargin664@gmail.com',null,
  null,null,null,array['Donate Now 4']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-12-31 13:26'::timestamptz,'Submitted a form','2023-12-31 13:26'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Kristian',null,'Kristian','denisgabco01@gmail.com',null,
  '''+44 7757 765474',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-05-18 16:29'::timestamptz,'Booked a session','2026-05-18 16:34'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Catriona Brown',null,'Catriona Brown','catrionabrown12@hotmail.com',null,
  '''+44 7717 317537','7717317537',null,array['2 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-04-24 12:41'::timestamptz,'Contact was created','2024-04-24 12:41'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Isla','Mccormack','Isla Mccormack','islarose1@hotmail.com',null,
  '''+44 7925 870429',null,null,array['3 Hours At Cardiff Bay']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-09-06 11:40'::timestamptz,'Booked a session','2024-09-06 11:41'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'starbust1990@gmail.com','starbust1990@gmail.com',null,
  null,null,null,array['Subscriptions']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2022-10-18 00:28'::timestamptz,'Subscribed to promotional emails','2022-10-18 00:28'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'D.o.t',null,'D.o.t','ajleo1972@gmail.com',null,
  '''+44 7956 587059',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-01-08 14:39'::timestamptz,'Contact was created','2026-01-08 14:39'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Charlotte',null,'Charlotte','charlottemarieparry@outlook.com',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-07-26 21:59'::timestamptz,'Contact was created','2023-07-26 21:59'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Naomi Collins','ShortRiot PRoductions','Naomi Collins ShortRiot PRoductions','naomicollins5@gmail.com',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-09-11 12:40'::timestamptz,'Submitted a form','2024-09-11 12:40'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'JGEE','JGEE','JGEE JGEE','jeffreygriffiths294@gmail.com',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-04-13 11:31'::timestamptz,'Contact was created','2023-04-13 11:31'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Andrew','Williams','Andrew Williams','a.williams.1@live.co.uk',null,
  '07778500437',null,null,array['4 Hours At Cardiff Bay']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-07-29 11:24'::timestamptz,'Placed an order','2025-07-29 11:25'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Lily lewis',null,'Lily lewis','lilylewis088@gmail.com',null,
  '''+44 7852 188346',null,null,'{}'::text[],'Form Submission',
  'en-GB',null,null,null,
  'never_subscribed',false,
  '2026-06-07 11:54'::timestamptz,null,'2026-07-15 13:00'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'James','Makepeace','James Makepeace','jamesmakepeace02@gmail.com',null,
  '07864638755',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-10-20 18:01'::timestamptz,'Booked a session','2024-12-19 13:22'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'skuczynska42@gmail.com','skuczynska42@gmail.com',null,
  null,null,null,array['Subscriptions']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2022-11-13 17:42'::timestamptz,'Subscribed to promotional emails','2022-11-13 17:42'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Coel','Sigerson','Coel Sigerson','coelsigerosn@outlook.com',null,
  '''+44 7532 687010',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-08-08 23:19'::timestamptz,'Contact was created','2025-08-08 23:19'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Ahmed',null,'Ahmed','ahmedamsiss48@yahoo.com',null,
  null,null,null,array['2 Hours At Canton','1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,'United Kingdom',
  'never_subscribed',false,
  '2023-02-15 17:36'::timestamptz,'Placed an order','2023-02-16 14:47'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Khalid',null,'Khalid','ajleo1382@gmail.com',null,
  '07956587059',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-07-22 11:56'::timestamptz,'Contact was created','2025-07-22 11:56'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'A','Jay','A Jay',null,null,
  '''+44 7407 086089',null,null,array['Wix Contacts Sample 2.csv']::text[],'Contact Import',
  null,null,null,null,
  'unknown',false,
  '2024-12-03 10:05'::timestamptz,'Primary phone number was updated','2024-12-03 10:07'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Kat','Jones (Demo)','Kat Jones (Demo)','kat_demo@wix.com',null,
  null,null,'KJ Fashion',array['Demo Label']::text[],'External App',
  null,null,null,null,
  'never_subscribed',false,
  '2022-08-24 15:42'::timestamptz,'Contact was created','2022-08-24 15:42'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jason','Tugwell','Jason Tugwell','jctugwell@btinternet.com',null,
  '''+44 7488 241440','07488241440',null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-03-02 20:49'::timestamptz,'Placed an order','2026-03-02 20:51'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Chi',null,'Chi','chinwosu.media@gmail.com',null,
  '''+44 7769 720039',null,null,'{}'::text[],'Manual Creation',
  null,null,null,null,
  'never_subscribed',false,
  '2024-10-25 12:21'::timestamptz,'Contact was created','2024-10-25 12:21'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Tyler','Richards','Tyler Richards','tylerrichards@live.co.uk',null,
  '07534043431',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en','Tylorstown','CF43 3HW','United Kingdom',
  'never_subscribed',false,
  '2023-02-08 11:56'::timestamptz,'Placed an order','2023-02-23 13:47'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Tomos','This is why I am contacting you, to produce and mix so I don''t have a spoitfy','Tomos This is why I am contacting you, to produce and mix so I don''t have a spoitfy','tdj648@gmail.com',null,
  null,null,null,array['Donate Now 4']::text[],'Form Submission',
  'cy',null,null,null,
  'never_subscribed',false,
  '2024-09-21 17:56'::timestamptz,'Submitted a form','2024-09-21 17:56'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jjsask',null,'Jjsask','je@djej.xom',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-02-28 12:53'::timestamptz,'Contact was created','2023-02-28 12:53'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Uugh',null,'Uugh','ujhh@jj.com',null,
  null,null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-09-28 14:11'::timestamptz,'Contact was created','2022-09-28 14:11'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Rosie','Seager','Rosie Seager','rosie.seager@thewallich.net',null,
  '07825032041',null,null,array['3 Hours At Cardiff Bay']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-05-02 08:09'::timestamptz,'Opened an email campaign','2025-05-15 16:00'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Oscar','clemas','Oscar clemas','lou.clemas21@gmail.com',null,
  '07814617517',null,null,array['2 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-06-16 21:36'::timestamptz,'Opened an email campaign','2025-07-03 16:25'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Gemma',null,'Gemma','gem.cav@aol.co.uk',null,
  null,null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,'United Kingdom',
  'never_subscribed',false,
  '2023-02-01 12:37'::timestamptz,'Placed an order','2023-02-01 12:37'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Tathan','https://open.spotify.com/artist/02MtYbPPmiILqyRJ8ftJfV?si=XZuNQ03DRXCiQcoViJieoQ','Tathan https://open.spotify.com/artist/02MtYbPPmiILqyRJ8ftJfV?si=XZuNQ03DRXCiQcoViJieoQ','tathanjones@gmail.com',null,
  '07490555227',null,null,array['Donate Now 4','Subscriptions','2 Hours At Canton']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2024-05-13 12:07'::timestamptz,'Contact was created','2024-05-13 12:07'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Lukas',null,'Lukas','gabcolukas21@gmail.com',null,
  '07414437608',null,null,'{}'::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-11-20 16:11'::timestamptz,'Contact was created','2023-11-20 16:11'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Megan Winstone',null,'Megan Winstone','winstonemegan@gmail.com',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-10-17 19:57'::timestamptz,'Submitted a form','2024-10-17 19:57'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Carlos','Charles','Carlos Charles','carloscharlesgraphics@gmail.com',null,
  null,null,null,array['3 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-11-20 11:34'::timestamptz,'Opened an email campaign','2025-11-21 15:01'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Dagrau Tân',null,'Dagrau Tân','gwenda@hedfan.com',null,
  null,null,null,array['Donate Now 4']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-05-23 16:06'::timestamptz,'Submitted a form','2024-05-23 16:09'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Stephen Bellamy',null,'Stephen Bellamy','s.bellamy7@ntlworld.com',null,
  '''+44 29 2065 4916',null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-02-25 18:53'::timestamptz,'Contact was created','2026-02-25 18:53'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Julia','Mayer','Julia Mayer','julia.mayer.email@gmail.com',null,
  '''+44 7397 976371',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-04-06 08:41'::timestamptz,'Booked a session','2025-04-06 08:45'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Pamela',null,'Pamela','pamelalesniak28@gmail.com',null,
  '07405505108',null,null,array['4 Hours At Cardiff Bay','2 Hours At Canton']::text[],'Service Booking',
  'pl',null,null,null,
  'never_subscribed',false,
  '2024-04-10 23:24'::timestamptz,'Contact was created','2024-04-10 23:24'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Andy 8Tray',null,'Andy 8Tray','arprivett@yahoo.co.uk',null,
  '''+44 7952 674241',null,null,array['3 Hours At Cardiff Bay']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-01-27 18:14'::timestamptz,'Opened an email campaign','2026-01-27 18:18'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Rachel','John','Rachel John','racheljohn@nationaltheatrewales.org',null,
  null,null,null,array['9 Hours At Cardiff Bay']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-10-10 09:39'::timestamptz,'Email subscriber status changed to "Never subscribed"','2024-10-10 19:33'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Julia','Wyndham','Julia Wyndham','juliawyndham@hotmail.com',null,
  null,null,null,array['5 Hours At Cardiff Bay']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-01-30 19:38'::timestamptz,'Booked a session','2025-01-30 19:39'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'nsnadinesymonds@gmail.com','nsnadinesymonds@gmail.com',null,
  null,null,null,array['Donate Now 4']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-11-02 18:05'::timestamptz,'Submitted a form','2024-11-02 18:05'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Peter Fieldwalker',null,'Peter Fieldwalker','peterf@unicef.org.uk',null,
  null,null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2026-08-06 14:37'::timestamptz,'Submitted a form','2026-08-06 14:37'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Sammy Sosa',null,'Sammy Sosa','samrhysthomas@icloud.com',null,
  '07399996944',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-10-16 04:24'::timestamptz,'Contact was created','2022-10-16 04:24'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Joubin','Chegounchei','Joubin Chegounchei','joubin.chego11@gmail.com',null,
  '07805087828',null,null,array['4 Hours At Cardiff Bay']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-02-01 13:26'::timestamptz,'Booked a session','2025-02-01 13:32'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Daniel',null,'Daniel','zetdokadope92@gmail.com','ddebek@rocketmail.com',
  null,null,null,array['3 Hours At Cardiff Bay','3 Hours At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-09-24 10:27'::timestamptz,'Placed an order','2025-10-14 16:19'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Souhaib Nourbouh',null,'Souhaib Nourbouh','souhaibnour200@icloud.com',null,
  '''+44 7533 718722',null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-10-17 16:32'::timestamptz,'Contact was created','2025-10-17 16:32'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Rhys','david','Rhys david','rhystd2015@outlook.com',null,
  '447899352345',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en','Llantrisant','CF72 8AY','United Kingdom',
  'never_subscribed',false,
  '2023-01-31 16:58'::timestamptz,'Placed an order','2023-01-31 18:31'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Kaptin Barrett','Museum Wales','Kaptin Barrett Museum Wales','hiphop@museumwales.ac.uk',null,
  null,null,null,array['Donate Now']::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-10-16 10:23'::timestamptz,'Submitted a form','2022-10-16 10:23'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jaylah Coles',null,'Jaylah Coles','jaylcoles05@icloud.com',null,
  '''+44 7463 467715',null,null,'{}'::text[],'Form Submission',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-10-08 15:14'::timestamptz,'Contact was created','2025-10-08 15:14'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  '4hunna',null,'4hunna','imran749281@gmail.com',null,
  '07877776297',null,null,'{}'::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-11-04 15:05'::timestamptz,'Contact was created','2024-11-04 15:05'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Hassan Ghaith',null,'Hassan Ghaith','hassanghaith2518@gmail.com',null,
  '''+44 7508 250201','7508 250201',null,array['2 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-08-14 12:28'::timestamptz,'Placed an order','2024-08-14 12:32'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Nicholas','Da Mota','Nicholas Da Mota','nicpritchard777@icloud.com',null,
  '''+44 7802 562105',null,null,array['4 Hours At Canton']::text[],'Manual Creation',
  'en',null,null,null,
  'never_subscribed',false,
  '2025-09-17 08:57'::timestamptz,'Invoice became overdue','2025-10-17 08:59'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Contact Card',null,'Contact Card','hitmanblu3@gmail.com',null,
  null,null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,'United Kingdom',
  'never_subscribed',false,
  '2023-03-04 13:17'::timestamptz,'Placed an order','2023-03-04 13:17'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'michaelgeorgioucal@yahoo.co.uk','michaelgeorgioucal@yahoo.co.uk',null,
  null,null,null,array['Subscriptions']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2022-11-11 18:09'::timestamptz,'Subscribed to promotional emails','2022-11-18 15:43'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Nathan','Misra','Nathan Misra','info@silkcrayon.com',null,
  null,null,null,'{}'::text[],'Site Members',
  null,null,null,null,
  'never_subscribed',false,
  '2022-08-24 15:43'::timestamptz,'Email campaign bounced','2025-01-08 18:25'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'nathanmisra@gmail.com','nathanmisra@gmail.com',null,
  null,null,null,'{}'::text[],'Manual Creation',
  null,null,null,null,
  'never_subscribed',false,
  '2025-04-15 07:57'::timestamptz,'Opened an email campaign','2025-11-17 17:26'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Tudor','Davies','Tudor Davies','tudorjdavies@gmail.com',null,
  '07534962421',null,null,array['2 Hours At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-05-21 14:04'::timestamptz,'Email campaign sent to this contact','2024-05-21 14:06'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Makario',null,'Makario','makario24thompson@gmail.com',null,
  '07895832898',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2024-12-31 20:03'::timestamptz,'Booked a session','2024-12-31 20:05'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Thomas','scammell','Thomas scammell','scamz2468@gmail.com',null,
  '07984491061',null,null,array['2 Hours At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-04-08 07:09'::timestamptz,'Placed an order','2023-04-08 07:16'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  null,null,'ricardocamara1k@gmail.com','ricardocamara1k@gmail.com',null,
  null,null,null,array['Subscriptions']::text[],'Form Submission',
  'en',null,null,null,
  'subscribed',true,
  '2022-12-30 22:54'::timestamptz,'Subscribed to promotional emails','2022-12-30 22:55'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Jake',null,'Jake','jakeleethomas93@outlook.com',null,
  '07751699276','''+44 7751 699276',null,array['Full Day At Canton (8 Hours)']::text[],'Wix Stores',
  'en',null,'NP12','United Kingdom',
  'never_subscribed',false,
  '2024-12-07 16:20'::timestamptz,'Placed an order','2026-03-10 10:29'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Patrik','Rakas','Patrik Rakas','rakas4471@gmail.com',null,
  '447838172682',null,null,array['1 Hour At Canton']::text[],'Wix Stores',
  'en',null,null,null,
  'never_subscribed',false,
  '2023-05-01 18:21'::timestamptz,'Placed an order','2023-05-01 18:20'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();

insert into public.crm_contacts(
  first_name,last_name,full_name,email,email_2,phone,phone_2,company,labels,source,language,city,postcode,country,
  marketing_status,marketing_consent,wix_created_at,last_activity,last_activity_at
) values (
  'Rhami',null,'Rhami','rhami1980@outlook.com',null,
  '07516053468',null,null,array['1 Hour At Canton']::text[],'Service Booking',
  'en',null,null,null,
  'never_subscribed',false,
  '2022-10-21 15:46'::timestamptz,'Contact was created','2022-10-21 15:46'::timestamptz
)
on conflict (email) do update set
  first_name=coalesce(excluded.first_name,public.crm_contacts.first_name),
  last_name=coalesce(excluded.last_name,public.crm_contacts.last_name),
  full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
  email_2=coalesce(excluded.email_2,public.crm_contacts.email_2),
  phone=coalesce(excluded.phone,public.crm_contacts.phone),
  phone_2=coalesce(excluded.phone_2,public.crm_contacts.phone_2),
  company=coalesce(excluded.company,public.crm_contacts.company),
  labels=(select array(select distinct unnest(public.crm_contacts.labels || excluded.labels))),
  source=coalesce(excluded.source,public.crm_contacts.source),
  marketing_status=case when excluded.marketing_status='subscribed' then 'subscribed' else public.crm_contacts.marketing_status end,
  marketing_consent=public.crm_contacts.marketing_consent or excluded.marketing_consent,
  updated_at=now();


update public.crm_contacts cc
set customer_id=c.id, updated_at=now()
from public.customers c
where cc.email is not null and lower(cc.email)=lower(c.email);

insert into public.crm_contacts(customer_id,full_name,email,phone,marketing_status,marketing_consent,source)
select c.id,c.full_name,lower(c.email),c.phone,
       case when c.marketing_consent then 'subscribed' else 'unknown' end,
       c.marketing_consent,'Silkcrayon OS'
from public.customers c
where not exists(select 1 from public.crm_contacts cc where lower(cc.email)=lower(c.email));


-- V20.2 — Twilio SMS, selectable contact messaging, preferred engineer
alter table public.crm_contacts
  add column if not exists sms_marketing_status text not null default 'unknown',
  add column if not exists sms_marketing_consent boolean not null default false,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

alter table public.crm_contacts drop constraint if exists crm_contacts_sms_marketing_status_check;
alter table public.crm_contacts add constraint crm_contacts_sms_marketing_status_check
  check (sms_marketing_status in ('subscribed','never_subscribed','unsubscribed','unknown'));

create unique index if not exists crm_contacts_unsubscribe_token_idx on public.crm_contacts(unsubscribe_token);
create index if not exists crm_contacts_phone_idx on public.crm_contacts(phone);
create index if not exists crm_contacts_sms_marketing_idx on public.crm_contacts(sms_marketing_status);

alter table public.customers
  add column if not exists sms_service_consent boolean not null default false,
  add column if not exists sms_marketing_consent boolean not null default false,
  add column if not exists preferred_engineer_user_id uuid;

alter table public.bookings
  add column if not exists sms_reminder_consent boolean not null default false,
  add column if not exists preferred_engineer_user_id uuid,
  add column if not exists preferred_engineer_name text;

create or replace function public.sync_customer_to_crm_contacts()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.crm_contacts(
    customer_id,full_name,email,phone,marketing_status,marketing_consent,
    sms_marketing_status,sms_marketing_consent,source,updated_at
  )
  values(
    new.id,new.full_name,lower(new.email),new.phone,
    case when new.marketing_consent then 'subscribed' else 'unknown' end,
    new.marketing_consent,
    case when new.sms_marketing_consent then 'subscribed' else 'unknown' end,
    new.sms_marketing_consent,
    'Silkcrayon OS',now()
  )
  on conflict (email) do update set
    customer_id=excluded.customer_id,
    full_name=coalesce(nullif(excluded.full_name,''),public.crm_contacts.full_name),
    phone=coalesce(excluded.phone,public.crm_contacts.phone),
    marketing_status=case
      when public.crm_contacts.marketing_status='unsubscribed' then 'unsubscribed'
      when excluded.marketing_consent then 'subscribed'
      else public.crm_contacts.marketing_status
    end,
    marketing_consent=case
      when public.crm_contacts.marketing_status='unsubscribed' then false
      else public.crm_contacts.marketing_consent or excluded.marketing_consent
    end,
    sms_marketing_status=case
      when public.crm_contacts.sms_marketing_status='unsubscribed' then 'unsubscribed'
      when excluded.sms_marketing_consent then 'subscribed'
      else public.crm_contacts.sms_marketing_status
    end,
    sms_marketing_consent=case
      when public.crm_contacts.sms_marketing_status='unsubscribed' then false
      else public.crm_contacts.sms_marketing_consent or excluded.sms_marketing_consent
    end,
    updated_at=now();
  return new;
end;
$$;

drop trigger if exists customers_sync_crm_contacts on public.customers;
create trigger customers_sync_crm_contacts
after insert or update of full_name,email,phone,marketing_consent,sms_marketing_consent
on public.customers
for each row execute function public.sync_customer_to_crm_contacts();
