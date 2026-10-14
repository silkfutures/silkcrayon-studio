-- Apply before deploying overnight engineer booking support.
-- Guard every booking write, including reservations, credit bookings and reschedules.
begin;
create or replace function public.guard_studio_booking_overlap()
returns trigger language plpgsql security definer set search_path=public as $$
declare starts timestamp; finishes timestamp;
begin
 if new.status not in ('pending','confirmed') then return new; end if;
 if new.status='pending' and new.hold_expires_at is not null and new.hold_expires_at<=now() then return new; end if;
 if tg_op='UPDATE' then
  if new.booking_date is not distinct from old.booking_date and new.start_time is not distinct from old.start_time
   and new.end_time is not distinct from old.end_time and new.duration_minutes is not distinct from old.duration_minutes
   and new.status is not distinct from old.status and new.hold_expires_at is not distinct from old.hold_expires_at
   and new.service_slug is not distinct from old.service_slug then return new; end if;
 end if;
 -- One shared lock protects overlapping bookings that start on different dates.
 perform pg_advisory_xact_lock(hashtext('studio:overnight-occupancy'));
 starts:=new.booking_date+new.start_time;
 finishes:=starts+new.duration_minutes*interval '1 minute';
 if new.end_time is distinct from finishes::time then raise exception 'invalid_booking_end_time'; end if;
 if exists(select 1 from public.bookings b where b.id is distinct from new.id
  and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now())
  and starts<(b.booking_date+b.start_time+b.duration_minutes*interval '1 minute')
  and finishes>(b.booking_date+b.start_time)) then raise exception 'slot_unavailable'; end if;
 if exists(select 1 from public.blockouts b
  where not (new.service_slug=any(coalesce(b.ignored_service_slugs,'{}'::text[])))
  and starts<(b.booking_date+b.end_time+case when b.end_time<=b.start_time then interval '1 day' else interval '0 days' end)
  and finishes>(b.booking_date+b.start_time)) then raise exception 'slot_unavailable'; end if;
 return new;
end;$$;
revoke all on function public.guard_studio_booking_overlap() from public,anon,authenticated;
drop trigger if exists studio_booking_overlap_guard on public.bookings;
create trigger studio_booking_overlap_guard before insert or update on public.bookings
for each row execute function public.guard_studio_booking_overlap();
commit;
