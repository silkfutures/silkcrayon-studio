-- One recorded bank payment clears an exact, immutable list of engineer jobs.
create table if not exists public.engineer_payment_batches (
 id uuid primary key default gen_random_uuid(),
 engineer_user_id uuid not null references auth.users(id),
 engineer_name text not null,
 reference text not null check(length(reference) between 1 and 100),
 amount_pence integer not null check(amount_pence>0),
 paid_on date not null,
 items jsonb not null,
 selection jsonb not null,
 recorded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(engineer_user_id,reference)
);
alter table public.engineer_payment_batches enable row level security;
revoke all on public.engineer_payment_batches from anon,authenticated;
grant all on public.engineer_payment_batches to service_role;

create or replace function public.record_engineer_payment_batch(p_engineer uuid,p_reference text,p_paid_on date,p_amount integer,p_items jsonb,p_actor uuid)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 batch public.engineer_payment_batches; engineer public.staff_profiles;
 b public.bookings; m public.mix_jobs; ep public.engineer_payouts; mp public.mix_engineer_payouts;
 item jsonb; result_items jsonb:='[]'; selection_sorted jsonb;
 source_id uuid; fee integer; total integer:=0; descr text; service_day date; batch_id uuid;
begin
 if not exists(select 1 from public.staff_profiles where user_id=p_actor and role='owner' and active=true) then raise exception 'Owner access required'; end if;
 if p_reference is null or length(trim(p_reference)) not between 1 and 100 or p_paid_on is null or p_paid_on>current_date or p_amount is null or p_amount<=0 then raise exception 'Enter a payment reference, past payment date and positive amount'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Select 1–100 jobs'; end if;
 if (select count(*) from jsonb_array_elements(p_items))<>(select count(distinct value) from jsonb_array_elements(p_items)) then raise exception 'Duplicate jobs'; end if;
 select jsonb_agg(value order by value->>'type',value->>'id') into selection_sorted from jsonb_array_elements(p_items);
 perform pg_advisory_xact_lock(hashtextextended(p_engineer::text,0));
 select * into batch from public.engineer_payment_batches where engineer_user_id=p_engineer and reference=trim(p_reference);
 if found then
  if batch.amount_pence<>p_amount or batch.paid_on<>p_paid_on or batch.selection<>selection_sorted then raise exception 'This reference is already used for another payment'; end if;
  return batch.id;
 end if;
 select * into engineer from public.staff_profiles where user_id=p_engineer and role='engineer';
 if not found then raise exception 'Engineer not found'; end if;
 for item in select value from jsonb_array_elements(selection_sorted) loop
  source_id:=(item->>'id')::uuid;
  if item->>'type' in ('booking','payout') then
   ep:=null; b:=null;
   if item->>'type'='booking' then
    select * into b from public.bookings where id=source_id for update;
    if b.id is null or b.engineer_user_id is distinct from p_engineer or b.status in ('cancelled','no_show') then raise exception 'Session is no longer assigned to this engineer'; end if;
    select * into ep from public.engineer_payouts where booking_id=b.id and kind='session' and status<>'cancelled' for update;
    if ep.id is null then
     fee:=coalesce(b.engineer_fee_pence,round(b.duration_minutes*coalesce(b.engineer_pay_hourly_pence,engineer.engineer_pay_hourly_pence)/60.0)::integer);
     if b.service_slug='dry-hire' and b.engineer_fee_pence is null then raise exception 'Set an agreed dry-hire fee first'; end if;
     if fee is null or fee<=0 then raise exception 'Set the session fee first'; end if;
     insert into public.engineer_payouts(booking_id,engineer_user_id,engineer_name,kind,hours,hourly_pence,amount_pence,status,funding_source,release_after)
     values(b.id,p_engineer,coalesce(engineer.engineer_name,engineer.full_name),'session',b.duration_minutes/60.0,b.engineer_pay_hourly_pence,fee,'needs_approval','off_stripe',now()) returning * into ep;
    end if;
   else
    select * into ep from public.engineer_payouts where id=source_id for update;
    select * into b from public.bookings where id=ep.booking_id;
   end if;
   if ep.id is null or ep.engineer_user_id is distinct from p_engineer or ep.status in ('paid','cancelled','processing') or ep.stripe_transfer_id is not null or ep.paid_via is not null then raise exception 'A selected session is already paid or being processed'; end if;
   if ep.attempts>0 then raise exception 'Reconcile the earlier Stripe attempt before recording a bank payment'; end if;
   fee:=ep.amount_pence; service_day:=coalesce(b.booking_date,p_paid_on);
   descr:=concat(case when ep.kind='extra_time' then 'Extra time' else 'Session' end,' · ',coalesce((select coalesce(artist_name,full_name) from customers where id=b.customer_id),b.service_name,'Studio work'),' · ',coalesce(ep.hours,b.duration_minutes/60.0),'h');
   update public.engineer_payouts set status='paid',paid_via='outside_stripe',paid_at=p_paid_on::timestamptz,paid_outside_note=trim(p_reference),marked_paid_by_user_id=p_actor,next_attempt_at=null,last_error=null,updated_at=now() where id=ep.id;
   source_id:=ep.id;
  elsif item->>'type'='mix' then
   select * into m from public.mix_jobs where id=source_id for update;
   if m.id is null or m.engineer_user_id is distinct from p_engineer then raise exception 'Mix is no longer assigned to this engineer'; end if;
   insert into public.mix_engineer_payouts(mix_job_id,engineer_user_id,amount_pence,status) values(m.id,p_engineer,m.engineer_fee_pence,'needs_approval') on conflict(mix_job_id) do nothing;
   select * into mp from public.mix_engineer_payouts where mix_job_id=m.id for update;
   if mp.engineer_user_id is distinct from p_engineer or mp.status in ('paid','processing') or mp.stripe_transfer_id is not null or mp.paid_via is not null then raise exception 'A selected mix is already paid or being processed'; end if;
   if mp.status='failed' then raise exception 'Reconcile the earlier Stripe attempt before recording a bank payment'; end if;
   fee:=mp.amount_pence; service_day:=m.created_at::date; descr:=concat('Mix · ',m.track_title);
   update public.mix_engineer_payouts set status='paid',paid_via='outside_stripe',paid_at=p_paid_on::timestamptz,paid_outside_note=trim(p_reference),marked_paid_by_user_id=p_actor,error=null where mix_job_id=m.id;
  else raise exception 'Unknown job type'; end if;
  if fee is null or fee<=0 then raise exception 'Every job must have a positive agreed fee'; end if;
  total:=total+fee;
  result_items:=result_items||jsonb_build_array(jsonb_build_object('type',case when item->>'type'='mix' then 'mix' else 'payout' end,'id',source_id,'description',descr,'date',service_day,'amount_pence',fee));
 end loop;
 if total<>p_amount then raise exception 'Selected job total differs from the recorded payment'; end if;
 insert into public.engineer_payment_batches(engineer_user_id,engineer_name,reference,amount_pence,paid_on,items,selection,recorded_by)
 values(p_engineer,coalesce(engineer.engineer_name,engineer.full_name),trim(p_reference),total,p_paid_on,result_items,selection_sorted,p_actor) returning id into batch_id;
 return batch_id;
end;
$$;
revoke all on function public.record_engineer_payment_batch(uuid,text,date,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.record_engineer_payment_batch(uuid,text,date,integer,jsonb,uuid) to service_role;
