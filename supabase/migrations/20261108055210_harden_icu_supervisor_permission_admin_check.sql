-- Fail closed when no active clinic membership exists.
create or replace function public.healthos_icu_set_supervisor_role_permission(
  p_clinic_id uuid,p_department_id uuid,p_professional_role_id uuid,p_allowed boolean,p_note text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_membership_role text;
  v_department_name text;
  v_role_code text;
  v_role_name text;
  v_permission_id uuid;
  v_audit_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_clinic_id is null or p_department_id is null or p_professional_role_id is null or p_allowed is null then
    raise exception 'Clinic, department, professional role and permission state are required';
  end if;
  if nullif(trim(p_note), '') is null or length(trim(p_note)) < 5 or length(trim(p_note)) > 2000 then
    raise exception 'A management note between 5 and 2000 characters is required';
  end if;
  select cm.role into v_membership_role from public.clinic_memberships cm
  where cm.clinic_id=p_clinic_id and cm.user_id=v_actor and cm.status='active' limit 1;
  if coalesce(v_membership_role,'') not in ('owner','admin') then
    raise exception 'Only clinic owners or administrators can manage ICU supervisor permissions';
  end if;
  select d.department_name,pr.role_code,pr.role_name into v_department_name,v_role_code,v_role_name
  from public.clinic_departments d
  join public.clinic_department_roles cdr on cdr.department_id=d.id and cdr.clinic_id=d.clinic_id
  join public.clinic_professional_roles pr on pr.id=cdr.professional_role_id and pr.clinic_id=cdr.clinic_id
  where d.id=p_department_id and d.clinic_id=p_clinic_id and d.is_active=true
    and cdr.is_active=true and pr.id=p_professional_role_id and pr.is_active=true limit 1;
  if v_department_name is null or v_role_code is null then
    raise exception 'Selected active professional role is not assigned to this active clinic department';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_clinic_id::text||':staff:'||
    lower(v_department_name)||':'||lower(v_role_code)||':icu_supervision:manage',0));
  update public.clinic_role_permissions rp set allowed=p_allowed,created_by=v_actor,created_at=now()
  where rp.clinic_id=p_clinic_id and rp.role_key='staff'
    and lower(trim(rp.department))=lower(trim(v_department_name))
    and lower(trim(rp.professional_role_key))=lower(trim(v_role_code))
    and rp.resource_key='icu_supervision' and rp.action_key='manage'
  returning rp.id into v_permission_id;
  if v_permission_id is null then
    insert into public.clinic_role_permissions
      (clinic_id,role_key,department,resource_key,action_key,allowed,created_by,professional_role_key)
    values (p_clinic_id,'staff',v_department_name,'icu_supervision','manage',p_allowed,v_actor,v_role_code)
    returning id into v_permission_id;
  end if;
  insert into public.icu_supervisor_permission_audit
    (clinic_id,permission_id,department,professional_role_key,allowed,changed_by,change_note)
  values (p_clinic_id,v_permission_id,v_department_name,v_role_code,p_allowed,v_actor,trim(p_note))
  returning id into v_audit_id;
  return jsonb_build_object('success',true,'permission_id',v_permission_id,'audit_id',v_audit_id,
    'clinic_id',p_clinic_id,'department',v_department_name,'professional_role',v_role_name,
    'resource','icu_supervision','action','manage','allowed',p_allowed,'changed_by',v_actor,'note',trim(p_note));
end;
$function$;
revoke all on function public.healthos_icu_set_supervisor_role_permission(uuid,uuid,uuid,boolean,text) from public,anon;
grant execute on function public.healthos_icu_set_supervisor_role_permission(uuid,uuid,uuid,boolean,text) to authenticated;