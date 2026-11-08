-- Stage 3H: hospital-configured staffing requirements and coverage comparison
create table if not exists public.department_staffing_requirements (
 id uuid primary key default gen_random_uuid(),
 clinic_id uuid not null references public.clinics(id) on delete cascade,
 department_id uuid not null references public.clinic_departments(id) on delete cascade,
 department_role_id uuid not null references public.clinic_department_roles(id) on delete restrict,
 shift_type text not null,
 minimum_headcount integer not null check (minimum_headcount between 1 and 500),
 effective_from date not null default current_date,
 effective_to date,
 policy_reference text,
 requirement_notes text,
 validation_status text not null default 'draft' check (validation_status in ('draft','under_review','hospital_approved','retired')),
 created_by uuid not null default auth.uid(),
 validated_by uuid,
 validated_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint department_staffing_req_dates check (effective_to is null or effective_to >= effective_from),
 constraint department_staffing_req_shift check (length(btrim(shift_type)) between 2 and 80),
 constraint department_staffing_req_policy_len check (policy_reference is null or length(policy_reference)<=300),
 constraint department_staffing_req_notes_len check (requirement_notes is null or length(requirement_notes)<=2000)
);
create index if not exists department_staffing_req_scope_idx
 on public.department_staffing_requirements(clinic_id,department_id,validation_status,effective_from,effective_to);
create table if not exists public.department_staffing_requirement_events (
 id uuid primary key default gen_random_uuid(),
 clinic_id uuid not null references public.clinics(id) on delete cascade,
 requirement_id uuid not null references public.department_staffing_requirements(id) on delete cascade,
 actor_user_id uuid not null,
 action_key text not null,
 before_state jsonb,
 after_state jsonb,
 created_at timestamptz not null default now()
);
create index if not exists department_staffing_req_events_idx
 on public.department_staffing_requirement_events(clinic_id,requirement_id,created_at desc);
alter table public.department_staffing_requirements enable row level security;
alter table public.department_staffing_requirement_events enable row level security;
revoke all on public.department_staffing_requirements from anon, authenticated;
revoke all on public.department_staffing_requirement_events from anon, authenticated;

