-- Stage 5D Part 2V: human review and independent approval of investigation pattern signals.
-- Additive only. AI signals remain review prompts, not findings of misconduct.

create table if not exists public.staff_task_investigation_signal_reviews (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  signal_id uuid not null references public.staff_task_investigation_pattern_signals(id) on delete restrict,
  reviewed_by_user_id uuid not null references auth.users(id) on delete restrict,
  reviewed_by_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  decision text not null check (decision in (
    'confirmed_operational_weakness',
    'requires_further_investigation',
    'false_positive',
    'insufficient_evidence'
  )),
  rationale text not null check (length(trim(rationale)) between 10 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists staff_task_investigation_signal_reviews_signal_idx
  on public.staff_task_investigation_signal_reviews(clinic_id, signal_id, created_at desc);

create table if not exists public.staff_task_investigation_signal_review_approvals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  review_id uuid not null references public.staff_task_investigation_signal_reviews(id) on delete restrict,
  approved_by_user_id uuid not null references auth.users(id) on delete restrict,
  approved_by_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  outcome text not null check (outcome in ('accepted','rejected')),
  approval_note text not null check (length(trim(approval_note)) between 10 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists staff_task_investigation_signal_approvals_review_idx
  on public.staff_task_investigation_signal_review_approvals(clinic_id, review_id, created_at desc);
create unique index if not exists staff_task_investigation_signal_one_decision_approval_idx
  on public.staff_task_investigation_signal_review_approvals(review_id);

alter table public.staff_task_investigation_signal_reviews enable row level security;
alter table public.staff_task_investigation_signal_review_approvals enable row level security;
revoke all on public.staff_task_investigation_signal_reviews from public, anon, authenticated;
revoke all on public.staff_task_investigation_signal_review_approvals from public, anon, authenticated;
grant all on public.staff_task_investigation_signal_reviews to service_role;
grant all on public.staff_task_investigation_signal_review_approvals to service_role;

create or replace function public.prevent_investigation_signal_review_mutation()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  raise exception 'Investigation signal review and approval history is append-only.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_investigation_signal_reviews_append_only
  on public.staff_task_investigation_signal_reviews;
create trigger staff_task_investigation_signal_reviews_append_only
before update or delete on public.staff_task_investigation_signal_reviews
for each row execute function public.prevent_investigation_signal_review_mutation();

drop trigger if exists staff_task_investigation_signal_approvals_append_only
  on public.staff_task_investigation_signal_review_approvals;
create trigger staff_task_investigation_signal_approvals_append_only
before update or delete on public.staff_task_investigation_signal_review_approvals
for each row execute function public.prevent_investigation_signal_review_mutation();

create or replace function public.record_hospital_investigation_signal_review(
  p_clinic_id uuid,
  p_signal_id uuid,
  p_decision text,
  p_rationale text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_profile_id uuid;
  v_review_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_signal_id is null then raise exception 'Hospital and signal are required' using errcode = '22023'; end if;
  if p_decision not in ('confirmed_operational_weakness','requires_further_investigation','false_positive','insufficient_evidence') then
    raise exception 'Unsupported human review decision' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_rationale,''))) < 10 or length(p_rationale) > 3000 then
    raise exception 'Provide a review rationale between 10 and 3,000 characters' using errcode = '22023';
  end if;

  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may review investigation signals' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.staff_task_investigation_pattern_signals s
    where s.id = p_signal_id and s.clinic_id = p_clinic_id
  ) then raise exception 'Investigation signal not found in this hospital' using errcode = 'P0002'; end if;

  select sp.id into v_profile_id from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid and sp.employment_status = 'active' limit 1;

  insert into public.staff_task_investigation_signal_reviews(
    clinic_id,signal_id,reviewed_by_user_id,reviewed_by_staff_profile_id,decision,rationale
  ) values (
    p_clinic_id,p_signal_id,v_uid,v_profile_id,p_decision,trim(p_rationale)
  ) returning id into v_review_id;

  return jsonb_build_object(
    'success',true,'review_id',v_review_id,'signal_id',p_signal_id,
    'decision',p_decision,
    'approval_required',p_decision = 'confirmed_operational_weakness',
    'recorded_at',now()
  );
end;
$function$;

