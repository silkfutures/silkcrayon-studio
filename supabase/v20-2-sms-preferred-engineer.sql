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
