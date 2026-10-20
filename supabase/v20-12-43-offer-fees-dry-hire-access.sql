-- Silkcrayon Studio OS v20.12.43 — custom offer fees + dry-hire "open & close" offers.
-- Apply AFTER v20-12-42-engineer-offers-payouts.sql. Safe to re-run.
begin;

-- A flat fee is a fixed job price (custom amount or dry-hire access): it is paid as agreed,
-- without hour-based extra-time or short-session checks.
alter table public.engineer_session_offers add column if not exists fee_is_flat boolean not null default false;
alter table public.bookings add column if not exists engineer_fee_flat boolean not null default false;

-- "Everyone at once" offers: several live offers per booking; first valid accept wins (enforced in accept_engineer_offer).
alter table public.engineer_session_offers add column if not exists round_mode text not null default 'sequential';
alter table public.engineer_session_offers drop constraint if exists engineer_session_offers_round_mode_check;
alter table public.engineer_session_offers add constraint engineer_session_offers_round_mode_check check (round_mode in ('sequential','broadcast'));
drop index if exists public.engineer_offers_one_live_uidx;
create unique index if not exists engineer_offers_one_live_per_engineer_uidx on public.engineer_session_offers(booking_id,engineer_user_id) where status='sent';

insert into public.studio_settings(key,value) values ('engineer_dry_hire_access_fee_pence','2000')
on conflict (key) do nothing;

create or replace function public.accept_engineer_offer(p_offer_id uuid,p_engineer_user_id uuid,p_via text default 'email')
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.engineer_session_offers; b public.bookings; eng_name text;
begin
 -- Lock the booking first, then the offer: simultaneous accepts on different offers for the same
 -- session queue on the booking row (no deadlock); the second sees its offer already closed.
 select * into o from public.engineer_session_offers where id=p_offer_id;
 if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
 select * into b from public.bookings where id=o.booking_id for update;
 select * into o from public.engineer_session_offers where id=p_offer_id for update;
 if o.engineer_user_id is distinct from p_engineer_user_id then return jsonb_build_object('ok',false,'reason','not_yours'); end if;
 if o.status<>'sent' then return jsonb_build_object('ok',false,'reason','closed','status',o.status); end if;
 if o.expires_at is not null and o.expires_at<=now() then
  update public.engineer_session_offers set status='expired',close_reason='Response window ended',updated_at=now() where id=o.id;
  return jsonb_build_object('ok',false,'reason','expired');
 end if;
 if b.status not in ('pending','confirmed') then
  update public.engineer_session_offers set status='cancelled',close_reason='Booking no longer active',updated_at=now() where id=o.id;
  return jsonb_build_object('ok',false,'reason','booking_inactive');
 end if;
 if o.booking_date is distinct from b.booking_date or o.start_time is distinct from b.start_time or o.end_time is distinct from b.end_time then
  update public.engineer_session_offers set status='cancelled',close_reason='Booking time changed after the offer was sent',updated_at=now() where id=o.id;
  return jsonb_build_object('ok',false,'reason','booking_changed');
 end if;
 if b.engineer_user_id is not null and b.engineer_user_id<>o.engineer_user_id then
  update public.engineer_session_offers set status='cancelled',close_reason='Another engineer was assigned',updated_at=now() where id=o.id;
  return jsonb_build_object('ok',false,'reason','already_assigned');
 end if;
 select coalesce(engineer_name,full_name) into eng_name from public.staff_profiles where user_id=o.engineer_user_id and active;
 if eng_name is null then return jsonb_build_object('ok',false,'reason','engineer_inactive'); end if;
 update public.engineer_session_offers set status='accepted',responded_at=now(),response_via=p_via,updated_at=now() where id=o.id;
 update public.engineer_session_offers set status='cancelled',close_reason='Session accepted by '||eng_name,updated_at=now()
  where booking_id=o.booking_id and id<>o.id and status in ('queued','sent');
 update public.bookings set engineer_user_id=o.engineer_user_id,assigned_engineer=eng_name,engineer_offer_status='accepted',
  engineer_accepted_at=now(),engineer_pay_hourly_pence=o.pay_hourly_pence,engineer_fee_pence=o.fee_pence,engineer_fee_flat=o.fee_is_flat,updated_at=now()
  where id=o.booking_id;
 return jsonb_build_object('ok',true,'booking_id',o.booking_id);
end $$;
revoke all on function public.accept_engineer_offer(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.accept_engineer_offer(uuid,uuid,text) to service_role;

commit;
