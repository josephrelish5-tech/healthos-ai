# HealthOS Telemedicine — Synthetic Test Plan

**Environment:** Development branch `telemedicine-synthetic-dev`  
**Test page:** `dev/telemedicine-synthetic-test.html`  
**Data:** Fictional identities and in-memory state only  
**Production impact:** None. The test page does not call Supabase, Daily, Render, or a production endpoint.

## Objective
Complete a bounded synthetic workflow test, then begin real-account preparation for a pilot hospital. The entire HealthOS blueprint does not need to be finished first. Real registration must remain gated on identity, clinic isolation, permissions, auditability, privacy, and recovery controls.

## Synthetic identities
- `TEST-PATIENT-001` — fictional patient
- `TEST-DOCTOR-001` — fictional doctor
- `TEST-NURSE-001` — fictional nurse
- `TEST-ADMIN-001` — fictional administrator

These are role labels in a browser simulator, not authenticated accounts. They must never be treated as actual HealthOS users.

## Automated acceptance tests
Run all tests using **Run all tests** in the development test bench.

| Test | Expected result |
|---|---|
| Doctor joins before consent | Blocked |
| Nurse joins before consent | Blocked |
| Patient grants consent | Consent granted in simulator memory |
| Doctor joins after consent | Allowed in simulator |
| Nurse joins after consent | Allowed in simulator |
| Doctor attempts to grant consent | Blocked |
| Doctor attempts to revoke consent | Blocked |
| Patient revokes consent during active session | Consent removed and session terminated in simulator |
| Patient attempts to complete session | Blocked |
| Doctor completes active session | Allowed in simulator |
| Staff attempts to rejoin completed session | Blocked |
| Administrator attempts clinical join/completion | Blocked; admin does not automatically receive clinical access |

The test page's pass result validates only its in-memory rules model. It is not evidence that the deployed application, database, RPCs, RLS, Edge Functions, or video provider enforce the same rules.

## Real-account preparation — minimum pilot gate

### A. Hospital and clinic tenancy
- A hospital/clinic must be created and approved before users are attached to it.
- Every doctor, nurse, patient, appointment, consultation, and clinical record must be scoped to the correct clinic.
- Cross-clinic access must be denied and tested, including direct API/RPC attempts.

### B. Identity and registration
- Hospital administrator creates the first doctor and nurse using verified email or another approved identity-verification process.
- Staff receive a secure invitation or one-time setup flow; no shared default passwords.
- Users set their own password and complete recovery setup.
- Doctor/nurse role, department, professional registration details, and account status are validated before clinical privileges are granted.
- First patient registration collects only necessary information, records the registering clinic, and avoids exposing patient data in public directories.

### C. Authorization and audit
- Verify authentication on every protected route and server-side function.
- Review RLS and every privileged RPC together, including `SECURITY DEFINER` functions.
- Enforce clinic membership and least-privilege role checks on the server, not only in the browser.
- Separate administrator operations from clinical access.
- Log account creation, invitation, role changes, access denials, consent actions, and relevant record changes without logging secrets or unnecessary clinical content.

### D. Privacy, recovery and operations
- Confirm privacy notice, lawful processing basis, consent wording where required, retention/deletion process, incident response, and NDPA responsibilities with the pilot hospital.
- Test password reset, suspended/deactivated users, lost access, and administrator handover.
- Confirm backups and a tested restore process before real clinical records are entered.
- Complete Android testing and low-bandwidth/interrupted-network checks.

### E. Telemedicine-specific release gate
- Review provider healthcare terms, data-processing terms, pricing, and any required signed BAA before enabling real video.
- An API key alone is not evidence of healthcare-compliant configuration.
- Keep provider credentials and real video disabled until the review is complete.
- Require explicit, current patient consent before issuing meeting credentials; define and test revocation during a call.
- Keep recording disabled unless separately approved.
- Test using a separate development provider/project and fictional data first.

## Cost and deployment guardrails
- No paid Supabase branches, projects, add-ons, Daily healthcare features, or provider resources without showing the cost and receiving explicit approval.
- No production database changes, real patient records, live video, merge to `main`, or Render deployment as part of synthetic testing.
- Keep the test work isolated on `telemedicine-synthetic-dev`.

## Current status
- Browser-only synthetic test bench exists and its role/consent test model has been strengthened.
- Automated tests have been added, but they still need to be run in a browser and the results reported.
- Production authorization, database, and provider controls have not been certified by these tests.
- Next step after the synthetic suite passes: a read-only audit of the actual Supabase schema, RLS policies, RPCs, and relevant Edge Functions, followed by a minimum real-account readiness checklist. Do not create real users until that audit passes.
