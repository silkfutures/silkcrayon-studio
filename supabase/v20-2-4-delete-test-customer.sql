-- V20.2.4 — robust test customer deletion
create or replace function public.delete_test_customer(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_email text;
  v_booking_count integer;
begin
  select email into v_email from public.customers where id=p_customer_id for update;
  if v_email is null then raise exception 'customer_not_found'; end if;

  if exists(select 1 from public.bookings where customer_id=p_customer_id and coalesce(amount_pence,0)>100)
    then raise exception 'real_booking_exists'; end if;

  if exists(select 1 from public.bookings where customer_id=p_customer_id and payment_status in ('paid','part_refunded'))
    then raise exception 'paid_test_booking_exists'; end if;

  select count(*) into v_booking_count from public.bookings where customer_id=p_customer_id;

  delete from public.bookings where customer_id=p_customer_id;
  delete from public.crm_contacts where customer_id=p_customer_id or lower(email)=lower(v_email);
  delete from public.customers where id=p_customer_id;

  if exists(select 1 from public.customers where id=p_customer_id)
    then raise exception 'customer_delete_failed'; end if;

  return jsonb_build_object('ok',true,'customer_id',p_customer_id,'email',v_email,'bookings_deleted',v_booking_count);
end;
$$;

revoke all on function public.delete_test_customer(uuid) from public, anon, authenticated;
