# Clinician Availability Engine — Schema Inspection & Implementation Plan

Inspection date: 2026-11-11
Target: telemedicine development branch
Production schema inspection was read-only. No production rows, schema, policies, or functions were changed.

## 1. Existing structures confirmed in the live schema

### Patient appointment requests
`healthos_patient_appointment_requests` already stores:
- patient_user_id, clinic_id, department_id
- requested_at (timestamptz)
- visit_type: in_person, audio, video
- status: requested, accepted, rejected, cancelled
- patient_note, hospital_note, reviewed_by/reviewed_at
- linked_appointment_id and linked_patient_record_id

The request table currently has no clinician/staff assignment field and no explicit slot duration.

### Hospital appointment register
`appointments` currently stores:
- clinic_id, patient_id, scheduled_at
- reason, status, notes, created_by

It does not currently expose a clinician/staff owner or end time in the inspected columns. Do not replace or duplicate this register.

### Staff availability foundations
Existing tables:
- `staff_profiles`: clinic, user, employment_status, professional_role and registration number.
- `staff_department_assignments`: staff_profile_id, department_id, assignment_status, effective_from/effective_to.
- `staff_assignment_roles`: role assignment and effective dates.
- `clinic_professional_roles`: clinical_role, registration_required, registration_body, active flag.
- `staff_credential_competency_records`: credential type, professional role, registration number, expiry, verification status and verifier.
- `staff_shift_assignments`: staff_profile_id, clinic_id, shift_type, starts_at, ends_at, status.
- `staff_shifts`: another shift representation with staff_profile_id, shift_date, shift_type, starts_at, ends_at, attendance status.

### Latest production evidence: shift source and row counts
Read-only production counts at inspection time:
- appointments: 25 existing records
- healthos_patient_appointment_requests: 0
- healthos_telemedicine_sessions: 0
- staff_shift_assignments: 0
- staff_shifts: 1
- staff_credential_competency_records: 0

This indicates `staff_shifts` is the only one of the two shift tables currently holding a row, but a single row does not prove it is the authoritative source. Before choosing it, inspect its triggers, writers, UI consumers, audit events, and whether `staff_shift_assignments` is an older or newer parallel implementation. Do not create a third shift system or migrate rows automatically.

### RLS and grants observed
RLS is enabled on all inspected scheduling, staff and credential tables.
- `appointments` has clinic-member read controls and role-scoped insert/update policies.
- `healthos_patient_appointment_requests` has patient-own read/create policies and hospital/assigned-department review policies.
- `staff_shifts` has admin management and staff-own read policies.
- `staff_shift_assignments` has an admin-management policy.
- `staff_profiles` has self/admin read and admin write policies.
- `staff_credential_competency_records` currently allows clinic-member read and pending submission; verification must be separately authorised.
- Several staff/credential tables show no direct table grants to ordinary authenticated users; access may be mediated by RPCs.

The grants query needs a second, role-specific confirmation before any migration. Do not loosen table grants as a shortcut.

## 2. Important production security finding — telemedicine RPCs

The current production definitions were inspected and are older than the proposed changes on the unmerged development PR.

At present:
- `healthos_get_telemedicine_workspace` treats clinic owner/admin and any user assigned to the department as staff-authorised to retrieve consultation workspace data.
- `healthos_mark_telemedicine_session_active` allows owner/admin or a department-assigned user to activate a session after checking provider reference and patient consent; it does not itself require the dedicated verified-clinician predicate.
- `healthos_send_telemedicine_message` uses the same broad owner/admin/department-assignment pattern for non-patient users.
- `healthos_complete_telemedicine_session` also allows owner/admin or department-assigned users to complete a session.
- `healthos_accept_patient_appointment_request` accepts a department-assigned reviewer without verifying that the reviewer is the assigned, credential-verified clinician.

This is a production observation, not a change. PR #16 contains proposed tighter clinician boundaries for some of these operations, but it remains unmerged and unvalidated. Before any live telemedicine release, review and close every affected RPC path consistently, including complete-session and message access, not only provider-token issuance.

## 3. Key architectural conclusion

The existing schema is a strong foundation, but it is not yet a complete clinician slot-booking system. A safe additive design should:
- use verified staff profiles + active department/role assignments + valid credentials to determine eligible clinicians;
- use the authoritative existing shift source as a hard boundary for availability;
- add a clinician-specific availability layer only if no existing schedule table already provides it;
- extend the appointment request with a clinician assignment and explicit end time only after checking dependent code, constraints and policies;
- prevent overlapping confirmed bookings at the database level, not only in the browser.

## 4. Proposed target model (not yet a migration)

### Clinician availability
A clinic/department/staff-profile availability record with:
- start_at and end_at (timestamptz)
- slot_duration_minutes
- recurrence metadata only if recurrence is needed; materialise bookable slots for actual dates
- publication status and audit actor/timestamps
- optional consultation modes (audio/video/in-person)

The clinician must be active, assigned to the department for the entire slot, hold an active clinical role, and have matching verified, unexpired credential evidence according to role requirements. The shift must cover the slot.

### Booking allocation
A booking/slot allocation must identify:
- request id, clinic id, department id, staff_profile_id
- starts_at, ends_at, booking state and expiry for temporary holds
- created_by and event history

A PostgreSQL exclusion constraint or transaction-safe locking strategy must prevent overlapping active allocations for the same clinician. A unique slot key alone is insufficient where slot lengths vary.

### Existing appointment integration
When a booking is confirmed:
1. lock the request and slot allocation;
2. revalidate patient, clinic, department, clinician, credential and shift;
3. create/link the existing `appointments` row;
4. update the request status/linkage and record the clinician/time assignment;
5. create the telemedicine session only for audio/video requests;
6. append immutable booking events.

All steps must succeed or roll back together. Do not create duplicate appointment rows on retry.

## 5. Remaining checks before implementation

- Inspect triggers, writers, UI consumers and audit history for both shift tables to select the canonical source.
- Confirm all table grants separately for anon/authenticated and service roles.
- Inspect full definitions and grants for appointment cancel/reschedule RPCs and any additional appointment tables/calendars.
- Check clinic timezone storage and standardise display/slot generation.
- Inspect request status constraints and linked appointment side effects.
- Confirm credential verifier workflow can populate verified clinical roles; fail closed until it can.
- Review every telemedicine RPC for verified-clinician enforcement and patient-only consent authority.

## 6. Build and test order

1. Finish the remaining read-only schema/RPC audit.
2. Select the canonical staff shift source based on writers, consumers and audit evidence, not row count alone.
3. Write an additive migration on the development branch only.
4. Implement secure RPCs for publish availability, list patient-facing slots, hold slot, confirm booking, propose alternative, cancel and reschedule.
5. Enforce overlap prevention and idempotency in PostgreSQL.
6. Build patient calendar/slot picker and clinician availability calendar.
7. Add scheduler assignment and hospital operational view.
8. Run synthetic tests for double booking, expiry, role/credential/shift revocation, clinic isolation, cancellation, rescheduling and concurrent requests.
9. Only after passing isolated tests, consider review for production rollout.

## 7. Explicit non-actions

- No production migration applied.
- No production function or policy changed.
- No live UI changed or deployed.
- No paid provider service enabled.
- No real patient records used.
