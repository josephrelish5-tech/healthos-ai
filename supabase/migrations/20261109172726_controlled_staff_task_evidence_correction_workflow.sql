-- Stage 5D Part 2U: controlled evidence correction and independent review.
-- Original evidence remains immutable; approved corrections are appended as linked records.

create table if not exists public.staff_task_evidence_correction_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  evidence_id uuid not null,
  requested_by_staff_profile_id uuid not null,
  correction_reason text not null,
  proposed_evidence_text text,
  proposed_source_reference text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by_staff_profile_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_task_evidence_correction_request_reason_length
    check (length(btrim(correction_reason)) between 5 and 2000),
  constraint staff_task_evidence_correction_request_payload
    check (
      (nullif(btrim(coalesce(proposed_evidence_text,'')),'') is not null
       or nullif(btrim(coalesce(proposed_source_reference,'')),'') is not null)
      and length(coalesce(proposed_evidence_text,'')) <= 5000
      and length(coalesce(proposed_source_reference,'')) <= 1000
    )
);

create index if not exists staff_task_evidence_correction_queue_idx
  on public.staff_task_evidence_correction_requests (clinic_id,status,created_at desc);
create index if not exists staff_task_evidence_correction_evidence_idx
  on public.staff_task_evidence_correction_requests (clinic_id,evidence_id,created_at desc);