create or replace function public.manage_department_staffing_requirement(
 p_clinic_id uuid, p_action text, p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid := auth.uid();
 v_id uuid;
 v_row public.department_staffing_requirements%rowtype;
 v_before jsonb;
 v_dept_role public.clinic_department_roles%rowtype;
 v_min integer;
 v_shift text;
 v_from date;
 v_to date;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_clinic_id is null then raise exception 'Clinic is required' using errcode='22023'; end if;
 if not exists(select 1 from public.clinics c where c.id=p_clinic_id and c.owner_user_id=v_uid)
 and not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' and cm.role in ('owner','admin')) then
  raise exception 'Hospital administrator access required' using errcode='42501';
 end if;
 if p_action='create' then
  if coalesce(p_payload->>'department_id','')='' or coalesce(p_payload->>'department_role_id','')='' then raise exception 'Department and professional role are required'; end if;
  v_min := (p_payload->>'minimum_headcount')::integer;
  v_shift := btrim(coalesce(p_payload->>'shift_type',''));
  v_from := coalesce(nullif(p_payload->>'effective_from','')::date,current_date);
  v_to := nullif(p_payload->>'effective_to','')::date;
  if v_min not between 1 and 500 or length(v_shift) not between 2 and 80 or (v_to is not null and v_to<v_from) then raise exception 'Check headcount, shift type and effective dates'; end if;
  select * into v_dept_role from public.clinic_department_roles dr
   where dr.id=(p_payload->>'department_role_id')::uuid and dr.clinic_id=p_clinic_id and dr.department_id=(p_payload->>'department_id')::uuid and dr.is_active;
  if not found then raise exception 'The selected professional role is not actively linked to this department'; end if;
  if not exists(select 1 from public.clinic_departments d where d.id=v_dept_role.department_id and d.clinic_id=p_clinic_id and d.is_active) then raise exception 'Active department not found'; end if;
  insert into public.department_staffing_requirements(clinic_id,department_id,department_role_id,shift_type,minimum_headcount,effective_from,effective_to,policy_reference,requirement_notes,created_by)
  values(p_clinic_id,v_dept_role.department_id,v_dept_role.id,v_shift,v_min,v_from,v_to,nullif(btrim(p_payload->>'policy_reference'),''),nullif(btrim(p_payload->>'requirement_notes'),''),v_uid)
  returning * into v_row;
  insert into public.department_staffing_requirement_events(clinic_id,requirement_id,actor_user_id,action_key,after_state)
  values(p_clinic_id,v_row.id,v_uid,'created',to_jsonb(v_row));
  return jsonb_build_object('id',v_row.id,'validation_status',v_row.validation_status);
 elsif p_action in ('submit','approve') then
  v_id := (p_payload->>'requirement_id')::uuid;
  select * into v_row from public.department_staffing_requirements r where r.id=v_id and r.clinic_id=p_clinic_id for update;
  if not found then raise exception 'Staffing requirement not found'; end if;
  v_before := to_jsonb(v_row);
  if p_action='submit' then
   if v_row.validation_status<>'draft' then raise exception 'Only draft requirements can be submitted'; end if;
   update public.department_staffing_requirements set validation_status='under_review',updated_at=now() where id=v_id returning * into v_row;
  else
   if v_row.validation_status<>'under_review' then raise exception 'Only requirements under review can be approved'; end if;
   if v_row.created_by=v_uid then raise exception 'Independent approval required: the author cannot approve this requirement'; end if;
   update public.department_staffing_requirements set validation_status='hospital_approved',validated_by=v_uid,validated_at=now(),updated_at=now() where id=v_id returning * into v_row;
  end if;
  insert into public.department_staffing_requirement_events(clinic_id,requirement_id,actor_user_id,action_key,before_state,after_state)
  values(p_clinic_id,v_id,v_uid,p_action||'_'||case when p_action='approve' then 'approved' else 'review' end,v_before,to_jsonb(v_row));
  return jsonb_build_object('id',v_row.id,'validation_status',v_row.validation_status);
 else
  raise exception 'Unsupported staffing requirement action';
 end if;
end;
$$;
revoke all on function public.manage_department_staffing_requirement(uuid,text,jsonb) from public,anon;
grant execute on function public.manage_department_staffing_requirement(uuid,text,jsonb) to authenticated;

create or replace function public.get_department_staffing_coverage(
 p_clinic_id uuid,p_department_id uuid,p_shift_date date default null
) returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare
 v_date date := coalesce(p_shift_date,(now() at time zone 'Africa/Lagos')::date);
 v_result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 -- Reuse the existing manager/admin scope gate and roster validation.
 perform public.get_department_staff_accountability(p_clinic_id,p_department_id);
 if not exists(select 1 from public.clinic_departments d where d.id=p_department_id and d.clinic_id=p_clinic_id and d.is_active) then raise exception 'Active department not found'; end if;
 select jsonb_build_object(
  'department_id',p_department_id,'shift_date',v_date,
  'requirements',coalesce((
   select jsonb_agg(jsonb_build_object(
    'requirement_id',r.id,'role_name',pr.role_name,'shift_type',r.shift_type,
    'minimum_headcount',r.minimum_headcount,'policy_reference',r.policy_reference,
    'requirement_notes',r.requirement_notes,'effective_from',r.effective_from,'effective_to',r.effective_to,
    'scheduled_count',coalesce(x.scheduled_count,0),'clocked_in_count',coalesce(x.clocked_in_count,0),
    'roster_state',case when coalesce(x.scheduled_count,0)=0 then 'no_roster_entries'
      when x.scheduled_count<r.minimum_headcount then 'roster_below_requirement'
      when coalesce(x.clocked_in_count,0)<r.minimum_headcount then 'scheduled_but_not_yet_covered'
      else 'recorded_minimum_met' end
   ) order by r.shift_type,pr.role_name)
   from public.department_staffing_requirements r
   join public.clinic_department_roles dr on dr.id=r.department_role_id and dr.clinic_id=r.clinic_id
   join public.clinic_professional_roles pr on pr.id=dr.professional_role_id and pr.clinic_id=dr.clinic_id
   left join lateral (
    select count(distinct ss.staff_profile_id)::integer scheduled_count,
      count(distinct ss.staff_profile_id) filter(where ss.clocked_in_at is not null and ss.clocked_out_at is null)::integer clocked_in_count
    from public.staff_shifts ss
    join public.staff_department_assignments da on da.staff_profile_id=ss.staff_profile_id and da.clinic_id=ss.clinic_id
      and da.department_id=r.department_id and da.assignment_status='active'
      and da.effective_from<=v_date and (da.effective_to is null or da.effective_to>=v_date)
    join public.staff_assignment_roles sar on sar.assignment_id=da.id and sar.clinic_id=da.clinic_id
      and sar.professional_role_id=dr.professional_role_id and sar.is_active
      and sar.effective_from<=v_date and (sar.effective_to is null or sar.effective_to>=v_date)
    where ss.clinic_id=p_clinic_id and ss.shift_date=v_date and lower(ss.shift_type)=lower(r.shift_type)
      and ss.clocked_out_at is null
   ) x on true
   where r.clinic_id=p_clinic_id and r.department_id=p_department_id and r.validation_status='hospital_approved'
    and r.effective_from<=v_date and (r.effective_to is null or r.effective_to>=v_date)
    and dr.is_active and pr.is_active
  ),'[]'::jsonb)
 ) into v_result;
 return v_result;
end;
$$;
revoke all on function public.get_department_staffing_coverage(uuid,uuid,date) from public,anon;
grant execute on function public.get_department_staffing_coverage(uuid,uuid,date) to authenticated;
