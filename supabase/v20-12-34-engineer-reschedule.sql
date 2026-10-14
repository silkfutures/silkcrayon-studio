-- Apply before deploying. Shares the day lock used by reserve_booking.
create or replace function public.staff_reschedule_booking_locked(p_booking_id uuid,p_actor_id uuid,p_date date,p_start time,p_expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings%rowtype; actor_role text; finish time;
begin
 select role into actor_role from public.staff_profiles where user_id=p_actor_id and active=true;
 if actor_role is null or actor_role not in ('owner','engineer') then raise exception 'not_assigned'; end if;
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'booking_changed'; end if;
 if actor_role='engineer' and b.engineer_user_id is distinct from p_actor_id then raise exception 'not_assigned'; end if;
 if b.updated_at is distinct from p_expected_updated_at then raise exception 'booking_changed'; end if;
 if b.status not in ('pending','confirmed') or (b.status='pending' and b.hold_expires_at<=now()) then raise exception 'inactive_booking'; end if;
 if (p_date+p_start) at time zone 'Europe/London' <= now() then raise exception 'slot_unavailable'; end if;
 if p_start<time '10:00' or p_start+b.duration_minutes*interval '1 minute'>time '21:00' then raise exception 'slot_unavailable'; end if;
 finish:=p_start+b.duration_minutes*interval '1 minute';
 perform pg_advisory_xact_lock(hashtext(p_date::text));
 if exists(select 1 from public.blockouts x where x.booking_date=p_date and not (b.service_slug=any(coalesce(x.ignored_service_slugs,'{}'::text[]))) and p_start<x.end_time and finish>x.start_time) then raise exception 'slot_unavailable'; end if;
 if exists(select 1 from public.bookings x where x.id<>b.id and x.booking_date=p_date and x.status in ('pending','confirmed') and (x.status='confirmed' or x.hold_expires_at is null or x.hold_expires_at>now()) and p_start<x.end_time and finish>x.start_time) then raise exception 'slot_unavailable'; end if;
 update public.bookings set booking_date=p_date,start_time=p_start,end_time=finish,updated_at=now() where id=b.id;
end;$$;
revoke all on function public.staff_reschedule_booking_locked(uuid,uuid,date,time,timestamptz) from public,anon,authenticated;
grant execute on function public.staff_reschedule_booking_locked(uuid,uuid,date,time,timestamptz) to service_role;
