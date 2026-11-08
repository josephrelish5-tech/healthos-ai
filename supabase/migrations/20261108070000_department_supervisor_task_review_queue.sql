create or replace function public.get_department_supervisor_task_reviews(
  p_clinic_id uuid,
  p_department_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_department_name text;
  v_review_data jsonb;
  v_tasks jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_department_id is null then
    raise exception 'Clinic and department are required' using errcode = '22023';
  end if;
  v_review_data := public.get_supervisor_task_reviews(p_clinic_id);
  select d.department_name into v_department_name
  from public.clinic_departments d
  where d.id = p_department_id and d.clinic_id = p_clinic_id and d.is_active = true;
  if v_department_name is null then
    raise exception 'Active department not found' using errcode = 'P0002';
  end if;
  select coalesce(jsonb_agg(item.value order by item.value->>'submitted_at'), '[]'::jsonb)
    into v_tasks
  from jsonb_array_elements(coalesce(v_review_data->'tasks', '[]'::jsonb)) as item(value)
  where item.value->>'department_name' = v_department_name;
  return jsonb_build_object('department_id', p_department_id, 'department_name', v_department_name,
    'tasks', coalesce(v_tasks, '[]'::jsonb), 'generated_at', now());
end;
$function$;
revoke all on function public.get_department_supervisor_task_reviews(uuid, uuid) from public, anon;
grant execute on function public.get_department_supervisor_task_reviews(uuid, uuid) to authenticated;
