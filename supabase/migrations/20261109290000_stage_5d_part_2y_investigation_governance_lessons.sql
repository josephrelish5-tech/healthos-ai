-- Stage 5D Part 2Y: hospital investigation governance and institutional lessons.
-- Additive only. Department risk summaries are derived from human-confirmed findings,
-- not raw AI signals; all conclusions and recommendations remain subject to human review.

create table if not exists public.staff_task_investigation_lessons_learned (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  finding_id uuid not null references public.staff_task_investigation_findings(id) on delete restrict,
  recorded_by_user_id uuid not null references auth.users(id) on delete restrict,
  lesson_title text not null check (length(trim(lesson_title)) between 8 and 240),
  lesson_detail text not null check (length(trim(lesson_detail)) between 30 and 5000),
  applicable_departments text[] not null default '{}',
  evidence_basis text not null check (length(trim(evidence_basis)) between 10 and 3000),
  created_at timestamptz not null default now(),
  unique (clinic_id, finding_id)
);
create index if not exists staff_task_investigation_lessons_clinic_idx
 on public.staff_task_investigation_lessons_learned(clinic_id, created_at desc);

create table if not exists public.staff_task_investigation_governance_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  finding_id uuid not null references public.staff_task_investigation_findings(id) on delete restrict,
  recorded_by_user_id uuid not null references auth.users(id) on delete restrict,
  accountable_management_role text not null check (length(trim(accountable_management_role)) between 3 and 160),
  accountable_department text not null check (length(trim(accountable_department)) between 2 and 160),
  governance_decision text not null check (governance_decision in
   ('accept_accountability','assign_management_review','allocate_resources','policy_review','escalate_board','monitor')),
  rationale text not null check (length(trim(rationale)) between 20 and 4000),
  responsible_user_id uuid references auth.users(id) on delete restrict,
  due_date date,
  created_at timestamptz not null default now()
);
create index if not exists staff_task_investigation_governance_clinic_idx
 on public.staff_task_investigation_governance_records(clinic_id, finding_id, created_at desc);

create table if not exists public.staff_task_investigation_institutional_recommendations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  finding_id uuid not null references public.staff_task_investigation_findings(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  recommendation text not null check (length(trim(recommendation)) between 20 and 4000),
  target_department text not null check (length(trim(target_department)) between 2 and 160),
  priority text not null check (priority in ('routine','important','urgent')),
  review_by_date date,
  created_at timestamptz not null default now()
);
create index if not exists staff_task_investigation_recommendations_clinic_idx
 on public.staff_task_investigation_institutional_recommendations(clinic_id, target_department, created_at desc);

create table if not exists public.staff_task_investigation_recommendation_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  recommendation_id uuid not null references public.staff_task_investigation_institutional_recommendations(id) on delete restrict,
  changed_by_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('proposed','approved','in_progress','implemented','rejected','review_required')),
  event_note text not null check (length(trim(event_note)) between 10 and 3000),
  independent_verifier_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (status <> 'implemented' or independent_verifier_user_id is not null)
);
create index if not exists staff_task_investigation_recommendation_events_idx
 on public.staff_task_investigation_recommendation_events(clinic_id,recommendation_id,created_at desc);

alter table public.staff_task_investigation_lessons_learned enable row level security;
alter table public.staff_task_investigation_governance_records enable row level security;
alter table public.staff_task_investigation_institutional_recommendations enable row level security;
alter table public.staff_task_investigation_recommendation_events enable row level security;
revoke all on public.staff_task_investigation_lessons_learned from public,anon,authenticated;
revoke all on public.staff_task_investigation_governance_records from public,anon,authenticated;
revoke all on public.staff_task_investigation_institutional_recommendations from public,anon,authenticated;
revoke all on public.staff_task_investigation_recommendation_events from public,anon,authenticated;
grant all on public.staff_task_investigation_lessons_learned to service_role;
grant all on public.staff_task_investigation_governance_records to service_role;
grant all on public.staff_task_investigation_institutional_recommendations to service_role;
grant all on public.staff_task_investigation_recommendation_events to service_role;

create or replace function public.prevent_investigation_governance_mutation()
returns trigger language plpgsql set search_path = ''
as $function$
begin
 raise exception 'Institutional investigation governance history is append-only.' using errcode='55000';
