-- Stage 3I-C-B: secure escalation acknowledgement, resolution and staff inbox RPCs.
-- All client access is through scoped SECURITY DEFINER functions. No external messages are sent.

create or replace function public.get_my_department_task_notifications(p_clinic_id uuid,p_limit integer default 50,p_unread_only boolean default false)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_uid uuid:=auth.uid(); v_items jsonb;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_clinic_id is null then raise exception 'Clinic is required' using errcode='22023'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'Notification limit must be between 1 and 100' using errcode='22023'; end if;
 if not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active') then
  raise exception 'Active hospital membership required' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(x.item order by x.created_at desc),'[]'::jsonb) into v_items
 from (
  select jsonb_build_object('id',n.id,'escalation_id',n.escalation_id,'type',n.notification_type,
   'title',n.title,'message',n.message,'status',n.delivery_status,'created_at',n.created_at,
   'delivered_at',n.delivered_at,'read_at',n.read_at,'metadata',n.metadata) item,n.created_at
  from public.department_task_notifications n
  where n.clinic_id=p_clinic_id and n.recipient_user_id=v_uid and (not p_unread_only or n.read_at is null)
  order by n.created_at desc limit p_limit
 ) x;
 return jsonb_build_object('clinic_id',p_clinic_id,'notifications',v_items,
  'unread_count',(select count(*) from public.department_task_notifications n where n.clinic_id=p_clinic_id and n.recipient_user_id=v_uid and n.read_at is null),
  'generated_at',now());
end;$function$;

