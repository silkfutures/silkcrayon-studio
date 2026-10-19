-- Apply after v20-12-39; run BEFORE deploying the updated programme code.
-- Existing agreements stay at £30/2h minimum/8h monthly; engineer defaults affect new approvals only.
begin;
alter table public.staff_profiles add column if not exists supported_hourly_price_pence integer not null default 3000 check(supported_hourly_price_pence between 100 and 100000);
alter table public.supported_artists add column if not exists hourly_price_pence integer not null default 3000 check(hourly_price_pence between 100 and 100000);
alter table public.supported_artists add column if not exists monthly_limit_minutes integer not null default 480 check(monthly_limit_minutes between 60 and 4800 and monthly_limit_minutes%60=0);
alter table public.supported_artists add column if not exists min_duration_minutes integer not null default 120 check(min_duration_minutes between 60 and 480 and min_duration_minutes%60=0);
alter table public.bookings add column if not exists supported_hourly_price_pence integer;
update public.bookings set supported_hourly_price_pence=round(amount_pence::numeric*60/nullif(duration_minutes,0)) where supported_artist_id is not null and supported_hourly_price_pence is null;
create table if not exists public.supported_artist_events (
 id uuid primary key default gen_random_uuid(), supported_artist_id uuid not null references public.supported_artists(id),
 engineer_user_id uuid references auth.users(id), actor_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(), event_type text not null, details jsonb not null
);
create index if not exists supported_events_by_programme on public.supported_artist_events(supported_artist_id,created_at);
alter table public.supported_artist_events enable row level security;
revoke all on public.supported_artist_events from anon,authenticated;
grant all on public.supported_artist_events to service_role;
create or replace function public.log_supported_artist_change() returns trigger language plpgsql security definer set search_path=public as $$
declare after_terms jsonb; before_terms jsonb;
begin
 if new.monthly_limit_minutes<new.min_duration_minutes then raise exception 'Monthly allowance must cover the minimum session.'; end if;
 after_terms=jsonb_build_object('status',new.status,'engineer_user_id',new.engineer_user_id,'hourly_price_pence',new.hourly_price_pence,'monthly_limit_minutes',new.monthly_limit_minutes,'min_duration_minutes',new.min_duration_minutes,'starts_on',new.starts_on,'ends_on',new.ends_on,'weekdays',new.weekdays,'start_time',new.start_time,'end_time',new.end_time);
 if tg_op='UPDATE' then
 before_terms=jsonb_build_object('status',old.status,'engineer_user_id',old.engineer_user_id,'hourly_price_pence',old.hourly_price_pence,'monthly_limit_minutes',old.monthly_limit_minutes,'min_duration_minutes',old.min_duration_minutes,'starts_on',old.starts_on,'ends_on',old.ends_on,'weekdays',old.weekdays,'start_time',old.start_time,'end_time',old.end_time);
 if before_terms=after_terms then return new; end if;
 end if;
 insert into public.supported_artist_events(supported_artist_id,engineer_user_id,actor_user_id,event_type,details)
 values(new.id,new.engineer_user_id,new.reviewed_by,case when tg_op='INSERT' then 'application' else 'programme_updated' end,jsonb_build_object('before',before_terms,'after',after_terms));
 return new;
end $$;
drop trigger if exists supported_artist_history on public.supported_artists;
create trigger supported_artist_history after insert or update on public.supported_artists for each row execute function public.log_supported_artist_change();
revoke all on function public.log_supported_artist_change() from public,anon,authenticated;
create or replace function public.reserve_supported_booking_v2(
 p_membership_id uuid,p_customer_id uuid,p_expected_rate_pence integer,p_booking_date date,p_start_time time,p_end_time time,
 p_duration_minutes integer,p_genre text,p_notes text,p_harmful_music_policy_accepted boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare m public.supported_artists; used integer; result uuid; engineer_name text;
begin
 select * into m from public.supported_artists where id=p_membership_id for update;
 if not found or m.status<>'approved' or m.customer_id<>p_customer_id or
   (now() at time zone 'Europe/London')::date not between m.starts_on and m.ends_on or
   p_booking_date not between m.starts_on and m.ends_on then raise exception 'Programme access is not active for this date.'; end if;
 if p_expected_rate_pence is distinct from m.hourly_price_pence then raise exception 'Your programme rate changed. Refresh the booking page before paying.'; end if;
 if p_duration_minutes<m.min_duration_minutes or p_duration_minutes not in (60,120,180,240,300,360,420,480) or
   extract(epoch from (p_end_time-p_start_time))/60<>p_duration_minutes or
   not (extract(dow from p_booking_date)::integer=any(m.weekdays)) or
   p_start_time<m.start_time or p_end_time>m.end_time or p_end_time<=p_start_time or
   not p_harmful_music_policy_accepted then raise exception 'Choose an eligible programme slot (check your agreed minimum duration).'; end if;
 select coalesce(s.engineer_name,s.full_name) into engineer_name from public.staff_profiles s where user_id=m.engineer_user_id and active and role in ('owner','engineer');
 if engineer_name is null then raise exception 'Your programme engineer is currently unavailable. Contact the studio.'; end if;
 select coalesce(sum(duration_minutes),0) into used from public.bookings
 where supported_artist_id=m.id and date_trunc('month',booking_date)=date_trunc('month',p_booking_date)
 and status<>'cancelled' and (status<>'pending' or hold_expires_at is null or hold_expires_at>now());
 if used+p_duration_minutes>m.monthly_limit_minutes then raise exception 'This booking would exceed your calendar-month allowance. Pending checkouts hold hours for 30 minutes.'; end if;
 result:=public.reserve_booking(p_customer_id,'vocal-recording','Supported Artist · Studio session',p_booking_date,p_start_time,p_end_time,p_duration_minutes,p_genre,p_notes,round(p_duration_minutes::numeric/60*m.hourly_price_pence)::integer,now()+interval '30 minutes',true);
 update public.bookings set supported_artist_id=m.id,supported_hourly_price_pence=m.hourly_price_pence,engineer_user_id=m.engineer_user_id,assigned_engineer=engineer_name,
 preferred_engineer_user_id=m.engineer_user_id,preferred_engineer_name=engineer_name where id=result;
 return result;
end $$;
revoke all on function public.reserve_supported_booking_v2(uuid,uuid,integer,date,time,time,integer,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_supported_booking_v2(uuid,uuid,integer,date,time,time,integer,text,text,boolean) to service_role;


create or replace function public.reserve_supported_booking(
 p_membership_id uuid,p_customer_id uuid,p_booking_date date,p_start_time time,p_end_time time,
 p_duration_minutes integer,p_genre text,p_notes text,p_harmful_music_policy_accepted boolean
) returns uuid language plpgsql security definer set search_path=public as $$
begin raise exception 'Programme booking has been updated. Please refresh after the website deployment completes.'; end $$;
commit;