end;
$function$;
drop trigger if exists investigation_lessons_append_only on public.staff_task_investigation_lessons_learned;
create trigger investigation_lessons_append_only before update or delete on public.staff_task_investigation_lessons_learned
 for each row execute function public.prevent_investigation_governance_mutation();
drop trigger if exists investigation_governance_append_only on public.staff_task_investigation_governance_records;
create trigger investigation_governance_append_only before update or delete on public.staff_task_investigation_governance_records
 for each row execute function public.prevent_investigation_governance_mutation();
drop trigger if exists investigation_recommendations_append_only on public.staff_task_investigation_institutional_recommendations;
create trigger investigation_recommendations_append_only before update or delete on public.staff_task_investigation_institutional_recommendations
 for each row execute function public.prevent_investigation_governance_mutation();
drop trigger if exists investigation_recommendation_events_append_only on public.staff_task_investigation_recommendation_events;
create trigger investigation_recommendation_events_append_only before update or delete on public.staff_task_investigation_recommendation_events
 for each row execute function public.prevent_investigation_governance_mutation();

create or replace function public.get_hospital_investigation_governance_register(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_uid uuid:=auth.uid(); v_role text; v_departments jsonb; v_lessons jsonb; v_governance jsonb; v_recommendations jsonb;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select cm.role into v_role from public.clinic_memberships cm
 where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' limit 1;
 if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode='42501'; end if;

 select coalesce(jsonb_agg(jsonb_build_object(
  'department',d.department,'confirmed_findings',d.finding_count,'first_finding_at',d.first_at,'latest_finding_at',d.last_at,
  'ineffective_or_partial_reviews',d.weak_reviews,'recurrence_observations',d.recurrences,
  'risk_band',case when d.finding_count>=5 or d.weak_reviews>=3 or d.recurrences>=2 then 'priority_review'
                   when d.finding_count>=2 or d.weak_reviews>=1 or d.recurrences>=1 then 'management_attention' else 'monitor' end,
  'interpretation','Historical operational indicators only; validate current conditions and context before taking action.'
 ) order by d.finding_count desc,d.last_at desc),'[]'::jsonb) into v_departments
 from (
  select lower(trim(f.accountable_department)) department,count(distinct f.id)::int finding_count,
   min(f.created_at) first_at,max(f.created_at) last_at,
   (select count(*)::int from public.staff_task_investigation_action_effectiveness_reviews er
    join public.staff_task_investigation_preventive_actions pa on pa.id=er.action_id and pa.clinic_id=er.clinic_id
    where pa.finding_id in (select f2.id from public.staff_task_investigation_findings f2
      where f2.clinic_id=p_clinic_id and lower(trim(f2.accountable_department))=lower(trim(f.accountable_department)))
      and er.clinic_id=p_clinic_id and er.outcome in ('ineffective','partially_effective')) weak_reviews,
   (select count(*)::int from public.staff_task_investigation_action_effectiveness_reviews er
    join public.staff_task_investigation_preventive_actions pa on pa.id=er.action_id and pa.clinic_id=er.clinic_id
    where pa.finding_id in (select f3.id from public.staff_task_investigation_findings f3
      where f3.clinic_id=p_clinic_id and lower(trim(f3.accountable_department))=lower(trim(f.accountable_department)))
      and er.clinic_id=p_clinic_id and er.recurrence_status='recurrence_observed') recurrences
  from public.staff_task_investigation_findings f where f.clinic_id=p_clinic_id
  group by lower(trim(f.accountable_department))
 ) d;

 select coalesce(jsonb_agg(jsonb_build_object('lesson_id',l.id,'finding_id',l.finding_id,'title',l.lesson_title,
  'detail',l.lesson_detail,'departments',l.applicable_departments,'evidence_basis',l.evidence_basis,'created_at',l.created_at)
  order by l.created_at desc),'[]'::jsonb) into v_lessons
 from public.staff_task_investigation_lessons_learned l where l.clinic_id=p_clinic_id;

 select coalesce(jsonb_agg(jsonb_build_object('record_id',g.id,'finding_id',g.finding_id,
  'management_role',g.accountable_management_role,'department',g.accountable_department,'decision',g.governance_decision,
  'rationale',g.rationale,'responsible_user_id',g.responsible_user_id,'due_date',g.due_date,'created_at',g.created_at)
  order by g.created_at desc),'[]'::jsonb) into v_governance
 from public.staff_task_investigation_governance_records g where g.clinic_id=p_clinic_id;

 select coalesce(jsonb_agg(jsonb_build_object('recommendation_id',r.id,'finding_id',r.finding_id,
  'recommendation',r.recommendation,'department',r.target_department,'priority',r.priority,'review_by_date',r.review_by_date,
  'events',coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'note',e.event_note,'created_at',e.created_at,
   'independently_verified',e.independent_verifier_user_id is not null) order by e.created_at desc)
   from public.staff_task_investigation_recommendation_events e where e.recommendation_id=r.id and e.clinic_id=p_clinic_id),'[]'::jsonb))
  order by r.created_at desc),'[]'::jsonb) into v_recommendations
 from public.staff_task_investigation_institutional_recommendations r where r.clinic_id=p_clinic_id;

 return jsonb_build_object('read_only',true,'clinic_id',p_clinic_id,'department_risk_history',v_departments,
  'lessons_learned',v_lessons,'management_accountability',v_governance,'institutional_recommendations',v_recommendations,'generated_at',now());
