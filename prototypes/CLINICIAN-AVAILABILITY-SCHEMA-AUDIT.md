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

Important: both shift tables exist. Their current production use, RLS, and source-of-truth relationship must be established before availability is calculated from either. Do not create a third shift system.

### Telemedicine session
`healthos_telemedicine_sessions` already links appointment_request_id, clinic, department, patient, linked appointment, channel and scheduled_at. It enforces one session per appointment request. Keep this linkage.

## 2. Key architectural conclusion

The existing schema is a strong foundation, but it is not yet a complete clinician slot-booking system. A safe additive design should:
- use verified staff profiles + active department/role assignments + valid credentials to determine eligible clinicians;
- use the authoritative existing shift source as a hard boundary for availability;
- add a clinician-specific availability layer only if no existing schedule table already provides it;
- extend the appointment request with a clinician assignment and explicit end time only after checking dependent code, constraints and policies;
- prevent overlapping confirmed bookings at the database level, not only in the browser.

## 3. Proposed target model (not yet a migration)

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

## 4. Outstanding schema checks before implementation

- Determine which of `staff_shift_assignments` and `staff_shifts` is authoritative and how changes are audited.
- Inspect RLS policies and grants for all scheduling and staff tables.
- Inspect full definitions of `healthos_accept_patient_appointment_request`, appointment creation RPCs, and appointment update/cancel RPCs.
- Check whether other appointment tables or calendars exist under different names.
- Check clinic timezone storage and standardise display/slot generation.
- Inspect current status transitions and linked appointment side effects.
- Confirm existing credential verifier workflow can populate verified clinical roles; fail closed until it can.
- Confirm the appointment request's current CHECK constraint prevents adding statuses such as `rescheduled` without a deliberate migration.

## 5. Build and test order

1. Finish read-only schema/policy/RPC audit.
2. Select the canonical staff shift source.
3. Write an additive migration on the development branch only.
4. Implement secure RPCs for publish availability, list patient-facing slots, hold slot, confirm booking, propose alternative, cancel and reschedule.
5. Enforce overlap prevention and idempotency in PostgreSQL.
6. Build patient calendar/slot picker and clinician availability calendar.
7. Add scheduler assignment and hospital operational view.
8. Run synthetic tests for double booking, expiry, role/credential/shift revocation, clinic isolation, cancellation, rescheduling and concurrent requests.
9. Only after passing isolated tests, consider review for production rollout.

## 6. Explicit non-actions

- No production migration applied.
- No production function or policy changed.
- No live UI changed or deployed.
- No paid provider service enabled.
- No real patient records used.
