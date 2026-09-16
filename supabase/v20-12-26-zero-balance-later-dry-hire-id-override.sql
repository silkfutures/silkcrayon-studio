-- Silkcrayon Studio OS V20.12.26
-- Allow an owner to waive Dry Hire ID verification per booking.

begin;

alter table public.bookings
  add column if not exists dry_hire_id_required boolean not null default true;

comment on column public.bookings.dry_hire_id_required is
  'Whether this individual Dry Hire booking requires lead-hirer ID verification. Owner-created bookings may explicitly waive it.';

notify pgrst, 'reload schema';
commit;