create or replace function public.approve_hospital_investigation_signal_review(
  p_clinic_id uuid,
  p_review_id uuid,
  p_outcome text,
  p_approval_note text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_profile_id uuid;
  v_review public.staff_task_investigation_signal_reviews%rowtype;
  v_approval_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_review_id is null then raise exception 'Hospital and review are required' using errcode = '22023'; end if;
  if p_outcome not in ('accepted','rejected') then raise exception 'Approval outcome must be accepted or rejected' using errcode = '22023'; end if;
  if length(trim(coalesce(p_approval_note,''))) < 10 or length(p_approval_note) > 2000 then
    raise exception 'Provide an approval note between 10 and 2,000 characters' using errcode = '22023';
  end if;

  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may approve investigation reviews' using errcode = '42501';
  end if;

  select r.* into v_review from public.staff_task_investigation_signal_reviews r
  where r.id = p_review_id and r.clinic_id = p_clinic_id for update;
  if not found then raise exception 'Investigation review not found in this hospital' using errcode = 'P0002'; end if;
  if v_review.decision <> 'confirmed_operational_weakness' then
    raise exception 'Independent approval is reserved for confirmed operational-weakness conclusions' using errcode = '55000';
  end if;
  if v_review.reviewed_by_user_id = v_uid then
    raise exception 'The original reviewer cannot independently approve their own conclusion' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.staff_task_investigation_signal_review_approvals a
    where a.review_id = p_review_id
  ) then raise exception 'An independent decision has already been recorded for this review' using errcode = '55000'; end if;

  select sp.id into v_profile_id from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid and sp.employment_status = 'active' limit 1;

  insert into public.staff_task_investigation_signal_review_approvals(
    clinic_id,review_id,approved_by_user_id,approved_by_staff_profile_id,outcome,approval_note
  ) values (p_clinic_id,p_review_id,v_uid,v_profile_id,p_outcome,trim(p_approval_note))
  returning id into v_approval_id;

  return jsonb_build_object(
    'success',true,'approval_id',v_approval_id,'review_id',p_review_id,
    'outcome',p_outcome,'independent_approval',true,'recorded_at',now()
  );
end;
$function$;

create or replace function public.get_hospital_investigation_signal_review_register(
  p_clinic_id uuid,
  p_signal_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_reviews jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_signal_id is null then raise exception 'Hospital and signal are required' using errcode = '22023'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may view investigation signal reviews' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.staff_task_investigation_pattern_signals s
    where s.id = p_signal_id and s.clinic_id = p_clinic_id
  ) then raise exception 'Investigation signal not found in this hospital' using errcode = 'P0002'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'review_id',r.id,'decision',r.decision,'rationale',r.rationale,
    'reviewed_by_name',sp.full_name,'reviewed_at',r.created_at,
    'approval',case when a.id is null then null else jsonb_build_object(
      'approval_id',a.id,'outcome',a.outcome,'approval_note',a.approval_note,
      'approved_by_name',ap.full_name,'approved_at',a.created_at
    ) end
  ) order by r.created_at desc,r.id desc),'[]'::jsonb)
  into v_reviews
  from public.staff_task_investigation_signal_reviews r
  left join public.staff_profiles sp on sp.id = r.reviewed_by_staff_profile_id and sp.clinic_id = r.clinic_id
  left join lateral (
    select aa.* from public.staff_task_investigation_signal_review_approvals aa
    where aa.review_id = r.id and aa.clinic_id = p_clinic_id
    order by aa.created_at desc,aa.id desc limit 1
  ) a on true
  left join public.staff_profiles ap on ap.id = a.approved_by_staff_profile_id and ap.clinic_id = a.clinic_id
  where r.clinic_id = p_clinic_id and r.signal_id = p_signal_id;

  return jsonb_build_object('read_only',true,'clinic_id',p_clinic_id,
    'signal_id',p_signal_id,'reviews',v_reviews,'generated_at',now());
end;
$function$;

revoke all on function public.record_hospital_investigation_signal_review(uuid,uuid,text,text) from public,anon;
revoke all on function public.approve_hospital_investigation_signal_review(uuid,uuid,text,text) from public,anon;
revoke all on function public.get_hospital_investigation_signal_review_register(uuid,uuid) from public,anon;
grant execute on function public.record_hospital_investigation_signal_review(uuid,uuid,text,text) to authenticated;
grant execute on function public.approve_hospital_investigation_signal_review(uuid,uuid,text,text) to authenticated;
grant execute on function public.get_hospital_investigation_signal_review_register(uuid,uuid) to authenticated;

comment on table public.staff_task_investigation_signal_reviews is
'Append-only human assessments of explainable investigation pattern signals; each new assessment preserves prior decisions.';
comment on table public.staff_task_investigation_signal_review_approvals is
'Append-only independent approval/rejection of confirmed operational-weakness conclusions; reviewer and approver must differ.';
