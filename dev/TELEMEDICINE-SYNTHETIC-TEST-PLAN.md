# HealthOS Telemedicine — Synthetic Test Plan

**Environment:** GitHub development branch `telemedicine-synthetic-dev`  
**Test page:** `dev/telemedicine-synthetic-test.html`  
**Data classification:** Fictional test data only  
**Production impact:** None. This plan and the browser-only simulator do not call Supabase, Daily, Render, or any production endpoint.

## Purpose

Validate the intended consultation consent and session workflow before any real patient video feature is enabled. The simulator is a workflow demonstration, not a security certification or an integration test.

## Test identities

- `TEST-PATIENT-001` — fictional patient
- `TEST-DOCTOR-001` — fictional doctor
- `TEST-NURSE-001` — fictional nurse
- `TEST-ADMIN-001` — fictional administrator

These are selectable labels, not authenticated accounts. They must never be treated as real HealthOS users.

## Acceptance test cases

| ID | Scenario | Expected result |
|---|---|---|
| TM-SYN-01 | Doctor requests join before consent | Join is blocked. |
| TM-SYN-02 | Nurse requests join before consent | Join is blocked. |
| TM-SYN-03 | Patient grants consent | Consent becomes granted in browser memory only. |
| TM-SYN-04 | Doctor requests join after consent | Simulated join is allowed. |
| TM-SYN-05 | Nurse requests join after consent | Simulated join is allowed. |
| TM-SYN-06 | Doctor attempts to grant/revoke consent | Action is blocked. |
| TM-SYN-07 | Patient revokes consent | Further join requests are blocked. |
| TM-SYN-08 | Patient attempts to complete session | Action is blocked. |
| TM-SYN-09 | Staff completes session | Session becomes completed. |
| TM-SYN-10 | Staff requests join after completion | Action is blocked. |
| TM-SYN-11 | Browser page is refreshed | Synthetic state resets; no server record exists. |
| TM-SYN-12 | Admin role is selected | It remains a simulator role only; no production privileges are granted. |

## Required production safeguards before real consultations

Do not enable real patient video until all items below have been reviewed and approved:

1. Confirm the selected video provider's current healthcare terms, pricing, data-processing terms, and any required signed BAA. Do not assume an API key alone enables healthcare-compliant use.
2. Keep the existing Edge Function provider gate in place until the provider/compliance decision is documented. Do not set healthcare flags to true just to test.
3. Review every telemedicine `SECURITY DEFINER` RPC for `auth.uid()`, clinic membership, patient/staff relationship, role authorization, and session-state checks.
4. Verify RLS and RPC access together. RLS being enabled does not protect a table from an unsafe `SECURITY DEFINER` function.
5. Restrict CORS to the actual HealthOS application origins; do not leave wildcard CORS for a production credential-bearing endpoint unless a documented security review approves it.
6. Review who may create, join, complete, cancel, or view a session. Apply least privilege; administrator status must not automatically imply clinical access.
7. Require explicit, current patient consent before issuing meeting credentials. Re-check consent immediately before credential issuance and define what happens if consent is revoked during a consultation.
8. Keep recording disabled unless a separate legal, clinical, security, retention, and consent review approves it.
9. Confirm audit events for consent grant/revocation, credential issuance, joins/leaves, session completion, and failed authorization. Do not log API keys, meeting tokens, or unnecessary clinical content.
10. Test with a separate development provider/project and fictional data. Do not use production patient records for testing.
11. Complete a documented end-to-end test on Android, including low-bandwidth and interrupted-network scenarios.
12. Obtain explicit operational approval from the hospital before enabling the feature for real patients.

## Cost and deployment guardrails

- Do not create paid Supabase branches, projects, add-ons, or provider resources without showing the price and receiving explicit approval.
- Do not enable Daily healthcare features or real video credentials without the required provider/compliance checks.
- This simulator is local browser behavior only; opening it does not create a video call or incur video participant-minute charges.
- Keep this work on the development branch. Do not merge to `main` or deploy to Render as part of this test-plan step.

## Current status

- Synthetic browser test bench exists on `telemedicine-synthetic-dev`.
- This checklist documents the expected tests and production release gates.
- Production telemedicine tables were empty at the time of the prior inspection.
- No production database, Edge Function, provider setting, or live website change is authorized by this development-only test plan.
