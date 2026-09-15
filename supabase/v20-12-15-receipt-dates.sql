-- Apply once before deploying the patch. Existing dates remain unknown, not invented.
begin;
alter table public.bookings add column if not exists paid_at timestamptz;
create or replace function public.stamp_booking_paid_at() returns trigger
language plpgsql set search_path = public as $$
begin
 if new.payment_status = 'paid' and new.paid_at is null then
  if TG_OP = 'INSERT' then
   new.paid_at := now();
  elsif old.payment_status is distinct from 'paid' and old.payment_status not in ('part_refunded','refunded') then
   new.paid_at := now();
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists bookings_stamp_paid_at on public.bookings;
create trigger bookings_stamp_paid_at before insert or update of payment_status
on public.bookings for each row execute function public.stamp_booking_paid_at();
commit;
