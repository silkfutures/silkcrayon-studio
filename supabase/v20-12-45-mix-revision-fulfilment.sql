create or replace function public.fulfil_mix_extra_revision(p_order_id uuid,p_session_id text,p_amount integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_job uuid;
begin
 update mix_extra_revision_orders set status='paid',paid_at=now()
 where id=p_order_id and status='pending' and checkout_session_id=p_session_id and amount_pence=p_amount returning mix_job_id into v_job;
 if v_job is null then return false; end if;
 update mix_jobs set extra_revisions_paid=extra_revisions_paid+1,updated_at=now() where id=v_job;
 return true;
end $$;
revoke all on function public.fulfil_mix_extra_revision(uuid,text,integer) from public,anon,authenticated;
