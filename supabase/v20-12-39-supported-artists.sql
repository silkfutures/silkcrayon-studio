-- Run once in the Supabase SQL editor before deploying this patch.
begin;
create table if not exists public.supported_artists (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 email text not null unique check(email=lower(email)),
 full_name text not null, artist_name text not null, genre text not null,
 music_links text not null, goals text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','paused')),
 customer_id uuid references public.customers(id),
 engineer_user_id uuid references auth.users(id),
 starts_on date, ends_on date,
 weekdays integer[] not null default array[1,2,3,4,5],
 start_time time not null default '10:00', end_time time not null default '17:00',
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 check(start_time<end_time),
 check(cardinality(weekdays)>0 and weekdays <@ array[0,1,2,3,4,5,6]),
 check(status<>'approved' or (customer_id is not null and engineer_user_id is not null and starts_on is not null and ends_on>=starts_on))
);
create unique index if not exists supported_artist_customer_unique on public.supported_artists(customer_id) where customer_id is not null;
alter table public.supported_artists enable row level security;
revoke all on public.supported_artists from anon,authenticated;
grant all on public.supported_artists to service_role;
alter table public.bookings add column if not exists supported_artist_id uuid references public.supported_artists(id);
create index if not exists supported_booking_usage on public.bookings(supported_artist_id,booking_date);

create or replace function public.reserve_supported_booking(
 p_membership_id uuid,p_customer_id uuid,p_booking_date date,p_start_time time,p_end_time time,
 p_duration_minutes integer,p_genre text,p_notes text,p_harmful_music_policy_accepted boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare m public.supported_artists; used integer; result uuid; engineer_name text;
begin
 select * into m from public.supported_artists where id=p_membership_id for update;
 if not found or m.status<>'approved' or m.customer_id<>p_customer_id or
   (now() at time zone 'Europe/London')::date not between m.starts_on and m.ends_on or
   p_booking_date not between m.starts_on and m.ends_on then raise exception 'Programme access is not active for this date.'; end if;
 if p_duration_minutes not in (120,180,240,300,360,420,480) or
   extract(epoch from (p_end_time-p_start_time))/60<>p_duration_minutes or
   not (extract(dow from p_booking_date)::integer=any(m.weekdays)) or
   p_start_time<m.start_time or p_end_time>m.end_time or p_end_time<=p_start_time or
   not p_harmful_music_policy_accepted then raise exception 'Choose an eligible programme slot (minimum two hours).'; end if;
 select coalesce(s.engineer_name,s.full_name) into engineer_name from public.staff_profiles s where user_id=m.engineer_user_id and active and role in ('owner','engineer');
 if engineer_name is null then raise exception 'Your programme engineer is currently unavailable. Contact the studio.'; end if;
 select coalesce(sum(duration_minutes),0) into used from public.bookings
 where supported_artist_id=m.id and date_trunc('month',booking_date)=date_trunc('month',p_booking_date)
 and status<>'cancelled' and (status<>'pending' or hold_expires_at is null or hold_expires_at>now());
 if used+p_duration_minutes>480 then raise exception 'This booking would exceed your eight-hour calendar-month allowance. Pending checkouts hold hours for 30 minutes.'; end if;
 result:=public.reserve_booking(p_customer_id,'vocal-recording','Supported Artist · Studio session',p_booking_date,p_start_time,p_end_time,p_duration_minutes,p_genre,p_notes,p_duration_minutes*50,now()+interval '30 minutes',true);
 update public.bookings set supported_artist_id=m.id,engineer_user_id=m.engineer_user_id,assigned_engineer=engineer_name,
 preferred_engineer_user_id=m.engineer_user_id,preferred_engineer_name=engineer_name where id=result;
 return result;
end $$;
revoke all on function public.reserve_supported_booking(uuid,uuid,date,time,time,integer,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_supported_booking(uuid,uuid,date,time,time,integer,text,text,boolean) to service_role;

-- Prevent existing rescheduling paths moving discounted bookings outside their allowance.
-- Cancel/refund under the usual policy, then make a fresh eligible programme booking.
create or replace function public.protect_supported_booking() returns trigger language plpgsql as $$
begin
 if old.supported_artist_id is not null and (
 new.booking_date is distinct from old.booking_date or new.start_time is distinct from old.start_time or
 new.end_time is distinct from old.end_time or new.duration_minutes is distinct from old.duration_minutes or
 new.customer_id is distinct from old.customer_id or new.supported_artist_id is distinct from old.supported_artist_id or
 (old.status='cancelled' and new.status<>'cancelled')) then
 raise exception 'Programme bookings require cancellation and a fresh eligible booking to change the session. Contact the studio.';
 end if;
 return new;
end $$;
drop trigger if exists protect_supported_booking on public.bookings;
create trigger protect_supported_booking before update on public.bookings for each row execute function public.protect_supported_booking();
commit;