create table if not exists public.staff_task_evidence_corrections (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  evidence_id uuid not null,
  correction_request_id uuid not null unique
    references public.staff_task_evidence_correction_requests(id),
  original_evidence_text text,
  original_source_reference text,
  corrected_evidence_text text,
  corrected_source_reference text,
  correction_reason text not null,
  requested_by_staff_profile_id uuid not null,
  approved_by_staff_profile_id uuid,
  approved_by_user_id uuid not null,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists staff_task_evidence_corrections_evidence_idx
  on public.staff_task_evidence_corrections (clinic_id,evidence_id,approved_at desc);

alter table public.staff_task_evidence_correction_requests enable row level security;
alter table public.staff_task_evidence_corrections enable row level security;
revoke all on public.staff_task_evidence_correction_requests from public,anon,authenticated;
revoke all on public.staff_task_evidence_corrections from public,anon,authenticated;

create or replace function public.prevent_staff_evidence_correction_history_mutation()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  raise exception 'Approved evidence corrections are immutable; submit a new correction request.'
    using errcode = '55000';
end;
$function$;

create or replace function public.prevent_staff_evidence_correction_truncate()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  raise exception 'Approved evidence correction history cannot be truncated.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_evidence_corrections_immutable on public.staff_task_evidence_corrections;
create trigger staff_task_evidence_corrections_immutable
before update or delete on public.staff_task_evidence_corrections
for each row execute function public.prevent_staff_evidence_correction_history_mutation();
drop trigger if exists staff_task_evidence_corrections_block_truncate on public.staff_task_evidence_corrections;
create trigger staff_task_evidence_corrections_block_truncate
before truncate on public.staff_task_evidence_corrections
for each statement execute function public.prevent_staff_evidence_correction_truncate();

create or replace function public.request_my_staff_task_evidence_correction(
  p_clinic_id uuid,p_evidence_id uuid,p_reason text,
  p_proposed_evidence_text text default null,p_proposed_source_reference text default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_profile uuid;
  v_evidence public.staff_task_evidence%rowtype;
  v_task public.staff_tasks%rowtype;
  v_request_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_clinic_id is null or p_evidence_id is null then raise exception 'Clinic and evidence are required' using errcode='22023'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 2000 then
    raise exception 'Explain why the evidence correction is needed (5 to 2000 characters)' using errcode='22023';
  end if;
  if length(coalesce(p_proposed_evidence_text,''))>5000
     or length(coalesce(p_proposed_source_reference,''))>1000
     or (nullif(btrim(coalesce(p_proposed_evidence_text,'')),'') is null
         and nullif(btrim(coalesce(p_proposed_source_reference,'')),'') is null) then
    raise exception 'Provide corrected evidence text or a corrected reference within the allowed length' using errcode='22023';
  end if;
  if not exists(select 1 from public.clinic_memberships cm
    where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' and cm.role not in ('owner','admin')) then
    raise exception 'Active staff membership required' using errcode='42501';
  end if;
  select sp.id into v_profile from public.staff_profiles sp
  where sp.clinic_id=p_clinic_id and sp.user_id=v_uid and sp.employment_status='active' limit 1;
  if v_profile is null then raise exception 'Active staff profile not found'; end if;

  select e.* into v_evidence from public.staff_task_evidence e
  where e.id=p_evidence_id and e.clinic_id=p_clinic_id
    and e.submitted_by_staff_profile_id=v_profile for share;
  if not found then raise exception 'Evidence not found or you are not its submitter' using errcode='42501'; end if;

  select t.* into v_task from public.staff_tasks t
  where t.id=v_evidence.task_id and t.clinic_id=p_clinic_id;
  if not found then raise exception 'Evidence task not found'; end if;
  if not exists(select 1 from public.staff_department_assignments a
    where a.id=v_task.assigned_to_assignment_id and a.clinic_id=p_clinic_id and a.staff_profile_id=v_profile) then
    raise exception 'Only the assigned staff member who submitted this evidence may request its correction' using errcode='42501';
  end if;
  if exists(select 1 from public.staff_task_evidence_correction_requests r
    where r.clinic_id=p_clinic_id and r.evidence_id=p_evidence_id and r.status='pending') then
    raise exception 'A correction request for this evidence is already awaiting review';
  end if;

  insert into public.staff_task_evidence_correction_requests (
    clinic_id,task_id,evidence_id,requested_by_staff_profile_id,
    correction_reason,proposed_evidence_text,proposed_source_reference
  ) values (
    p_clinic_id,v_task.id,p_evidence_id,v_profile,btrim(p_reason),
    nullif(btrim(coalesce(p_proposed_evidence_text,'')),''),
    nullif(btrim(coalesce(p_proposed_source_reference,'')),'')
  ) returning id into v_request_id;

  insert into public.staff_task_events(clinic_id,task_id,actor_staff_profile_id,event_type,event_notes,metadata)
  values(p_clinic_id,v_task.id,v_profile,'evidence_correction_requested',btrim(p_reason),
    jsonb_build_object('correction_request_id',v_request_id,'evidence_id',p_evidence_id));
  return jsonb_build_object('success',true,'request_id',v_request_id,'status','pending','original_evidence_preserved',true);
end;
$function$;

create or replace function public.review_staff_task_evidence_correction(
  p_clinic_id uuid,p_request_id uuid,p_decision text,p_review_notes text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid:=auth.uid(); v_role text; v_reviewer uuid;
  v_request public.staff_task_evidence_correction_requests%rowtype;
  v_evidence public.staff_task_evidence%rowtype;
  v_task public.staff_tasks%rowtype;
  v_assignee uuid; v_allowed boolean:=false; v_correction_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected' using errcode='22023'; end if;
  if length(btrim(coalesce(p_review_notes,'')))<3 or length(coalesce(p_review_notes,''))>2000 then
    raise exception 'A review explanation of 3 to 2000 characters is required' using errcode='22023';
  end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' limit 1;
  if v_role is null then raise exception 'Active hospital membership required' using errcode='42501'; end if;
  select sp.id into v_reviewer from public.staff_profiles sp
  where sp.clinic_id=p_clinic_id and sp.user_id=v_uid and sp.employment_status='active' limit 1;

  select r.* into v_request from public.staff_task_evidence_correction_requests r
  where r.id=p_request_id and r.clinic_id=p_clinic_id and r.status='pending' for update;
  if not found then raise exception 'Pending evidence correction request not found'; end if;
  select e.* into v_evidence from public.staff_task_evidence e
  where e.id=v_request.evidence_id and e.clinic_id=p_clinic_id;
  if not found then raise exception 'Original evidence record not found'; end if;
  select t.* into v_task from public.staff_tasks t
  where t.id=v_request.task_id and t.clinic_id=p_clinic_id;
  if not found then raise exception 'Task record not found'; end if;
  select a.staff_profile_id into v_assignee from public.staff_department_assignments a
  where a.id=v_task.assigned_to_assignment_id and a.clinic_id=p_clinic_id;

  if v_role not in ('owner','admin') and v_reviewer is null then
    raise exception 'Active reviewer staff profile required' using errcode='42501';
  end if;
  if v_reviewer is not null and v_reviewer in
    (v_request.requested_by_staff_profile_id,v_evidence.submitted_by_staff_profile_id,v_assignee,v_task.assigned_by_staff_profile_id) then
    raise exception 'The evidence submitter, task assignee or task assigner cannot review this correction' using errcode='42501';
  end if;
  select exists(select 1 from public.staff_department_assignments a
    where a.id=v_task.assigned_to_assignment_id and a.clinic_id=p_clinic_id and a.supervisor_staff_profile_id=v_reviewer)
    or exists(select 1 from public.clinic_management_assignments m
      join public.staff_department_assignments ma on ma.id=m.manager_assignment_id and ma.clinic_id=m.clinic_id
      where m.clinic_id=p_clinic_id and ma.staff_profile_id=v_reviewer
        and m.department_id=v_task.department_id and (m.unit_id is null or m.unit_id=v_task.unit_id)
        and m.assignment_status in ('active','delegated') and m.effective_from<=current_date
        and (m.effective_to is null or m.effective_to>=current_date)) into v_allowed;
  if v_role not in ('owner','admin') and not v_allowed then
    raise exception 'Only the assigned supervisor or authorised department/unit manager may review this correction' using errcode='42501';
  end if;

  if p_decision='approved' then
    insert into public.staff_task_evidence_corrections (
      clinic_id,task_id,evidence_id,correction_request_id,original_evidence_text,original_source_reference,
      corrected_evidence_text,corrected_source_reference,correction_reason,
      requested_by_staff_profile_id,approved_by_staff_profile_id,approved_by_user_id
    ) values (
      p_clinic_id,v_task.id,v_evidence.id,v_request.id,v_evidence.evidence_text,v_evidence.source_reference,
      v_request.proposed_evidence_text,v_request.proposed_source_reference,v_request.correction_reason,
      v_request.requested_by_staff_profile_id,v_reviewer,v_uid
    ) returning id into v_correction_id;
  end if;

  update public.staff_task_evidence_correction_requests
  set status=p_decision,reviewed_by_staff_profile_id=v_reviewer,reviewed_at=now(),
      review_notes=btrim(p_review_notes),updated_at=now()
  where id=v_request.id and clinic_id=p_clinic_id and status='pending';

  insert into public.staff_task_events(clinic_id,task_id,actor_staff_profile_id,event_type,event_notes,metadata)
  values(p_clinic_id,v_task.id,v_reviewer,
    case when p_decision='approved' then 'evidence_correction_approved' else 'evidence_correction_rejected' end,
    btrim(p_review_notes),jsonb_build_object('correction_request_id',v_request.id,'evidence_id',v_evidence.id,
      'decision',p_decision,'correction_record_id',v_correction_id,'reviewer_user_id',v_uid,'original_evidence_preserved',true));
  return jsonb_build_object('success',true,'request_id',v_request.id,'decision',p_decision,
    'correction_record_id',v_correction_id,'original_evidence_preserved',true);
end;
$function$;

create or replace function public.get_staff_task_evidence_correction_queue(
  p_clinic_id uuid,p_department_id uuid default null,p_limit integer default 100
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_uid uuid:=auth.uid(); v_role text; v_profile uuid; v_rows jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_limit is null or p_limit<1 or p_limit>200 then raise exception 'Limit must be between 1 and 200' using errcode='22023'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' limit 1;
  if v_role is null then raise exception 'Active hospital membership required' using errcode='42501'; end if;
  select sp.id into v_profile from public.staff_profiles sp
  where sp.clinic_id=p_clinic_id and sp.user_id=v_uid and sp.employment_status='active' limit 1;

  if v_role not in ('owner','admin') and v_profile is null then
    raise exception 'Active reviewer profile required' using errcode='42501';
  end if;
  if v_role not in ('owner','admin') and not exists(
    select 1 from public.staff_department_assignments a
    join public.clinic_management_assignments m on m.manager_assignment_id=a.id and m.clinic_id=a.clinic_id
    where a.clinic_id=p_clinic_id and a.staff_profile_id=v_profile
      and m.assignment_status in ('active','delegated') and m.effective_from<=current_date
      and (m.effective_to is null or m.effective_to>=current_date)
      and (p_department_id is null or m.department_id=p_department_id)
  ) and not exists(select 1 from public.staff_department_assignments a
    where a.clinic_id=p_clinic_id and a.supervisor_staff_profile_id=v_profile and a.assignment_status='active') then
    raise exception 'Authorised supervisor or department management appointment required' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(x.item order by x.created_at desc),'[]'::jsonb) into v_rows
  from (
    select r.created_at,jsonb_build_object(
      'request_id',r.id,'task_id',r.task_id,'evidence_id',r.evidence_id,
      'department_id',t.department_id,'task_title',t.task_title,
      'requester_name',requester.full_name,'correction_reason',r.correction_reason,
      'proposed_evidence_text',r.proposed_evidence_text,'proposed_source_reference',r.proposed_source_reference,
      'original_evidence_text',e.evidence_text,'original_source_reference',e.source_reference,
      'status',r.status,'created_at',r.created_at
    ) item
    from public.staff_task_evidence_correction_requests r
    join public.staff_tasks t on t.id=r.task_id and t.clinic_id=r.clinic_id
    join public.staff_task_evidence e on e.id=r.evidence_id and e.clinic_id=r.clinic_id
    left join public.staff_profiles requester on requester.id=r.requested_by_staff_profile_id and requester.clinic_id=r.clinic_id
    where r.clinic_id=p_clinic_id and r.status='pending'
      and (p_department_id is null or t.department_id=p_department_id)
      and (v_role in ('owner','admin')
        or exists(select 1 from public.staff_department_assignments a
          where a.id=t.assigned_to_assignment_id and a.clinic_id=t.clinic_id and a.supervisor_staff_profile_id=v_profile)
        or exists(select 1 from public.clinic_management_assignments m
          join public.staff_department_assignments ma on ma.id=m.manager_assignment_id and ma.clinic_id=m.clinic_id
          where m.clinic_id=t.clinic_id and ma.staff_profile_id=v_profile and m.department_id=t.department_id
            and (m.unit_id is null or m.unit_id=t.unit_id) and m.assignment_status in ('active','delegated')
            and m.effective_from<=current_date and (m.effective_to is null or m.effective_to>=current_date)))
      and r.requested_by_staff_profile_id is distinct from v_profile
    order by r.created_at desc limit p_limit
  ) x;
  return jsonb_build_object('requests',v_rows,'generated_at',now());
end;
$function$;

revoke all on function public.prevent_staff_evidence_correction_history_mutation() from public,anon,authenticated,service_role;
revoke all on function public.prevent_staff_evidence_correction_truncate() from public,anon,authenticated,service_role;
revoke all on function public.request_my_staff_task_evidence_correction(uuid,uuid,text,text,text) from public,anon;
revoke all on function public.review_staff_task_evidence_correction(uuid,uuid,text,text) from public,anon;
revoke all on function public.get_staff_task_evidence_correction_queue(uuid,uuid,integer) from public,anon;
grant execute on function public.request_my_staff_task_evidence_correction(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.review_staff_task_evidence_correction(uuid,uuid,text,text) to authenticated;
grant execute on function public.get_staff_task_evidence_correction_queue(uuid,uuid,integer) to authenticated;
