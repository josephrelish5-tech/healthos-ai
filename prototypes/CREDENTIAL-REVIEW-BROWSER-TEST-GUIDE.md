# Credential Review Workspace — synthetic browser test guide

## Safety boundary
- Use only the three synthetic accounts in the HealthOS-Telemedicine-Test Supabase project.
- Do not enter real staff, licence, patient, or hospital information.
- This prototype is not part of the live HealthOS application.
- Do not apply the credential-lab SQL to the production Supabase project.

## Current test page
Open `credential-review-workspace-connected-test.html` from a local HTTP server or an approved static preview host. Do not rely on opening the HTML directly as a `file://` URL: its JavaScript module imports the Supabase client from a CDN and may be blocked by browser origin rules.

## Browser test sequence

### 1. Hospital Owner
1. Sign in using the synthetic Hospital Owner account.
2. Confirm the identity banner shows the synthetic hospital owner.
3. Confirm all three tabs are visible: My submissions, Review queue, Verifier management.
4. Appoint/activate the synthetic Credential Verifier.
5. Confirm the action succeeds.
6. Attempt to appoint an unmapped user only if a deliberately invalid synthetic UUID is available; it must be rejected.
7. Confirm the last active hospital owner cannot be deactivated.

### 2. Staff Member
1. Sign out and sign in using the synthetic Staff Member account.
2. Confirm only My submissions is visible.
3. Submit a fictional credential using a title such as `DEMO ONLY — Sample Nursing Qualification`, an issuing body such as `Synthetic Training Authority`, and an evidence reference beginning with `SYNTHETIC:`.
4. Confirm the new record appears with status `pending_verification`.
5. Confirm the Review queue and Verifier management tabs are not visible.
6. Attempting to call reviewer-only RPCs must be rejected by the backend.

### 3. Credential Verifier
1. Sign out and sign in using the synthetic Credential Verifier account.
2. Confirm My submissions and Review queue are visible, but Verifier management is hidden.
3. Confirm the synthetic staff submission appears in the pending queue.
4. Enter a meaningful fictional review reason and approve or reject the sample.
5. Confirm the decision is reflected in the queue and history.
6. Confirm the submitter can see the status but not private reviewer notes or reviewer identity.

### 4. Evidence to record
- Screenshots of each role's tabs and identity banner.
- Submission status before and after review.
- Review history as seen by the verifier and by the submitter.
- Any browser console or RPC error, with secrets and passwords excluded.

## What remains before this can be run
The connected HTML is currently source code in the development branch; it is not hosted and has not been run in a real browser. A browser-accessible preview host or local HTTP server is required. No hosting or production deployment is authorized by this guide.
