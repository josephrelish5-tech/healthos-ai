-- Allow a hospital's authorised managers to view only the patient profiles
-- associated with connection requests made to their own clinic.
drop policy if exists "Hospital managers read profiles of requesting patients" on public.healthos_patient_profiles;
create policy "Hospital managers read profiles of requesting patients"
on public.healthos_patient_profiles
for select
to authenticated
using (
    exists (
        select 1
        from public.healthos_patient_hospital_links l
        join public.clinic_memberships m
          on m.clinic_id = l.clinic_id
         and m.user_id = auth.uid()
         and m.status = 'active'
         and m.role in ('owner','admin')
        where l.patient_user_id = healthos_patient_profiles.user_id
    )
    or exists (
        select 1
        from public.healthos_patient_hospital_links l
        join public.clinics c on c.id = l.clinic_id
        where l.patient_user_id = healthos_patient_profiles.user_id
          and c.owner_user_id = auth.uid()
    )
);
comment on policy "Hospital managers read profiles of requesting patients" on public.healthos_patient_profiles
is 'Restricts manager profile visibility to patients who have submitted a connection request to a clinic they manage.';