create or replace function public.mark_department_task_notification_read(p_clinic_id uuid,p_notification_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_uid uuid:=auth.uid(); v_read_at timestamptz:=now();
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_clinic_id is null or p_notification_id is null then raise exception 'Clinic and notification are required' using errcode='22023'; end if;
 if not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active') then
  raise exception 'Active hospital membership required' using errcode='42501';
 end if;
 update public.department_task_notifications n set read_at=coalesce(n.read_at,v_read_at),updated_at=v_read_at
 where n.id=p_notification_id and n.clinic_id=p_clinic_id and n.recipient_user_id=v_uid;
 if not found then raise exception 'Notification not found in your inbox' using errcode='P0002'; end if;
 return jsonb_build_object('success',true,'notification_id',p_notification_id,'read_at',v_read_at);
end;$function$;

create or replace function public.acknowledge_department_task_escalation(p_clinic_id uuid,p_escalation_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 v_uid uuid:=auth.uid(); v_escalation public.department_task_escalations%rowtype;
 v_is_admin boolean:=false; v_profile_id uuid; v_now timestamptz:=now(); v_authorised boolean:=false;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_clinic_id is null or p_escalation_id is null then raise exception 'Clinic and escalation are required' using errcode='22023'; end if;
 if length(coalesce(p_notes,''))>2000 then raise exception 'Notes exceed 2000 characters' using errcode='22023'; end if;
 if not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active') then
  raise exception 'Active hospital membership required' using errcode='42501';
 end if;
 select exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' and cm.role in ('owner','admin')) into v_is_admin;
 select sp.id into v_profile_id from public.staff_profiles sp where sp.clinic_id=p_clinic_id and sp.user_id=v_uid and sp.employment_status='active' limit 1;
 select * into v_escalation from public.department_task_escalations e where e.id=p_escalation_id and e.clinic_id=p_clinic_id for update;
 if not found then raise exception 'Escalation not found in this hospital' using errcode='P0002'; end if;
 v_authorised:=v_is_admin
  or exists(select 1 from public.staff_tasks t join public.staff_department_assignments a on a.id=t.assigned_to_assignment_id and a.clinic_id=t.clinic_id
   where t.id=v_escalation.task_id and t.clinic_id=p_clinic_id and a.supervisor_staff_profile_id=v_profile_id
    and a.assignment_status='active' and a.effective_from<=current_date and (a.effective_to is null or a.effective_to>=current_date))
  or exists(select 1 from public.staff_department_assignments ma0 join public.clinic_management_assignments ma
   on ma.manager_assignment_id=ma0.id and ma.clinic_id=ma0.clinic_id
   where ma0.clinic_id=p_clinic_id and ma0.staff_profile_id=v_profile_id and ma.department_id=v_escalation.department_id
    and (ma.unit_id is null or ma.unit_id=v_escalation.unit_id) and ma.assignment_status in ('active','delegated')
    and ma.effective_from<=current_date and (ma.effective_to is null or ma.effective_to>=current_date)
    and ma0.assignment_status='active' and ma0.effective_from<=current_date and (ma0.effective_to is null or ma0.effective_to>=current_date));
 if not v_authorised then raise exception 'Supervisor, appointed manager or hospital administrator access required' using errcode='42501'; end if;
 if v_escalation.status in ('resolved','dismissed') then raise exception 'Closed escalations cannot be acknowledged' using errcode='22023'; end if;
 if v_escalation.status='acknowledged' then return jsonb_build_object('success',true,'escalation_id',p_escalation_id,'status','acknowledged','already_acknowledged',true,'acknowledged_at',v_escalation.acknowledged_at); end if;
 update public.department_task_escalations set status='acknowledged',acknowledged_by_user_id=v_uid,acknowledged_at=v_now,updated_at=v_now
 where id=p_escalation_id and clinic_id=p_clinic_id;
 insert into public.department_task_escalation_events(clinic_id,escalation_id,actor_user_id,action_key,event_notes,metadata,created_at)
 values(p_clinic_id,p_escalation_id,v_uid,'acknowledged',nullif(btrim(coalesce(p_notes,'')),''),
  jsonb_build_object('actor_profile_id',v_profile_id),v_now);
 return jsonb_build_object('success',true,'escalation_id',p_escalation_id,'status','acknowledged','acknowledged_at',v_now);
end;$function$;

create or replace function public.resolve_department_task_escalation(p_clinic_id uuid,p_escalation_id uuid,p_resolution_notes text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 v_uid uuid:=auth.uid(); v_escalation public.department_task_escalations%rowtype;
 v_is_admin boolean:=false; v_profile_id uuid; v_now timestamptz:=now(); v_authorised boolean:=false;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_clinic_id is null or p_escalation_id is null then raise exception 'Clinic and escalation are required' using errcode='22023'; end if;
 if length(btrim(coalesce(p_resolution_notes,''))) not between 5 and 2000 then raise exception 'Resolution notes must be between 5 and 2000 characters' using errcode='22023'; end if;
 if not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active') then
  raise exception 'Active hospital membership required' using errcode='42501';
 end if;
 select exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' and cm.role in ('owner','admin')) into v_is_admin;
 select sp.id into v_profile_id from public.staff_profiles sp where sp.clinic_id=p_clinic_id and sp.user_id=v_uid and sp.employment_status='active' limit 1;
 select * into v_escalation from public.department_task_escalations e where e.id=p_escalation_id and e.clinic_id=p_clinic_id for update;
 if not found then raise exception 'Escalation not found in this hospital' using errcode='P0002'; end if;
 v_authorised:=v_is_admin
  or exists(select 1 from public.staff_tasks t join public.staff_department_assignments a on a.id=t.assigned_to_assignment_id and a.clinic_id=t.clinic_id
   where t.id=v_escalation.task_id and t.clinic_id=p_clinic_id and a.supervisor_staff_profile_id=v_profile_id
    and a.assignment_status='active' and a.effective_from<=current_date and (a.effective_to is null or a.effective_to>=current_date))
  or exists(select 1 from public.staff_department_assignments ma0 join public.clinic_management_assignments ma
   on ma.manager_assignment_id=ma0.id and ma.clinic_id=ma0.clinic_id
   where ma0.clinic_id=p_clinic_id and ma0.staff_profile_id=v_profile_id and ma.department_id=v_escalation.department_id
    and (ma.unit_id is null or ma.unit_id=v_escalation.unit_id) and ma.assignment_status in ('active','delegated')
    and ma.effective_from<=current_date and (ma.effective_to is null or ma.effective_to>=current_date)
    and ma0.assignment_status='active' and ma0.effective_from<=current_date and (ma0.effective_to is null or ma0.effective_to>=current_date));
 if not v_authorised then raise exception 'Supervisor, appointed manager or hospital administrator access required' using errcode='42501'; end if;
 if v_escalation.status='dismissed' then raise exception 'Dismissed escalations cannot be resolved' using errcode='22023'; end if;
 if v_escalation.status='resolved' then return jsonb_build_object('success',true,'escalation_id',p_escalation_id,'status','resolved','already_resolved',true,'resolved_at',v_escalation.resolved_at); end if;
 update public.department_task_escalations set status='resolved',resolved_by_user_id=v_uid,resolved_at=v_now,
  resolution_notes=btrim(p_resolution_notes),updated_at=v_now where id=p_escalation_id and clinic_id=p_clinic_id;
 insert into public.department_task_escalation_events(clinic_id,escalation_id,actor_user_id,action_key,event_notes,metadata,created_at)
 values(p_clinic_id,p_escalation_id,v_uid,'resolved',btrim(p_resolution_notes),jsonb_build_object('actor_profile_id',v_profile_id),v_now);
 return jsonb_build_object('success',true,'escalation_id',p_escalation_id,'status','resolved','resolved_at',v_now);
end;$function$;

revoke all on function public.get_my_department_task_notifications(uuid,integer,boolean) from public,anon;
revoke all on function public.mark_department_task_notification_read(uuid,uuid) from public,anon;
revoke all on function public.acknowledge_department_task_escalation(uuid,uuid,text) from public,anon;
revoke all on function public.resolve_department_task_escalation(uuid,uuid,text) from public,anon;
grant execute on function public.get_my_department_task_notifications(uuid,integer,boolean) to authenticated;
grant execute on function public.mark_department_task_notification_read(uuid,uuid) to authenticated;
grant execute on function public.acknowledge_department_task_escalation(uuid,uuid,text) to authenticated;
grant execute on function public.resolve_department_task_escalation(uuid,uuid,text) to authenticated;