end;
$function$;

create or replace function public.record_hospital_investigation_lesson(
 p_clinic_id uuid,p_finding_id uuid,p_title text,p_detail text,p_departments text[],p_evidence_basis text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_uid uuid:=auth.uid(); v_role text; v_id uuid;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select cm.role into v_role from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' limit 1;
 if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode='42501'; end if;
 if not exists(select 1 from public.staff_task_investigation_findings f where f.id=p_finding_id and f.clinic_id=p_clinic_id) then
  raise exception 'A human-confirmed root-cause finding in this hospital is required' using errcode='P0002'; end if;
 if length(trim(coalesce(p_title,''))) not between 8 and 240 or length(trim(coalesce(p_detail,''))) not between 30 and 5000
  or length(trim(coalesce(p_evidence_basis,''))) not between 10 and 3000 then raise exception 'Lesson fields are incomplete' using errcode='22023'; end if;
 insert into public.staff_task_investigation_lessons_learned(clinic_id,finding_id,recorded_by_user_id,lesson_title,lesson_detail,applicable_departments,evidence_basis)
 values(p_clinic_id,p_finding_id,v_uid,trim(p_title),trim(p_detail),coalesce(p_departments,'{}'),trim(p_evidence_basis)) returning id into v_id;
 return jsonb_build_object('success',true,'lesson_id',v_id);
end;
$function$;

create or replace function public.record_hospital_investigation_governance(
 p_clinic_id uuid,p_finding_id uuid,p_role text,p_department text,p_decision text,p_rationale text,p_responsible_user_id uuid,p_due_date date)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_uid uuid:=auth.uid(); v_membership text; v_id uuid;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select cm.role into v_membership from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' limit 1;
 if v_membership is null or v_membership not in ('owner','admin') then raise exception 'Administrator access required' using errcode='42501'; end if;
 if not exists(select 1 from public.staff_task_investigation_findings f where f.id=p_finding_id and f.clinic_id=p_clinic_id) then
  raise exception 'Finding not found in this hospital' using errcode='P0002'; end if;
 if p_decision not in ('accept_accountability','assign_management_review','allocate_resources','policy_review','escalate_board','monitor')
  or length(trim(coalesce(p_role,''))) not between 3 and 160 or length(trim(coalesce(p_department,''))) not between 2 and 160
  or length(trim(coalesce(p_rationale,''))) not between 20 and 4000 then raise exception 'Governance record fields are invalid' using errcode='22023'; end if;
 if p_responsible_user_id is not null and not exists(select 1 from public.clinic_memberships cm
  where cm.clinic_id=p_clinic_id and cm.user_id=p_responsible_user_id and cm.status='active') then
  raise exception 'Responsible person must be an active member of this hospital' using errcode='22023'; end if;
 insert into public.staff_task_investigation_governance_records(clinic_id,finding_id,recorded_by_user_id,accountable_management_role,accountable_department,governance_decision,rationale,responsible_user_id,due_date)
 values(p_clinic_id,p_finding_id,v_uid,trim(p_role),trim(p_department),p_decision,trim(p_rationale),p_responsible_user_id,p_due_date) returning id into v_id;
 return jsonb_build_object('success',true,'governance_record_id',v_id);
end;
$function$;

create or replace function public.record_hospital_investigation_recommendation(
 p_clinic_id uuid,p_finding_id uuid,p_recommendation text,p_department text,p_priority text,p_review_by_date date)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_uid uuid:=auth.uid(); v_role text; v_id uuid;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select cm.role into v_role from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' limit 1;
 if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode='42501'; end if;
 if not exists(select 1 from public.staff_task_investigation_findings f where f.id=p_finding_id and f.clinic_id=p_clinic_id) then
  raise exception 'Finding not found in this hospital' using errcode='P0002'; end if;
 if length(trim(coalesce(p_recommendation,''))) not between 20 and 4000 or length(trim(coalesce(p_department,''))) not between 2 and 160
  or p_priority not in ('routine','important','urgent') then raise exception 'Recommendation fields are invalid' using errcode='22023'; end if;
 insert into public.staff_task_investigation_institutional_recommendations(clinic_id,finding_id,created_by_user_id,recommendation,target_department,priority,review_by_date)
 values(p_clinic_id,p_finding_id,v_uid,trim(p_recommendation),trim(p_department),p_priority,p_review_by_date) returning id into v_id;
 insert into public.staff_task_investigation_recommendation_events(clinic_id,recommendation_id,changed_by_user_id,status,event_note)
 values(p_clinic_id,v_id,v_uid,'proposed','Recommendation entered for governance review.');
 return jsonb_build_object('success',true,'recommendation_id',v_id);
end;
$function$;

create or replace function public.record_hospital_investigation_recommendation_event(
 p_clinic_id uuid,p_recommendation_id uuid,p_status text,p_note text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_uid uuid:=auth.uid(); v_role text; v_creator uuid; v_id uuid;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select cm.role into v_role from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' limit 1;
 if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode='42501'; end if;
 select r.created_by_user_id into v_creator from public.staff_task_investigation_institutional_recommendations r
 where r.id=p_recommendation_id and r.clinic_id=p_clinic_id;
 if not found then raise exception 'Recommendation not found in this hospital' using errcode='P0002'; end if;
 if p_status not in ('proposed','approved','in_progress','implemented','rejected','review_required')
  or length(trim(coalesce(p_note,''))) not between 10 and 3000 then raise exception 'Recommendation status event is invalid' using errcode='22023'; end if;
 if p_status='implemented' and v_creator=v_uid then raise exception 'The recommendation author cannot independently verify implementation' using errcode='42501'; end if;
 insert into public.staff_task_investigation_recommendation_events(clinic_id,recommendation_id,changed_by_user_id,status,event_note,independent_verifier_user_id)
 values(p_clinic_id,p_recommendation_id,v_uid,p_status,trim(p_note),case when p_status='implemented' then v_uid else null end) returning id into v_id;
 return jsonb_build_object('success',true,'event_id',v_id);
end;
$function$;

revoke all on function public.get_hospital_investigation_governance_register(uuid) from public,anon;
revoke all on function public.record_hospital_investigation_lesson(uuid,uuid,text,text,text[],text) from public,anon;
revoke all on function public.record_hospital_investigation_governance(uuid,uuid,text,text,text,text,uuid,date) from public,anon;
revoke all on function public.record_hospital_investigation_recommendation(uuid,uuid,text,text,text,date) from public,anon;
revoke all on function public.record_hospital_investigation_recommendation_event(uuid,uuid,text,text) from public,anon;
grant execute on function public.get_hospital_investigation_governance_register(uuid) to authenticated;
grant execute on function public.record_hospital_investigation_lesson(uuid,uuid,text,text,text[],text) to authenticated;
grant execute on function public.record_hospital_investigation_governance(uuid,uuid,text,text,text,text,uuid,date) to authenticated;
grant execute on function public.record_hospital_investigation_recommendation(uuid,uuid,text,text,text,date) to authenticated;
grant execute on function public.record_hospital_investigation_recommendation_event(uuid,uuid,text,text) to authenticated;

comment on table public.staff_task_investigation_lessons_learned is 'Append-only institutional lessons tied to independently accepted investigation findings.';
comment on table public.staff_task_investigation_governance_records is 'Append-only management accountability and governance decisions for confirmed findings.';
comment on table public.staff_task_investigation_institutional_recommendations is 'Append-only institutional recommendations grounded in human-confirmed findings.';
