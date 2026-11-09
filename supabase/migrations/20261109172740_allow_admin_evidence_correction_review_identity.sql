-- Allow hospital owners/admins without a staff profile to review evidence corrections.
alter table public.staff_task_evidence_corrections
  alter column approved_by_staff_profile_id drop not null;

alter table public.staff_task_evidence_corrections
  add column if not exists approved_by_user_id uuid;

update public.staff_task_evidence_corrections c
set approved_by_user_id=sp.user_id
from public.staff_profiles sp
where c.approved_by_staff_profile_id=sp.id
  and c.approved_by_user_id is null;

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

revoke all on function public.review_staff_task_evidence_correction(uuid,uuid,text,text) from public,anon;
grant execute on function public.review_staff_task_evidence_correction(uuid,uuid,text,text) to authenticated;
