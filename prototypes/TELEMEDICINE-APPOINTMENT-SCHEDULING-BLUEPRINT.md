# HealthOS Telemedicine — Appointment and Scheduling Integration Blueprint

Status: development design specification only. No production database or live site changes.
Scope: synthetic-account development and later hospital rollout.

## 1. Existing workflow inspected

The current patient portal already:
- lets a signed-in patient choose a connected hospital and department;
- accepts a requested date/time, visit type (in-person/audio/video), reason and optional note;
- inserts a row into `healthos_patient_appointment_requests`;
- displays the patient's request status.

The department appointment inbox already:
- lists requests routed to the selected department;
- requires staff to match the request to a hospital patient record before acceptance;
- calls `healthos_accept_patient_appointment_request`;
- allows accepted audio/video requests to be prepared as telemedicine sessions.

This is a request-and-approval workflow, not yet a true clinician availability/slot-booking system. A patient can request a time, but the UI does not currently show verified clinician availability or reserve a slot. The inbox's acceptance flow also does not present a clinician assignment/availability choice.

## 2. Target patient journey

1. Patient selects a hospital from the public HealthOS directory.
2. Patient selects a department and consultation mode: in-person, audio or video.
3. For audio/video, patient sees only bookable slots generated from active clinicians' published availability and existing bookings.
4. Patient selects a slot and submits a request; the system temporarily holds it to prevent double booking.
5. Hospital workflow routes the request to the department's authorised scheduling team.
6. An authorised scheduler confirms the clinician and slot, or proposes alternatives.
7. Patient receives an in-app status and can accept an alternative, cancel, or request rescheduling.
8. On confirmation, the appointment is linked to the hospital appointment register and a telemedicine session is created for remote visits.
9. The patient reviews and grants consent for that specific consultation.
10. Only the patient and a verified, active, assigned clinician can enter the clinical workspace/video session.

## 3. Staff workflow

- Department scheduler: review incoming requests, assign an eligible clinician, confirm/reschedule/cancel, and monitor slot conflicts.
- Clinician: publish working availability only within approved shifts and active department assignments; view own schedule and assigned consultations.
- Nurse/triage staff: receive only workflows permitted by their verified role and department.
- Hospital administrator: operational scheduling oversight and exception handling; no automatic clinical workspace or video-token access.
- Platform administrator: platform-level configuration and audit oversight, not patient-care access by default.

## 4. Data model to add after schema compatibility review

Proposed additive tables (names are provisional until checked against existing schema):
- `healthos_telemedicine_availability`: clinic, department, staff profile, start/end, timezone, recurrence rule, slot duration, capacity, publication status, created/updated audit fields.
- `healthos_telemedicine_slot_holds`: slot, patient user, request, hold expiry, status; unique/locking strategy to prevent concurrent double booking.
- `healthos_telemedicine_booking_events`: append-only request/booking status history, actor, timestamp, reason and previous/new values.
- Optional `healthos_telemedicine_waitlist`: patient request, preferred windows, notification state.

Do not duplicate the existing appointment register. Confirm existing appointment tables, staff shift model, role/credential model, timezone conventions, cancellation rules and RLS before choosing final schema names.

## 5. Required backend rules

- All times stored as `timestamptz`; hospital timezone displayed to patients and staff.
- Reject past slots, inactive staff, expired shifts, unverified clinical roles, and staff without an active assignment to the selected department.
- Use database transactions/row locks or an equivalent exclusion constraint to prevent two patients reserving the same capacity.
- Slot holds expire automatically and cannot be treated as confirmed appointments.
- A confirmed appointment must have exactly one active clinician assignment unless a documented multi-clinician workflow is used.
- Rescheduling/cancellation must append audit events; never silently overwrite the history.
- Do not expose clinician private contact details or another patient's booking details.
- Keep patient consent separate from appointment acceptance and from video-room creation.
- Do not create a Daily room until the session is eligible and patient consent is current.
- No AI-only clinical triage or automatic diagnosis. Emergency symptoms must direct the patient to local emergency services/hospital care.
- Notifications must not contain sensitive clinical details in lock-screen previews.

## 6. Required UI surfaces

Patient:
- hospital/department/mode selection;
- available date and slots in local time;
- request/confirmation state;
- proposed alternatives, accept/decline;
- cancel/reschedule action and clear cancellation policy;
- appointment details and consent status.

Staff:
- department queue with requested slot;
- clinician assignment dropdown containing only eligible clinicians;
- calendar/day/week views;
- conflict warnings and slot capacity;
- confirm, propose alternative, reject with reason, cancel;
- audit timeline.

Clinician:
- own calendar;
- publish/unpublish availability within approved shift boundaries;
- assigned remote consultation list;
- no access to unassigned patients' clinical details.

Admin:
- operational capacity, wait times, unfilled requests, cancellations and no-shows;
- override actions require reason and audit event;
- no bypass of clinical credential verification.

## 7. Verification plan (synthetic accounts only)

1. Patient can view only public availability and their own requests.
2. Patient cannot reserve a slot belonging to another clinic.
3. Two synthetic patients attempting the same one-capacity slot cannot both confirm.
4. Unverified, expired, inactive or unassigned clinician cannot publish availability or receive a clinical assignment.
5. Scheduler can only assign clinicians eligible for that clinic and department.
6. Patient can accept or decline a proposed alternative.
7. Cancellation/rescheduling preserves the complete event history.
8. Patient consent is required per consultation; revocation blocks new meeting tokens.
9. Hospital admin can view operational metrics but cannot join as a clinician or read clinical notes solely due to admin status.
10. All screens and workflows are checked at mobile widths and on Android browser.

## 8. Release gates

- Keep the work on a development branch and draft PR.
- Inspect existing appointment/shift/credential schema before writing migrations.
- Run migration and RPC tests in the isolated synthetic test project first.
- Complete two-party synthetic video tests only after the provider plan/BAA gate is resolved.
- Do not copy production patient data into the test project.
- No production migration, Edge Function deployment, PR merge or paid provider activation without explicit approval.
- Real patient use remains blocked until provider compliance, clinical governance, privacy/security review, operational support and end-to-end testing are complete.
