// HealthOS
// Authentication and clinic workspace setup.
// Use fictional demonstration information only.

const SUPABASE_URL =
    "https://berfmuhqfuwcgpnqxrtm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_UIhbdxfxl8jsU9KnIE93pg_HTEsU39C";

// Authentication elements
const authPanel = document.getElementById("authPanel");
const authForm = document.getElementById("authForm");
const authHeading = document.getElementById("authHeading");
const authDescription = document.getElementById("authDescription");
const nameField = document.getElementById("nameField");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authSubmit = document.getElementById("authSubmit");
const authModeText = document.getElementById("authModeText");
const authModeToggle = document.getElementById("authModeToggle");
const authMessage = document.getElementById("authMessage");
const connectionStatus = document.getElementById("connectionStatus");

// Clinic setup elements
const clinicSetup = document.getElementById("clinicSetup");
const clinicForm = document.getElementById("clinicForm");
const clinicNameInput = document.getElementById("clinicName");
const clinicMessage = document.getElementById("clinicMessage");

// Dashboard elements
const appPanel = document.getElementById("appPanel");
// HEALTHOS AI: ADMIN VERIFICATION ELEMENTS
const adminVerification = document.getElementById("adminVerification");
const adminVerificationForm = document.getElementById("adminVerificationForm");
const adminVerificationPassword = document.getElementById("adminVerificationPassword");
const adminVerificationMessage = document.getElementById("adminVerificationMessage");
const adminVerificationSubmit = document.getElementById("adminVerificationSubmit");
const adminVerificationCancel = document.getElementById("adminVerificationCancel");
// HEALTHOS AI: SEPARATE WORKSPACE PAGE NAVIGATION
function showAdminWorkspacePage(pageId) {
    const allowed = ["adminOverview", "adminStaffActivity", "adminShifts", "adminTasks", "adminLeadership", "adminPerformance"];
    if (!allowed.includes(pageId)) pageId = "adminOverview";

    document.querySelectorAll("#adminStaffDashboard [data-workspace-page]").forEach(page => {
        page.hidden = page.dataset.workspacePage !== pageId;
    });
    
const staffAttendanceReportRun = document.getElementById("staffAttendanceReportRun");
if (staffAttendanceReportRun) staffAttendanceReportRun.addEventListener("click", () => {
    if (currentClinic) loadStaffAttendanceReport(currentClinic);
});
(function initialiseStaffAttendanceReportDates() {
    const start = document.getElementById("staffAttendanceReportStart");
    const end = document.getElementById("staffAttendanceReportEnd");
    if (!start || !end) return;
    const today = new Date();
    const local = d => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
    end.value = local(today);
    start.value = local(new Date(today.getTime()-6*86400000));
})();

document.querySelectorAll("#adminStaffDashboard [data-workspace-target]").forEach(button => {
        const active = button.dataset.workspaceTarget === pageId;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    window.scrollTo({ top: 0, behavior: "auto" });
}

function showHealthOSView(viewId) {
    // Navigation guard for owner-only workspace routes. Backend RLS remains authoritative.
    const ownerOnlyViews = ["multiFacilityManagement", "hospitalOwnerRegistration"];
    if (ownerOnlyViews.includes(viewId) &&
        !["owner", "clinic_owner", "super_admin"].includes(String(currentManagementRole || "").toLowerCase())) {
        alert("This workspace is reserved for the verified hospital owner.");
        return;
    }
    if (viewId === "hospitalMap") {
        showOnly("hospitalDiscovery");
        if (window.HealthOSHospitalDiscovery) window.HealthOSHospitalDiscovery.refresh();
        return;
    }
    if (viewId === "dashboard" && !managementVerified) {
        showOnly(currentUser ? "verification" : "auth");
        return;
    }

    const mainContent = document.getElementById("dashboard");
    if (!mainContent) return;

    const allowedViews = ["dashboard", "hospitalOwnerRegistration", "hospitalMap", "staffManagement", "patients", "appointments", "whatsappIntake", "adminVoiceTranslator", "patientRecordSharing", "ussdDiagnostics", "multiFacilityManagement", "patientConnectionRequests", "globalReferrals", "internationalPayments", "telemedicineDashboard", "aiAnalytics", "patientFlow", "clinicalRecords", "clinicalScribe", "serviceCapture", "billing", "posReconciliation", "pharmacy", "reports"];
    if (!allowedViews.includes(viewId)) {
        alert("This page is not available yet.");
        return;
    }

    const requestedPanel = viewId === "dashboard" ? mainContent :
        document.getElementById(viewId === "staffManagement" ? "adminStaffDashboard" : viewId === "clinicalScribe" ? "clinicalRecords" : viewId);
    if (!requestedPanel) {
        alert("This workspace page could not be found.");
        return;
    }

    const pageElements = mainContent.querySelectorAll(
        ":scope > .welcome, :scope > #dashboardMessage, :scope > #workspaceLaunchpad, :scope > .stats-grid, " +
        ":scope > #adminStaffDashboard, :scope > #hospitalOwnerRegistration, :scope > #hospitalMap, :scope > #patients, :scope > #appointments, " +
        ":scope > #whatsappIntake, :scope > #adminVoiceTranslator, :scope > #patientRecordSharing, :scope > #ussdDiagnostics, :scope > #multiFacilityManagement, :scope > #patientConnectionRequests, :scope > #globalReferrals, :scope > #telemedicineDashboard, :scope > #aiAnalytics, :scope > #patientFlow, :scope > #clinicalRecords, :scope > #serviceCapture, :scope > #billing, :scope > #posReconciliation, " +
        ":scope > #pharmacy, :scope > #reports"
    );
    pageElements.forEach(element => {
        const isOverview = element.matches(".welcome, #dashboardMessage, #workspaceLaunchpad, .stats-grid");
        element.hidden = viewId === "dashboard" ? !isOverview : element !== requestedPanel;
    });

    // The AI Medical Scribe is a focused sub-workspace inside Clinical Records.
    const clinicalWorkspace = document.getElementById("clinicalRecords");
    if (clinicalWorkspace) {
        const scribeOnly = viewId === "clinicalScribe";
        Array.from(clinicalWorkspace.children).forEach(child => {
            if (child.id === "clinicalScribe") child.hidden = false;
            else if (child.matches(".panel-heading")) child.hidden = false;
            else child.hidden = scribeOnly;
        });
    }

    if (viewId === "staffManagement") showAdminWorkspacePage("adminOverview");
    if (viewId === "hospitalMap" && window.HealthOSHospitalDiscovery) window.HealthOSHospitalDiscovery.refresh();

    const assistantLauncher = document.getElementById("staffAssistantLauncher");
    if (assistantLauncher) assistantLauncher.hidden = false;

    document.querySelectorAll(".sidebar .nav-item").forEach(link => {
        const active = link.getAttribute("href") === "#" + viewId;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });

    window.scrollTo({ top: 0, behavior: "auto" });

    if (["clinicalRecords", "clinicalScribe"].includes(viewId) && typeof window.loadHealthOSClinicalRecords === "function") window.loadHealthOSClinicalRecords().catch(error => console.error("Clinical records refresh failed:", error));
    if (viewId === "patientFlow" && typeof window.loadPatientFlow === "function") window.loadPatientFlow().catch(error => console.error("Patient flow refresh failed:", error));
    if (viewId === "serviceCapture") loadServiceCaptureModule().catch(error => console.error("Service Capture module loading failed:", error));
    if (viewId === "posReconciliation" && typeof window.loadBankStatementImports === "function") window.loadBankStatementImports().catch(error => console.error("Bank statement panel failed:", error));
    if (viewId === "billing" && currentClinic && managementVerified) loadBillingData(currentClinic).catch(error => console.error("Department payment review refresh failed:", error));
    if (viewId === "whatsappIntake" && typeof window.loadWhatsappIntake === "function") window.loadWhatsappIntake().catch(error => console.error("WhatsApp intake refresh failed:", error));
    if (viewId === "adminVoiceTranslator" && typeof window.loadAdminVoiceTranslations === "function") window.loadAdminVoiceTranslations().catch(error => console.error("Administrative voice register refresh failed:", error));
    if (viewId === "patientRecordSharing" && typeof window.loadPatientRecordShares === "function") window.loadPatientRecordShares().catch(error => console.error("Patient record shares refresh failed:", error));
    if (viewId === "ussdDiagnostics" && typeof window.loadUssdDiagnosticRequests === "function") window.loadUssdDiagnosticRequests().catch(error => console.error("USSD diagnostic requests refresh failed:", error));
    if (viewId === "ussdDiagnostics" && typeof window.loadUssdCareRequests === "function") window.loadUssdCareRequests().catch(error => console.error("USSD care request inbox refresh failed:", error));
    if (viewId === "multiFacilityManagement" && typeof window.loadMultiFacilityManagement === "function") window.loadMultiFacilityManagement().catch(error => console.error("Multi-facility workspace refresh failed:", error));
    if (viewId === "patientConnectionRequests") {
        window.loadPatientConnectionRequests?.().catch(error => console.error("Patient connection requests refresh failed:", error));
        window.loadPatientIdentityLinkRequests?.().catch(error => console.error("Patient identity-link requests refresh failed:", error));
    }
    if (viewId === "globalReferrals") { loadGlobalReferralOptions().catch(error => { const m=document.getElementById("globalReferralMessage"); if(m){m.textContent=friendlyError(error);m.className="message error";} }); loadGlobalReferralInbox(); }
    if (viewId === "internationalPayments" && currentClinic && managementVerified) loadInternationalPaymentWorkspace(currentClinic).catch(error => console.error("International payment workspace failed:",error));
    if (viewId === "telemedicineDashboard" && typeof loadTelemedicineDashboard === "function") loadTelemedicineDashboard();
    if (viewId === "aiAnalytics" && typeof window.loadAIAnalytics === "function") window.loadAIAnalytics().catch(error => console.error("AI analytics refresh failed:", error));
    if (viewId === "healthOSSecurityReview" && typeof window.loadHealthOSSecurityReview === "function") window.loadHealthOSSecurityReview().catch(error => console.error("Security review failed:", error));
}

document.querySelectorAll(".sidebar .nav-item").forEach(link => {
    link.addEventListener("click", function(event) {
        event.preventDefault();
        const viewId = (this.getAttribute("href") || "").replace(/^#/, "");
        if (viewId) {
            showHealthOSView(viewId);
            if (window.location.hash !== "#" + viewId) history.pushState({ healthOSView: viewId }, "", "#" + viewId);
        }
    });
});

document.querySelectorAll("#adminStaffDashboard [data-workspace-target]").forEach(button => {
    button.addEventListener("click", () => showAdminWorkspacePage(button.dataset.workspaceTarget));
});

window.addEventListener("popstate", () => showHealthOSView((window.location.hash || "#dashboard").slice(1)));
window.showHealthOSView = showHealthOSView;
const logoutButton = document.getElementById("logoutButton");
const currentUserLabel = document.getElementById("currentUserLabel");
const currentClinicLabel = document.getElementById("currentClinicLabel");
const dashboardMessage = document.getElementById("dashboardMessage");

let supabaseClient = null;
let isSignUpMode = false;
let currentUser = null;
let currentClinic = null;
// Management access remains locked until verification succeeds.
let managementVerified = false;
let currentManagementRole = null;
// Show a message in the authentication area.
function showAuthMessage(message, type = "") {
    authMessage.textContent = message;
    authMessage.className =
        "message" + (type ? " " + type : "");
}

// Show a message in the clinic setup area.
function showClinicMessage(message, type = "") {
    clinicMessage.textContent = message;
    clinicMessage.className =
        "message" + (type ? " " + type : "");
}

// Show a message in the dashboard.
function showDashboardMessage(message, type = "") {
    dashboardMessage.textContent = message;
    dashboardMessage.className =
        "dashboard-message" + (type ? " " + type : "");
}

// Display only the requested screen.

// Display only the requested HealthOS workspace.
function showOnly(screen) {
    authPanel.hidden = screen !== "auth";
        const recoveryPanel = document.getElementById("passwordRecoveryPanel");
    if (recoveryPanel) recoveryPanel.hidden = screen !== "passwordRecovery";
    clinicSetup.hidden = screen !== "clinic";
    appPanel.hidden = screen !== "dashboard";
    const publicDiscoveryScreen = document.getElementById("publicHospitalDiscoveryScreen");
    if (publicDiscoveryScreen) publicDiscoveryScreen.hidden = screen !== "hospitalDiscovery";
    const patientPortal = document.getElementById("patientPortal");
    if (patientPortal) patientPortal.hidden = screen !== "patientPortal";
    adminVerification.hidden = screen !== "verification";
    // HEALTHOS AI: STAFF REGISTRATION PANEL VISIBILITY
    const staffRegistrationPanel =
        document.getElementById("staffRegistrationPanel");

    if (staffRegistrationPanel) {
        staffRegistrationPanel.hidden =
            screen !== "staffRegistration";
    }
    const staffWorkspace =
        document.getElementById("staffWorkspace");

    if (staffWorkspace) {
        staffWorkspace.hidden = screen !== "staff";
    }

    logoutButton.hidden = !currentUser;
}

// Switch between sign-in and account creation.
function setMode(signUp) {
    isSignUpMode = signUp;

    authHeading.textContent = signUp
        ? "Create your HealthOS account"
        : "Welcome to HealthOS";

    authDescription.textContent = signUp
        ? "Create an account to begin setting up your clinic workspace."
        : "Sign in to access your healthcare operations workspace.";

    nameField.hidden = !signUp;
    fullNameInput.required = signUp;

    passwordInput.autocomplete = signUp
        ? "new-password"
        : "current-password";

    authSubmit.textContent = signUp
        ? "Create account"
        : "Sign in";

    authModeText.textContent = signUp
        ? "Already have an account?"
        : "New to HealthOS?";

    authModeToggle.textContent = signUp
        ? "Sign in"
        : "Create an account";

    showAuthMessage("");
}

// Convert common authentication errors into clearer messages.
function friendlyError(error) {
    const message = error?.message ||
        "Something went wrong. Please try again.";

    if (/invalid login credentials/i.test(message)) {
        return "Email or password is incorrect. Please try again.";
    }

    if (/user already registered/i.test(message)) {
        return "This email is already registered. Please sign in.";
    }

    if (/password should be at least/i.test(message)) {
        return "Please use a password with at least 8 characters.";
    }

    if (/email not confirmed/i.test(message)) {
        return "Please confirm your email before signing in.";
    }

    if (/failed to fetch|networkerror|fetch failed/i.test(message)) {
        return "Connection failed. Check your internet and try again.";
    }

    if (/row-level security|permission denied|violates row-level security/i.test(message)) {
        return "Database permission blocked this action. Please check the workspace database policies.";
    }

    return message;
}
// HEALTHOS AI: VERIFY MANAGEMENT ACCESS
async function verifyManagementAccess(password) {
    if (!supabaseClient || !currentUser || !currentClinic) {
        throw new Error(
            "Your account or clinic workspace is not ready. Please sign in again."
        );
    }

    if (!currentUser.email || !password) {
        throw new Error(
            "Enter your existing account password."
        );
    }

    // Re-authenticate the existing account with Supabase.
    const { data: authData, error: authError } =
        await supabaseClient.auth.signInWithPassword({
            email: currentUser.email,
            password: password
        });

    if (authError) {
        throw new Error(
            "Password verification failed. Check your password and try again."
        );
    }

    if (!authData.user || authData.user.id !== currentUser.id) {
        throw new Error(
            "The verified account does not match your signed-in account."
        );
    }

    // Check the user's active management role in this clinic.
    const { data: membership, error: membershipError } =
        await supabaseClient
            .from("clinic_memberships")
            .select("role, status")
            .eq("clinic_id", currentClinic.id)
            .eq("user_id", currentUser.id)
            .eq("status", "active")
            .maybeSingle();

    if (membershipError) {
        throw new Error(
            "We could not verify your clinic role. Please contact your administrator."
        );
    }

    if (
        !membership ||
        !["owner", "admin"].includes(membership.role)
    ) {
        throw new Error(
            "Access denied. Only authorised clinic owners and administrators can open management."
        );
    }

    return String(membership.role || "").toLowerCase();
}

// Update the management landing identity from the verified clinic membership role.
// This changes presentation only; database policies and server-side permissions remain authoritative.
function updateManagementWorkspaceIdentity(role) {
    const isOwner = ["owner", "clinic_owner", "super_admin"].includes(String(role || "").toLowerCase());
    document.querySelectorAll("[data-owner-only]").forEach(control => {
        control.hidden = !isOwner;
        control.setAttribute("aria-hidden", isOwner ? "false" : "true");
    });
    const banner = document.getElementById("managementRoleBanner");
    const heading = document.getElementById("workspaceLaunchpadHeading");
    const description = document.querySelector("#workspaceLaunchpad .workspace-launchpad-heading .muted");
    const normalizedRole = String(role || "").toLowerCase();

    if (!["owner", "admin"].includes(normalizedRole)) {
        if (banner) banner.textContent = "Management access is not verified.";
        return;
    }

    document.documentElement.dataset.managementRole = normalizedRole;
    if (heading) {
        heading.textContent = normalizedRole === "owner"
            ? "Hospital Owner Workspace"
            : "Hospital Administrator Workspace";
    }
    if (description) {
        description.textContent = normalizedRole === "owner"
            ? "Hospital-wide leadership, oversight and authorised management work areas."
            : "Daily hospital operations, staff coordination and authorised administrative work areas.";
    }
    if (banner) {
        banner.textContent = normalizedRole === "owner"
            ? "OWNER ACCESS · Strategic oversight and hospital-wide management"
            : "ADMINISTRATOR ACCESS · Operational management within assigned authority";
    }
}

// HEALTHOS AI: CONNECT ADMIN VERIFICATION FORM
adminVerificationForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const password = adminVerificationPassword.value;

    if (!currentUser || !currentClinic) {
        adminVerificationMessage.textContent =
            "Your session has expired. Please sign in again.";

        adminVerificationMessage.className = "message error";
        showOnly("auth");
        return;
    }

    adminVerificationSubmit.disabled = true;
    adminVerificationSubmit.textContent = "Verifying...";

    adminVerificationMessage.textContent =
        "Checking your password and management permissions...";

    adminVerificationMessage.className = "message";

    try {
        currentManagementRole = await verifyManagementAccess(password);
        managementVerified = true;
        updateManagementWorkspaceIdentity(currentManagementRole);
        adminVerificationMessage.textContent =
            "Verification successful. Opening your dashboard...";

        currentClinicLabel.textContent = currentClinic.name;

        showOnly("dashboard");
        showHealthOSView("dashboard");

               await loadBillingData(currentClinic);

        // HEALTHOS AI: LOAD ADMIN STAFF DASHBOARD
        await loadAdminStaffDashboard(currentClinic);
        await loadDepartmentPerformanceDashboard(currentClinic);
        await loadHospitalDepartmentCommand(currentClinic);
    // HEALTHOS AI: AUTOMATIC ADMIN STAFF DASHBOARD REFRESH
if (window.healthOSAdminStaffRefresh) {
    clearInterval(window.healthOSAdminStaffRefresh);
}

window.healthOSAdminStaffRefresh = setInterval(async function () {
    if (currentUser && currentClinic && managementVerified) {
        await loadAdminStaffDashboard(currentClinic);
        await loadDepartmentPerformanceDashboard(currentClinic);
        await loadHospitalDepartmentCommand(currentClinic);
    }
}, 15000);
// END HEALTHOS AI: AUTOMATIC ADMIN STAFF DASHBOARD REFRESH    
// HEALTHOS AI: LOAD STAFF SHIFT OPTIONS
await loadManagementAppointments(currentClinic);
await loadTaskAssignmentOptions(currentClinic);
await loadStaffShiftOptions(currentClinic);
    } catch (error) { 
        console.error(
            "HealthOS management verification failed:",
            error
        );

        adminVerificationMessage.textContent =
            friendlyError(error);

        adminVerificationMessage.className = "message error";

        adminVerificationPassword.value = "";
        adminVerificationPassword.focus();

    } finally {
        adminVerificationSubmit.disabled = false;
        adminVerificationSubmit.textContent = "Verify and Continue";
    }
});

// Return to sign-in when verification is cancelled.
adminVerificationCancel.addEventListener("click", async function () {
    adminVerificationPassword.value = "";
    adminVerificationMessage.textContent = "";
    
    managementVerified = false;
    
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }

    currentUser = null;
    currentClinic = null;

    showOnly("auth");
});
// HEALTHOS AI: STAFF SELF-SERVICE PROFILE SUBMISSION
async function showStaffProfileSubmission(user, clinic) {
    const workspace = document.getElementById("staffWorkspace");

    if (!workspace) {
        throw new Error(
            "Staff profile form is unavailable. Refresh and try again."
        );
    }

    Array.from(workspace.children).forEach(function (child, index) {
        if (index > 0) {
            child.hidden = true;
        }
    });

    let panel = document.getElementById(
        "staffProfileSubmissionPanel"
    );

    if (!panel) {
        panel = document.createElement("section");
        panel.id = "staffProfileSubmissionPanel";
        panel.className = "panel";
        workspace.appendChild(panel);
    }

    panel.hidden = false;
    panel.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Complete Your Staff Profile";
    panel.appendChild(heading);

    const intro = document.createElement("p");
    intro.className = "muted";
    intro.textContent =
        "Enter your real hospital details. Your submission will remain pending until an authorised clinic administrator verifies it. Selecting a role does not grant access or permissions.";
    panel.appendChild(intro);

    const { data: pending, error: pendingError } =
        await supabaseClient
            .from("staff_profile_submissions")
            .select("id, status, submitted_at")
            .eq("user_id", user.id)
            .eq("clinic_id", clinic.id)
            .eq("status", "pending")
            .limit(1);

    if (pendingError) {
        throw pendingError;
    }

    if (pending && pending.length > 0) {
        const status = document.createElement("p");
        status.className = "message";
        status.setAttribute("role", "status");
        status.textContent =
            "Your staff details have been submitted and are awaiting administrator verification. Staff work areas will remain locked until approval.";
        panel.appendChild(status);
        return;
    }

    const form = document.createElement("form");
    form.id = "staffProfileSubmissionForm";

    function addField(labelText, id, required, placeholder) {
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = labelText;

        const input = document.createElement("input");
        input.id = id;
        input.name = id;
        input.type = "text";
        input.required = required;
        input.maxLength = 120;

        if (placeholder) {
            input.placeholder = placeholder;
        }

        label.appendChild(input);
        form.appendChild(label);

        return input;
    }

    addField(
        "Full legal name",
        "staffSelfFullName",
        true,
        "Enter your full name"
    );

    addField(
        "Hospital-issued staff ID",
        "staffSelfId",
        true,
        "Enter the ID issued by your hospital"
    );

    addField(
        "Department",
        "staffSelfDepartment",
        true,
        "e.g. Clinical Services or Pharmacy"
    );

    const roleLabel = document.createElement("label");
    roleLabel.htmlFor = "staffSelfRole";
    roleLabel.textContent = "Professional role (for verification)";

    const roleSelect = document.createElement("select");
    roleSelect.id = "staffSelfRole";
    roleSelect.name = "staffSelfRole";
    roleSelect.required = true;

    [
        ["", "Select your role"],
        ["clinician", "Clinician"],
        ["doctor", "Doctor"],
        ["surgeon", "Surgeon"],
        ["dentist", "Dentist"],
        ["nurse", "Nurse"],
        ["pharmacy", "Pharmacy"],
        ["laboratory", "Laboratory"],
        ["reception", "Reception"],
        ["medical_records", "Medical Records"],
        ["finance_manager", "Finance Manager"],
        ["billing", "Billing"],
        ["staff", "Other / General Staff"]
    ].forEach(function (choice) {
        const option = document.createElement("option");
        option.value = choice[0];
        option.textContent = choice[1];
        roleSelect.appendChild(option);
    });

    roleLabel.appendChild(roleSelect);
    form.appendChild(roleLabel);

    addField(
        "Professional registration number (if applicable)",
        "staffSelfRegistration",
        false,
        "Optional"
    );

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "primary-button";
    submit.textContent = "Submit for Verification";
    form.appendChild(submit);

    const message = document.createElement("p");
    message.className = "message";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    form.appendChild(message);

    panel.appendChild(form);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (
            !currentUser ||
            currentUser.id !== user.id ||
            !currentClinic ||
            currentClinic.id !== clinic.id
        ) {
            message.textContent =
                "Your session or clinic selection changed. Please sign in again.";
            message.className = "message error";
            return;
        }

        submit.disabled = true;
        submit.textContent = "Submitting...";
        message.textContent =
            "Saving your details for administrator review...";
        message.className = "message";

        try {
            const payload = {
                clinic_id: clinic.id,
                user_id: user.id,
                full_name: document
                    .getElementById("staffSelfFullName")
                    .value.trim(),
                staff_id: document
                    .getElementById("staffSelfId")
                    .value.trim(),
                department: document
                    .getElementById("staffSelfDepartment")
                    .value.trim(),
                professional_role: roleSelect.value,
                professional_registration_number:
                    document
                        .getElementById("staffSelfRegistration")
                        .value.trim() || null
            };

            const { error } = await supabaseClient
                .from("staff_profile_submissions")
                .insert(payload);

            if (error) {
                throw error;
            }

            form.replaceChildren();

            const confirmation = document.createElement("p");
            confirmation.className = "message success";
            confirmation.setAttribute("role", "status");
            confirmation.textContent =
                "Submission received. Your profile is pending administrator verification. Staff work areas will remain locked until approval.";

            form.appendChild(confirmation);
        } catch (error) {
            console.error(
                "Staff profile submission failed:",
                error
            );

            message.textContent =
                error.code === "23505"
                    ? "A pending submission already exists for your account. Refresh to check its status."
                    : friendlyError(error);

            message.className = "message error";
            submit.disabled = false;
            submit.textContent = "Submit for Verification";
        }
    });
}
// HEALTHOS AI: STAFF LOGIN AND ONLINE PRESENCE
// HEALTHOS AI: STAFF ATTENDANCE WORKSPACE

async function loadStaffAttendanceWorkspace(staffProfileId, clinicId) {
    const statusElement =
        document.getElementById("staffAttendanceStatus");

    const shiftElement =
        document.getElementById("staffAssignedShift");

    const clockInTimeElement =
        document.getElementById("staffClockInTime");

    const clockOutTimeElement =
        document.getElementById("staffClockOutTime");

    const clockInButton =
        document.getElementById("staffClockInButton");

    const clockOutButton =
        document.getElementById("staffClockOutButton");

    const messageElement =
        document.getElementById("staffAttendanceMessage");

    if (
        !statusElement ||
        !shiftElement ||
        !clockInTimeElement ||
        !clockOutTimeElement ||
        !clockInButton ||
        !clockOutButton ||
        !messageElement
    ) {
        console.error("Staff attendance interface is incomplete.");
        return;
    }

    clockInButton.disabled = true;
    clockOutButton.disabled = true;

    messageElement.textContent = "Loading attendance...";
    messageElement.className = "message";

    try {
        // Load attendance sessions independently of assigned shifts.
        const {
            data: sessions,
            error: sessionsError
        } = await supabaseClient
            .from("staff_attendance_sessions")
            .select("id, clocked_in_at, clocked_out_at")
            .eq("staff_profile_id", staffProfileId)
            .eq("clinic_id", clinicId)
            .order("clocked_in_at", { ascending: false })
            .limit(100);

        if (sessionsError) {
            throw sessionsError;
        }

        const attendanceSessions = sessions || [];

        const openSession = attendanceSessions.find(
            function (session) {
                return !session.clocked_out_at;
            }
        );

        const latestClockInSession =
            attendanceSessions[0] || null;

        const latestClosedSession =
            attendanceSessions.find(function (session) {
                return Boolean(session.clocked_out_at);
            }) || null;

        // Display the latest recorded clock-in.
        clockInTimeElement.textContent =
            latestClockInSession
                ? new Date(
                    latestClockInSession.clocked_in_at
                ).toLocaleString()
                : "—";

        // Display the most recent completed clock-out.
        clockOutTimeElement.textContent =
            latestClosedSession
                ? new Date(
                    latestClosedSession.clocked_out_at
                ).toLocaleString()
                : "—";

        // Attendance does not require a scheduled shift.
        shiftElement.textContent =
            "Optional — not required to clock in";

        statusElement.textContent =
            openSession
                ? "Clocked In"
                : "Not Clocked In";

        // Enable only the action appropriate to the current session.
        clockInButton.disabled = Boolean(openSession);
        clockOutButton.disabled = !openSession;

        messageElement.textContent =
            openSession
                ? "Your attendance session is open. Clock out when your duties are complete."
                : "You can clock in now. An assigned shift is not required.";

        messageElement.className = "message";

        // CLOCK IN
        clockInButton.onclick = async function () {
            clockInButton.disabled = true;
            clockOutButton.disabled = true;

            messageElement.textContent =
                "Recording your clock-in...";

            messageElement.className = "message";

            try {
                const {
                    data: clockInResult,
                    error: clockInError
                } = await supabaseClient.rpc(
                    "staff_record_attendance_session",
                    {
                        p_action: "clock_in"
                    }
                );

                if (clockInError) {
                    throw clockInError;
                }

                console.info(
                    "Staff clock-in recorded:",
                    clockInResult
                );

                messageElement.textContent =
                    "Clock-in recorded successfully.";

                messageElement.className =
                    "message success";

                await loadStaffAttendanceWorkspace(
                    staffProfileId,
                    clinicId
                );
            } catch (error) {
                console.error(
                    "Staff clock-in failed:",
                    error
                );

                messageElement.textContent =
                    error.message ||
                    "Clock-in could not be recorded.";

                messageElement.className =
                    "message error";

                await loadStaffAttendanceWorkspace(
                    staffProfileId,
                    clinicId
                );
            }
        };

        // CLOCK OUT
        clockOutButton.onclick = async function () {
            clockInButton.disabled = true;
            clockOutButton.disabled = true;

            messageElement.textContent =
                "Recording your clock-out...";

            messageElement.className = "message";

            try {
                const {
                    data: clockOutResult,
                    error: clockOutError
                } = await supabaseClient.rpc(
                    "staff_record_attendance_session",
                    {
                        p_action: "clock_out"
                    }
                );

                if (clockOutError) {
                    throw clockOutError;
                }

                console.info(
                    "Staff clock-out recorded:",
                    clockOutResult
                );

                messageElement.textContent =
                    "Clock-out recorded successfully.";

                messageElement.className =
                    "message success";

                await loadStaffAttendanceWorkspace(
                    staffProfileId,
                    clinicId
                );
            } catch (error) {
                console.error(
                    "Staff clock-out failed:",
                    error
                );

                messageElement.textContent =
                    error.message ||
                    "Clock-out could not be recorded.";

                messageElement.className =
                    "message error";

                await loadStaffAttendanceWorkspace(
                    staffProfileId,
                    clinicId
                );
            }
        };
    } catch (error) {
        console.error(
            "Staff attendance loading failed:",
            error
        );

        statusElement.textContent = "Unavailable";

        shiftElement.textContent =
            "Attendance unavailable";

        clockInTimeElement.textContent = "—";
        clockOutTimeElement.textContent = "—";

        clockInButton.disabled = true;
        clockOutButton.disabled = true;

        messageElement.textContent =
            error.message ||
            "Could not load your attendance.";

        messageElement.className = "message error";
    }
}
// END HEALTHOS AI: STAFF ATTENDANCE WORKSPACE

async function startStaffPresenceTracking(
    staffProfileId,
    clinicId
) {
       console.info("PRESENCE DEBUG: tracking function entered", {
        supabaseReady: Boolean(supabaseClient),
        userReady: Boolean(currentUser),
        staffProfileIdPresent: Boolean(staffProfileId),
        clinicIdPresent: Boolean(clinicId)
    }); 
    if (!supabaseClient || !currentUser) {
        throw new Error(
            "Staff session is unavailable. Please sign in again."
        );
    }

    const now = new Date().toISOString();

    // Record the staff member's successful portal login.
    console.info("PRESENCE DEBUG: attempting database upsert");
    const { error } = await supabaseClient
        .from("staff_presence")
        .upsert(
            {
                staff_profile_id: staffProfileId,
                clinic_id: clinicId,
                presence_status: "online",
                last_seen_at: now,
                last_login_at: now,
                updated_at: now
            },
            {
                onConflict: "staff_profile_id"
            }
        );

    if (error) {
        console.error(
            "Staff login presence could not be recorded:",
            error
        );

        throw new Error(
            "Your portal opened, but your online status could not " +
            "be recorded. Please refresh and try again."
        );
    }

    // Remember which staff member owns this active session.
    window.healthOSActiveStaffPresence = {
        staffProfileId: staffProfileId,
        clinicId: clinicId
    };

    // Clear any previous heartbeat timer.
    if (window.healthOSPresenceHeartbeat) {
        clearInterval(window.healthOSPresenceHeartbeat);
    }

    // Refresh online presence every minute while the portal is active.
    window.healthOSPresenceHeartbeat = setInterval(
        async function () {
            const active =
                window.healthOSActiveStaffPresence;

            if (
                !active ||
                active.staffProfileId !== staffProfileId ||
                active.clinicId !== clinicId
            ) {
                return;
            }

            const heartbeatTime =
                new Date().toISOString();

            const { error: heartbeatError } =
                await supabaseClient
                    .from("staff_presence")
                    .update({
                        presence_status: "online",
                        last_seen_at: heartbeatTime,
                        updated_at: heartbeatTime
                    })
                    .eq(
                        "staff_profile_id",
                        staffProfileId
                    )
                    .eq("clinic_id", clinicId);

            if (heartbeatError) {
                console.error(
                    "Staff online heartbeat failed:",
                    heartbeatError
                );
            }
        },
        60 * 1000
    );

    console.log(
        "HealthOS staff presence tracking started."
    );
}

// END HEALTHOS AI: STAFF LOGIN AND ONLINE PRESENCE
// Find the signed-in user's clinic.
// Load the signed-in user's verified clinic workspace.
// HEALTHOS AI: GLOBAL PATIENT ACCESS
let patientAuthIsSignUp = true;
const patientAuthForm = document.getElementById("patientAuthForm");
const patientAuthModeToggle = document.getElementById("patientAuthModeToggle");
const patientAuthSubmit = document.getElementById("patientAuthSubmit");
const patientAuthMessage = document.getElementById("patientAuthMessage");

function setPatientAuthMessage(message, type = "") {
    if (!patientAuthMessage) return;
    patientAuthMessage.textContent = message;
    patientAuthMessage.className = "message" + (type ? " " + type : "");
}

function setPatientAuthMode(isSignUp) {
    patientAuthIsSignUp = isSignUp;
    document.getElementById("patientFullName").parentElement.hidden = !isSignUp;
    document.getElementById("patientFullName").required = isSignUp;
    document.getElementById("patientPassword").autocomplete = isSignUp ? "new-password" : "current-password";
    patientAuthSubmit.textContent = isSignUp ? "Create patient account" : "Sign in";
    patientAuthModeToggle.textContent = isSignUp ? "Already have an account? Sign in" : "New patient? Create an account";
    setPatientAuthMessage("");
}

async function openPatientPortal(user) {
    currentUser = user;
    currentUserLabel.textContent = user.email || "Patient account";
    managementVerified = false;
    currentClinic = null;
    showOnly("patientPortal");
    document.getElementById("patientAuthForm").hidden = true;
    document.getElementById("patientPortalWorkspace").hidden = false;
    logoutButton.hidden = false;
    const profileResult = await supabaseClient
        .from("healthos_patient_profiles")
        .select("full_name, phone_e164, country_code, preferred_language")
        .eq("user_id", user.id)
        .maybeSingle();
    if (profileResult.error) throw profileResult.error;
    const profile = profileResult.data || {};
    document.getElementById("patientProfileName").value = profile.full_name || user.user_metadata?.full_name || "";
    document.getElementById("patientProfilePhone").value = profile.phone_e164 || "";
    document.getElementById("patientProfileCountry").value = profile.country_code || "";
    document.getElementById("patientProfileLanguage").value = profile.preferred_language || "en";
    await loadPatientHospitalLinks();
    await loadPatientIdentityRequests();
    await loadPatientRecordShareAccessRequests();
    await loadPatientAppointmentOptions();
    await loadPatientAppointmentList();
    await loadPatientGlobalReferrals();
    await loadPatientInternationalPayments();
    if (window.loadPatientPrivateFiles) await window.loadPatientPrivateFiles();
}

async function loadPatientHospitalLinks() {
    const target = document.getElementById("patientHospitalLinks");
    if (!target || !currentUser) return;
    target.replaceChildren();
    const { data, error } = await supabaseClient
        .from("healthos_patient_hospital_links")
        .select("id, clinic_id, status, requested_at")
        .eq("patient_user_id", currentUser.id)
        .order("requested_at", { ascending: false });
    if (error) throw error;
    if (!data || !data.length) {
        target.textContent = "You have not requested a hospital connection yet.";
        return;
    }
    const clinicIds = [...new Set(data.map(row => row.clinic_id))];
    const directoryResult = await supabaseClient
        .from("healthos_hospital_directory")
        .select("clinic_id, public_name, city, country_code")
        .in("clinic_id", clinicIds);
    if (directoryResult.error) throw directoryResult.error;
    const names = new Map((directoryResult.data || []).map(row => [row.clinic_id, row]));
    data.forEach(row => {
        const hospital = names.get(row.clinic_id);
        const card = document.createElement("article");
        card.className = "stat-card";
        const title = document.createElement("h3");
        title.textContent = hospital ? hospital.public_name : "Hospital";
        const detail = document.createElement("p");
        detail.textContent = hospital ? hospital.city + ", " + hospital.country_code : "Hospital listing unavailable";
        const status = document.createElement("p");
        status.textContent = "Request status: " + row.status.replace(/_/g, " ");
        card.append(title, detail, status);
        target.appendChild(card);
    });
}


async function loadPatientIdentityRequests() {
    const hospitalSelect = document.getElementById("patientIdentityClinic");
    const target = document.getElementById("patientIdentityRequests");
    if (!currentUser || !hospitalSelect || !target) return;

    hospitalSelect.replaceChildren(new Option("Loading connected hospitals...", ""));
    const linkResult = await supabaseClient
        .from("healthos_patient_hospital_links")
        .select("clinic_id")
        .eq("patient_user_id", currentUser.id)
        .eq("status", "verified");
    if (linkResult.error) throw linkResult.error;

    const clinicIds = [...new Set((linkResult.data || []).map(row => row.clinic_id))];
    if (!clinicIds.length) {
        hospitalSelect.replaceChildren(new Option("No approved hospital connections yet", ""));
        hospitalSelect.disabled = true;
    } else {
        const directoryResult = await supabaseClient
            .from("healthos_hospital_directory")
            .select("clinic_id,public_name,city,country_code")
            .in("clinic_id", clinicIds);
        if (directoryResult.error) throw directoryResult.error;
        hospitalSelect.replaceChildren(new Option("Choose a connected hospital", ""));
        (directoryResult.data || []).forEach(hospital => {
            hospitalSelect.add(new Option(
                hospital.public_name + " — " + hospital.city + ", " + hospital.country_code,
                hospital.clinic_id
            ));
        });
        hospitalSelect.disabled = false;
    }

    target.replaceChildren();
    const requestResult = await supabaseClient
        .from("healthos_patient_record_identity_requests")
        .select("id,clinic_id,patient_number,status,requested_at,reviewed_at,review_note")
        .eq("patient_user_id", currentUser.id)
        .order("requested_at", { ascending: false })
        .limit(100);
    if (requestResult.error) throw requestResult.error;

    const hospitalNames = new Map();
    const requestedClinicIds = [...new Set((requestResult.data || []).map(row => row.clinic_id))];
    if (requestedClinicIds.length) {
        const namesResult = await supabaseClient
            .from("healthos_hospital_directory")
            .select("clinic_id,public_name")
            .in("clinic_id", requestedClinicIds);
        if (namesResult.error) throw namesResult.error;
        (namesResult.data || []).forEach(row => hospitalNames.set(row.clinic_id, row.public_name));
    }

    if (!requestResult.data?.length) {
        target.textContent = "No hospital identity-link requests yet.";
        return;
    }

    requestResult.data.forEach(row => {
        const card = document.createElement("article");
        card.className = "stat-card";
        const title = document.createElement("h4");
        title.textContent = hospitalNames.get(row.clinic_id) || "Connected hospital";
        const number = document.createElement("p");
        number.textContent = "Patient number submitted: " + row.patient_number;
        const status = document.createElement("strong");
        status.textContent = "Identity match: " + row.status.replace(/_/g, " ");
        const date = document.createElement("p");
        date.textContent = "Requested: " + new Date(row.requested_at).toLocaleString();
        card.append(title, number, status, date);

        if (row.review_note) {
            const note = document.createElement("p");
            note.textContent = "Hospital review note: " + row.review_note;
            card.appendChild(note);
        }
        if (row.status === "matched") {
            const explanation = document.createElement("p");
            explanation.textContent = "The hospital matched your patient number. This identity link does not itself grant clinical record access; any record sharing requires separate permission.";
            const revoke = document.createElement("button");
            revoke.type = "button";
            revoke.className = "logout-button";
            revoke.textContent = "Revoke identity link";
            revoke.addEventListener("click", async () => {
                if (!window.confirm("Revoke this hospital identity link? This will not delete the hospital's clinical record.")) return;
                revoke.disabled = true;
                const { error } = await supabaseClient.rpc("healthos_patient_revoke_identity_link", {
                    p_clinic_id: row.clinic_id
                });
                if (error) {
                    document.getElementById("patientIdentityMessageStatus").textContent = friendlyError(error);
                    document.getElementById("patientIdentityMessageStatus").className = "message error";
                    revoke.disabled = false;
                    return;
                }
                document.getElementById("patientIdentityMessageStatus").textContent = "Identity link revoked. The hospital's original clinical record was not deleted.";
                document.getElementById("patientIdentityMessageStatus").className = "message success";
                await loadPatientIdentityRequests();
            });
            card.append(explanation, revoke);
        }
        target.appendChild(card);
    });
}


async function loadPatientRecordShareAccessRequests() {
    const target = document.getElementById("patientRecordShareAccessRequests");
    if (!target || !currentUser) return;
    target.replaceChildren();
    const { data, error } = await supabaseClient
        .from("patient_record_share_access_requests")
        .select("id,source_clinic_id,recipient_clinic_id,status,requested_at,patient_note,otp_verified_at")
        .eq("patient_user_id", currentUser.id)
        .order("requested_at", { ascending: false })
        .limit(100);
    if (error) throw error;
    if (!data?.length) {
        target.textContent = "No medical-record access requests.";
        return;
    }
    const ids = [...new Set(data.flatMap(row => [row.source_clinic_id, row.recipient_clinic_id]))];
    const { data: hospitals, error: hospitalError } = await supabaseClient
        .from("healthos_hospital_directory")
        .select("clinic_id,public_name,city,country_code")
        .in("clinic_id", ids);
    if (hospitalError) throw hospitalError;
    const names = new Map((hospitals || []).map(row => [row.clinic_id, row.public_name + " — " + row.city + ", " + row.country_code]));
    data.forEach(row => {
        const card = document.createElement("article");
        card.className = "stat-card";
        const heading = document.createElement("h4");
        heading.textContent = "Request from " + (names.get(row.recipient_clinic_id) || "receiving hospital");
        const source = document.createElement("p");
        source.textContent = "Records issued by: " + (names.get(row.source_clinic_id) || "connected hospital");
        const status = document.createElement("strong");
        status.textContent = "Status: " + row.status.replace(/_/g, " ");
        const time = document.createElement("p");
        time.textContent = "Requested: " + new Date(row.requested_at).toLocaleString();
        card.append(heading, source, status, time);
        if (row.status === "approved") {
            const otpStatus = document.createElement("p");
            otpStatus.textContent = row.otp_verified_at ? "Additional phone verification completed: " + new Date(row.otp_verified_at).toLocaleString() : "Additional phone verification is required."; 
            card.appendChild(otpStatus);
            if (!row.otp_verified_at) {
                const sendOtp = document.createElement("button");
                sendOtp.type = "button"; sendOtp.className = "primary-button";
                sendOtp.textContent = "Send verification code to my registered phone";
                const otpInput = document.createElement("input");
                otpInput.type = "text"; otpInput.inputMode = "numeric"; otpInput.autocomplete = "one-time-code";
                otpInput.maxLength = 6; otpInput.placeholder = "Enter 6-digit OTP";
                otpInput.setAttribute("aria-label", "Six-digit phone verification code");
                const verifyOtp = document.createElement("button");
                verifyOtp.type = "button"; verifyOtp.className = "logout-button"; verifyOtp.textContent = "Verify code";
                const otpMessage = document.createElement("p");
                otpMessage.className = "message"; otpMessage.setAttribute("role", "status");
                sendOtp.addEventListener("click", async () => {
                    sendOtp.disabled = true;
                    try {
                        const { data, error } = await supabaseClient.functions.invoke("healthos-patient-record-otp", { body: { action: "send", request_id: row.id } });
                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);
                        otpMessage.textContent = "Code sent to " + (data?.destination || "your registered phone") + ". It expires in 10 minutes."; 
                        otpMessage.className = "message success";
                    } catch (error) { otpMessage.textContent = friendlyError(error); otpMessage.className = "message error"; }
                    finally { sendOtp.disabled = false; }
                });
                verifyOtp.addEventListener("click", async () => {
                    const code = otpInput.value.trim();
                    if (!/^\d{6}$/.test(code)) { otpMessage.textContent = "Enter the six-digit code."; otpMessage.className = "message error"; return; }
                    verifyOtp.disabled = true;
                    try {
                        const { data, error } = await supabaseClient.functions.invoke("healthos-patient-record-otp", { body: { action: "verify", request_id: row.id, code } });
                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);
                        otpMessage.textContent = data?.message || "Phone verification completed."; otpMessage.className = "message success";
                        await loadPatientRecordShareAccessRequests();
                    } catch (error) { otpMessage.textContent = friendlyError(error); otpMessage.className = "message error"; }
                    finally { verifyOtp.disabled = false; }
                });
                card.append(sendOtp, otpInput, verifyOtp, otpMessage);
            }
        }
        if (row.status === "awaiting_patient_approval") {
            const approve = document.createElement("button");
            approve.type = "button"; approve.className = "primary-button"; approve.textContent = "Approve request";
            const reject = document.createElement("button");
            reject.type = "button"; reject.className = "logout-button"; reject.textContent = "Reject request";
            const respond = async (decision) => {
                approve.disabled = true; reject.disabled = true;
                const { error: responseError } = await supabaseClient.rpc("respond_patient_record_share_access", {
                    p_request_id: row.id, p_approve: decision, p_patient_note: null
                });
                if (responseError) {
                    approve.disabled = false; reject.disabled = false;
                    window.alert("Could not record your decision: " + friendlyError(responseError));
                    return;
                }
                await loadPatientRecordShareAccessRequests();
            };
            approve.addEventListener("click", () => {
                if (window.confirm("Approve this hospital's request? This records your consent for the request but does not itself release medical records.")) respond(true);
            });
            reject.addEventListener("click", () => {
                if (window.confirm("Reject this medical-record access request?")) respond(false);
            });
            card.append(approve, reject);
        }
        target.appendChild(card);
    });
}

const patientShareRecipientRequestForm = document.getElementById("patientShareRecipientRequestForm");
if (patientShareRecipientRequestForm) patientShareRecipientRequestForm.addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("patientShareRecipientRequestMessage");
    const button = patientShareRecipientRequestForm.querySelector('button[type="submit"]');
    if (!currentUser || !currentClinic?.id) {
        message.textContent = "Sign in to the receiving hospital workspace first.";
        message.className = "message error";
        return;
    }
    const code = document.getElementById("patientShareRecipientCode").value.trim();
    if (code.length < 20) {
        message.textContent = "Enter the complete access code.";
        message.className = "message error";
        return;
    }
    button.disabled = true;
    try {
        const { data, error } = await supabaseClient.rpc("request_patient_record_share_access", {
            p_share_code: code, p_recipient_clinic_id: currentClinic.id
        });
        if (error) throw error;
        message.textContent = "Request sent to the patient for approval. No medical records have been released.";
        message.className = "message success";
        patientShareRecipientRequestForm.reset();
        message.dataset.requestId = data;
    } catch (error) {
        message.textContent = friendlyError(error);
        message.className = "message error";
    } finally {
        button.disabled = false;
    }
});

const patientIdentityLinkForm = document.getElementById("patientIdentityLinkForm");
if (patientIdentityLinkForm) patientIdentityLinkForm.addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("patientIdentityMessageStatus");
    const button = document.getElementById("patientIdentitySubmit");
    if (!currentUser) {
        message.textContent = "Sign in to your patient account first.";
        message.className = "message error";
        return;
    }
    const clinicId = document.getElementById("patientIdentityClinic").value;
    const patientNumber = document.getElementById("patientIdentityNumber").value.trim();
    const patientMessage = document.getElementById("patientIdentityMessage").value.trim();
    if (!clinicId || patientNumber.length < 2 || !document.getElementById("patientIdentityConsent").checked) {
        message.textContent = "Choose an approved hospital, enter your hospital patient number and confirm consent.";
        message.className = "message error";
        return;
    }
    button.disabled = true;
    button.textContent = "Submitting request...";
    try {
        const { error } = await supabaseClient
            .from("healthos_patient_record_identity_requests")
            .insert({
                patient_user_id: currentUser.id,
                clinic_id: clinicId,
                patient_number: patientNumber,
                patient_message: patientMessage || null,
                consent_confirmed: true,
                consent_at: new Date().toISOString(),
                status: "requested"
            });
        if (error) throw error;
        message.textContent = "Identity-match request sent. The hospital must verify the patient number against its own record. No clinical record access has been granted.";
        message.className = "message success";
        patientIdentityLinkForm.reset();
        await loadPatientIdentityRequests();
    } catch (error) {
        message.textContent = friendlyError(error);
        message.className = "message error";
    } finally {
        button.disabled = false;
        button.textContent = "Request identity match";
    }
});


async function loadPatientAppointmentOptions() {
 const select=document.getElementById("patientAppointmentClinic"); if(!select||!currentUser)return;
 select.replaceChildren();
 const {data:links,error}=await supabaseClient.from("healthos_patient_hospital_links").select("clinic_id").eq("patient_user_id",currentUser.id).eq("status","verified");
 if(error)throw error; const ids=[...new Set((links||[]).map(x=>x.clinic_id))];
 if(!ids.length){select.add(new Option("Connect to a hospital and wait for approval first",""));select.disabled=true;return;}
 const {data,error:hError}=await supabaseClient.from("healthos_hospital_directory").select("clinic_id,public_name,city,country_code").in("clinic_id",ids);
 if(hError)throw hError;select.add(new Option("Choose a connected hospital",""));
 (data||[]).forEach(x=>select.add(new Option(x.public_name+" — "+x.city+", "+x.country_code,x.clinic_id)));select.disabled=false;
}
async function loadPatientAppointmentDepartments(clinicId) {
 const select=document.getElementById("patientAppointmentDepartment");
 if(!select)return;
 select.replaceChildren(new Option("Loading hospital departments...",""));
 select.disabled=true;
 if(!clinicId){select.replaceChildren(new Option("Select a hospital first",""));return;}
 const {data,error}=await supabaseClient.rpc("healthos_get_patient_departments",{p_clinic_id:clinicId});
 if(error){select.replaceChildren(new Option("Departments unavailable — refresh or reconnect",""));throw error;}
 select.replaceChildren(new Option("Choose the department for your concern",""));
 (data||[]).forEach(d=>select.add(new Option(d.department_name,d.id)));
 select.disabled=!(data||[]).length;
 if(!(data||[]).length)select.replaceChildren(new Option("No active departments listed",""));
}
document.getElementById("patientAppointmentClinic")?.addEventListener("change",event=>{
 loadPatientAppointmentDepartments(event.target.value).catch(error=>{
  const m=document.getElementById("patientAppointmentMessage");m.textContent=friendlyError(error);m.className="message error";
 });
});
async function loadPatientAppointmentList() {
 const target=document.getElementById("patientAppointmentList");if(!target||!currentUser)return;target.replaceChildren();
 const {data,error}=await supabaseClient.from("healthos_patient_appointment_requests").select("id,clinic_id,requested_at,reason,visit_type,status,created_at").eq("patient_user_id",currentUser.id).order("created_at",{ascending:false}).limit(100);
 if(error)throw error;if(!data?.length){target.textContent="No appointment requests yet.";return;}
 const ids=[...new Set(data.map(x=>x.clinic_id))];const {data:hospitals,error:hError}=await supabaseClient.from("healthos_hospital_directory").select("clinic_id,public_name").in("clinic_id",ids);if(hError)throw hError;
 const names=new Map((hospitals||[]).map(x=>[x.clinic_id,x.public_name]));
 data.forEach(row=>{const card=document.createElement("article");card.className="stat-card";const title=document.createElement("h3");title.textContent=names.get(row.clinic_id)||"Hospital";const date=document.createElement("p");date.textContent=new Date(row.requested_at).toLocaleString();const reason=document.createElement("p");reason.textContent=row.visit_type.replace(/_/g," ")+" · "+row.reason;const status=document.createElement("strong");status.textContent="Status: "+row.status;card.append(title,date,reason,status);target.appendChild(card);});
 await loadPatientTelemedicineSessions();
}
async function loadPatientTelemedicineSessions(){
 const target=document.getElementById("patientTelemedicineSessions");if(!target||!currentUser)return;
 target.replaceChildren();const {data,error}=await supabaseClient.rpc("healthos_get_my_telemedicine_sessions");
 if(error)throw error;const rows=Array.isArray(data)?data:(data||[]);
 if(!rows.length){target.textContent="No remote consultation sessions have been prepared yet.";return;}
 rows.forEach(row=>{
  const card=document.createElement("article");card.className="stat-card";
  const title=document.createElement("h3");title.textContent=row.hospital_name||"Hospital";
  const date=document.createElement("p");date.textContent=new Date(row.scheduled_at).toLocaleString();
  const channel=document.createElement("p");channel.textContent=(row.channel||"").toUpperCase()+" consultation";
  const status=document.createElement("strong");
  status.textContent=row.session_status==="awaiting_provider"?"Waiting for hospital to connect its secure consultation provider":row.session_status.replace(/_/g," ");
  card.append(title,date,channel,status);target.appendChild(card);
 });
}
const patientAppointmentForm=document.getElementById("patientAppointmentForm");
if(patientAppointmentForm)patientAppointmentForm.addEventListener("submit",async event=>{
 event.preventDefault();const message=document.getElementById("patientAppointmentMessage"),button=document.getElementById("patientAppointmentSubmit");
 if(!currentUser){message.textContent="Sign in to your patient account first.";message.className="message error";return;}
 const clinicId=document.getElementById("patientAppointmentClinic").value,departmentId=document.getElementById("patientAppointmentDepartment").value,dateValue=document.getElementById("patientAppointmentAt").value,when=new Date(dateValue),reason=document.getElementById("patientAppointmentReason").value.trim();
 if(!clinicId||!departmentId||!dateValue||Number.isNaN(when.getTime())||when<=new Date()||reason.length<3){message.textContent="Choose a connected hospital and department, a future date/time and enter a reason.";message.className="message error";return;}
 button.disabled=true;button.textContent="Sending request...";
 try{const {error}=await supabaseClient.from("healthos_patient_appointment_requests").insert({patient_user_id:currentUser.id,clinic_id:clinicId,department_id:departmentId,requested_at:when.toISOString(),reason,visit_type:document.getElementById("patientAppointmentType").value,patient_note:document.getElementById("patientAppointmentNote").value.trim()||null});if(error)throw error;
 message.textContent="Request sent. The hospital must confirm the appointment time.";message.className="message success";patientAppointmentForm.reset();await loadPatientAppointmentList();
 }catch(error){message.textContent=friendlyError(error);message.className="message error";}finally{button.disabled=false;button.textContent="Send appointment request";}
});

const openPatientAccessButton = document.getElementById("openPatientAccessButton");
if (openPatientAccessButton) openPatientAccessButton.addEventListener("click", () => {
    setPatientAuthMode(true);
    document.getElementById("patientAuthForm").hidden = false;
    document.getElementById("patientPortalWorkspace").hidden = true;
    setPatientAuthMessage("");
    showOnly("patientPortal");
});
if (patientAuthModeToggle) patientAuthModeToggle.addEventListener("click", () => setPatientAuthMode(!patientAuthIsSignUp));

/* Public and patient entry points for hospital discovery. */
window.openHealthOSHospitalDiscovery = function () {
    const publicScreen = document.getElementById("publicHospitalDiscoveryScreen");
    if (!publicScreen) {
        console.error("HealthOS: public hospital discovery screen not found.");
        return;
    }
    // Hide every top-level workspace screen, then reveal the public directory.
    ["authPanel","patientPortal","appPanel","clinicSetup","adminVerification","staffWorkspace","staffRegistrationPanel","passwordRecoveryPanel"].forEach(id => {
        const panel = document.getElementById(id);
        if (panel) panel.hidden = true;
    });
    publicScreen.hidden = false;
    publicScreen.removeAttribute("aria-hidden");
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
        if (window.HealthOSHospitalDiscovery) window.HealthOSHospitalDiscovery.refresh();
        const searchButton = document.getElementById("searchHospitalsButton");
        if (searchButton) searchButton.focus({ preventScroll: true });
    });
};
document.getElementById("openPublicHospitalDiscoveryButton")?.addEventListener("click", window.openHealthOSHospitalDiscovery);
document.getElementById("patientOpenHospitalDiscoveryButton")?.addEventListener("click", window.openHealthOSHospitalDiscovery);
document.getElementById("hospitalDiscoveryBackButton")?.addEventListener("click", () => {
    const patientPortal = document.getElementById("patientPortal");
    showOnly(currentUser && patientPortal && !patientPortal.hidden ? "patientPortal" : "auth");
});

const patientPortalBackButton = document.getElementById("patientPortalBackButton");
if (patientPortalBackButton) patientPortalBackButton.addEventListener("click", () => showOnly("auth"));

if (patientAuthForm) patientAuthForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!supabaseClient) return setPatientAuthMessage("Account service is not ready. Refresh and try again.", "error");
    const email = document.getElementById("patientEmail").value.trim();
    const password = document.getElementById("patientPassword").value;
    const fullName = document.getElementById("patientFullName").value.trim();
    patientAuthSubmit.disabled = true;
    patientAuthSubmit.textContent = patientAuthIsSignUp ? "Creating account..." : "Signing in...";
    try {
        let user;
        if (patientAuthIsSignUp) {
            const { data, error } = await supabaseClient.auth.signUp({
                email, password,
                options: { data: { full_name: fullName, account_type: "patient" }, emailRedirectTo: window.location.origin }
            });
            if (error) throw error;
            user = data.user;
            if (!data.session) {
                setPatientAuthMessage("Patient account request received. Confirm your email, then return here and sign in.", "success");
                return;
            }
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            user = data.user;
            if (user.user_metadata?.account_type !== "patient") {
                await supabaseClient.auth.signOut();
                throw new Error("This account is not registered as a patient account. Use the hospital or staff sign-in instead.");
            }
        }
        if (!user || user.user_metadata?.account_type !== "patient") {
            throw new Error("Patient account type could not be verified. Please contact support.");
        }
        await openPatientPortal(user);
        setPatientAuthMessage("You are signed in to your patient account.", "success");
    } catch (error) {
        console.error("Patient portal authentication failed:", error);
        setPatientAuthMessage(friendlyError(error), "error");
    } finally {
        patientAuthSubmit.disabled = false;
        patientAuthSubmit.textContent = patientAuthIsSignUp ? "Create patient account" : "Sign in";
    }
});

const patientProfileForm = document.getElementById("patientProfileForm");
if (patientProfileForm) patientProfileForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentUser) return;
    const message = document.getElementById("patientProfileMessage");
    const fullName = document.getElementById("patientProfileName").value.trim();
    const country = document.getElementById("patientProfileCountry").value.trim().toUpperCase();
    const payload = {
        user_id: currentUser.id,
        full_name: fullName,
        phone_e164: document.getElementById("patientProfilePhone").value.trim() || null,
        country_code: country || null,
        preferred_language: document.getElementById("patientProfileLanguage").value,
        updated_at: new Date().toISOString()
    };
    if (country && !/^[A-Z]{2}$/.test(country)) {
        message.textContent = "Enter a valid two-letter country code, such as NG or GB.";
        message.className = "message error";
        return;
    }
    const { error } = await supabaseClient.from("healthos_patient_profiles").upsert(payload, { onConflict: "user_id" });
    message.textContent = error ? friendlyError(error) : "Patient profile saved.";
    message.className = "message " + (error ? "error" : "success");
});

const useMyHospitalLocationButton = document.getElementById("useMyHospitalLocationButton");
if (useMyHospitalLocationButton) useMyHospitalLocationButton.addEventListener("click", () => {
    const message = document.getElementById("hospitalSearchMessage");
    const latitudeInput = document.getElementById("hospitalSearchLatitude");
    const longitudeInput = document.getElementById("hospitalSearchLongitude");
    if (!navigator.geolocation) {
        message.textContent = "Location is unavailable in this browser. You can still search using the location fields.";
        message.className = "message";
        return;
    }
    useMyHospitalLocationButton.disabled = true;
    message.textContent = "Requesting permission to use your location…";
    message.className = "message";
    navigator.geolocation.getCurrentPosition(position => {
        latitudeInput.value = position.coords.latitude.toFixed(6);
        longitudeInput.value = position.coords.longitude.toFixed(6);
        useMyHospitalLocationButton.disabled = false;
        message.textContent = "Your location is ready. Searching for verified hospitals nearby…";
        message.className = "message success";
        document.getElementById("searchHospitalsButton")?.click();
    }, error => {
        useMyHospitalLocationButton.disabled = false;
        const reason = error && error.code === 1
            ? "Location permission was not granted."
            : error && error.code === 3
                ? "Your location request timed out."
                : "Your location could not be determined.";
        message.textContent = reason + " You can still search by entering your city, state or LGA manually.";
        message.className = "message";
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
});

let hospitalDiscoverySearchRun = 0;
const searchHospitalsButton = document.getElementById("searchHospitalsButton");
if (searchHospitalsButton) searchHospitalsButton.addEventListener("click", async () => {
    const searchRun = ++hospitalDiscoverySearchRun;
    const message = document.getElementById("hospitalSearchMessage");
    const country = document.getElementById("hospitalSearchCountry").value.trim().toUpperCase();
    const latitudeInput = document.getElementById("hospitalSearchLatitude");
    const longitudeInput = document.getElementById("hospitalSearchLongitude");
    const cityValue = document.getElementById("hospitalSearchCity").value.trim();
    const state = document.getElementById("hospitalSearchState").value.trim();
    const region = document.getElementById("hospitalSearchRegion").value.trim();
    const lga = document.getElementById("hospitalSearchLga").value.trim().replace(/\s+(?:LGA|Local Government Area)$/i, "").trim();
    const specialty = document.getElementById("hospitalSearchSpecialty").value.trim();
    const hospitalNameQuery = document.getElementById("hospitalSearchName")?.value.trim() || "";
    // Derive Nigeria's geopolitical region from the selected state so a stale
    // or incorrectly typed region cannot exclude valid hospitals.
    const nigeriaRegions = {
        "abia":"South East","anambra":"South East","ebonyi":"South East","enugu":"South East","imo":"South East",
        "akwa ibom":"South South","bayelsa":"South South","cross river":"South South","delta":"South South","edo":"South South","rivers":"South South",
        "ekiti":"South West","lagos":"South West","ogun":"South West","ondo":"South West","osun":"South West","oyo":"South West",
        "benue":"North Central","fct":"North Central","federal capital territory":"North Central","kogi":"North Central","kwara":"North Central","nasarawa":"North Central","niger":"North Central","plateau":"North Central",
        "adamawa":"North East","bauchi":"North East","borno":"North East","gombe":"North East","taraba":"North East","yobe":"North East",
        "jigawa":"North West","kaduna":"North West","kano":"North West","katsina":"North West","kebbi":"North West","sokoto":"North West","zamfara":"North West"
    };
    const canonicalStateForRegion = state.toLowerCase().replace(/\\bstate of\\b/g,"").replace(/\\bstate\\b/g,"").replace(/\\s+/g," ").trim();
    const effectiveRegion = country === "NG" ? (nigeriaRegions[canonicalStateForRegion] || null) : (region || null);
    // Explicitly entered location fields take priority over any GPS coordinates
    // left over from an earlier "Use my location" action.
    const hasManualLocation = Boolean(cityValue || state || region || lga);
    if (!country || !/^[A-Z]{2}$/.test(country)) {
        message.textContent = "Enter a valid two-letter country code.";
        message.className = "message error";
        return;
    }
    searchHospitalsButton.disabled = true;
    message.textContent = "Finding your live location so we can search nearby hospitals first…";
    message.className = "message";
    let gpsNotice = "";
    try {
        // Use GPS only when the user has not entered a manual search area.
        // Never let an old GPS coordinate override a newly typed city/state/LGA.
        if (!hasManualLocation && (!latitudeInput.value.trim() || !longitudeInput.value.trim()) && navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 15000, maximumAge: 60000
                }));
                latitudeInput.value = position.coords.latitude.toFixed(6);
                longitudeInput.value = position.coords.longitude.toFixed(6);
            } catch (locationError) {
                const gpsCode = locationError && locationError.code;
                gpsNotice = gpsCode === 1
                    ? "Location permission was denied. Searching with your manually entered location instead."
                    : gpsCode === 2
                        ? "Your device could not determine its location. Searching with your manually entered location instead."
                        : gpsCode === 3
                            ? "GPS timed out. Searching with your manually entered location instead."
                            : "GPS is unavailable. Searching with your manually entered location instead.";
                console.info(gpsNotice, locationError);
            }
        } else if (!hasManualLocation && !navigator.geolocation && (!latitudeInput.value.trim() || !longitudeInput.value.trim())) {
            gpsNotice = "GPS is not supported in this browser. Searching with your manually entered location instead.";
        }
        const latitudeValue = latitudeInput.value.trim();
        const longitudeValue = longitudeInput.value.trim();
        const hasGps = !hasManualLocation && Boolean(latitudeValue && longitudeValue);
        const radiusControl = document.getElementById("hospitalSearchRadius");
        const requestedRadiusKm = Math.min(100, Math.max(10, Number(radiusControl?.value || 50)));
        if (!hasGps && !cityValue && !state && !region && !lga && !hospitalNameQuery) {
            throw new Error(gpsNotice ? gpsNotice + " Enter a city, state or LGA to continue." : "Allow location access to find hospitals near you, or enter a city, state or LGA.");
        }
        if (!hasGps && gpsNotice) {
            message.textContent = gpsNotice;
            message.className = "message";
        }
        const baseParams = {
            p_latitude: hasGps ? Number(latitudeValue) : null,
            p_longitude: hasGps ? Number(longitudeValue) : null,
            p_radius_km: hasGps ? requestedRadiusKm : null,
            p_country_code: country,
            // When GPS is available, coordinates take priority over manually entered
            // state/city/LGA filters so the first results are truly near the person.
            p_region: hasGps ? null : effectiveRegion,
            p_state: hasGps ? null : (state || null),
            p_city: hasGps ? null : (cityValue && cityValue.toLowerCase() !== "nearby" ? cityValue : null),
            p_lga: hasGps ? null : (lga || null),
            p_specialty: specialty || null,
            p_search: hospitalNameQuery || null,
            p_limit: 50,
            p_offset: 0
        };
        // Recenter the map independently of the hospital database request.
        // A slow/failed directory RPC must not leave the map at its old default location.
        if (window.HealthOSHospitalDiscovery) {
            await window.HealthOSHospitalDiscovery.focusSearchLocation(
                hasGps ? latitudeValue : null,
                hasGps ? longitudeValue : null,
                hasGps ? "your live location" : [lga, cityValue, state].filter(Boolean).join(", ")
            );
        }
        let hospitals = [];
        if (hasGps) {
            message.textContent = "Searching approved hospitals within " + requestedRadiusKm + " km of your live location…";
            const result = await supabaseClient.rpc("healthos_search_hospitals_v3", {
                ...baseParams, p_radius_km: requestedRadiusKm
            });
            if (result.error) throw result.error;
            hospitals = result.data || [];
            // Final fallback: search the capital city of the state containing
            // the user's GPS position (not Lagos by default).
            if (!hospitals.length) {
                const stateCapitals = {
                    "abia":"Umuahia","adamawa":"Yola","akwa ibom":"Uyo","anambra":"Awka",
                    "bauchi":"Bauchi","bayelsa":"Yenagoa","benue":"Makurdi","borno":"Maiduguri",
                    "cross river":"Calabar","delta":"Asaba","ebonyi":"Abakaliki","edo":"Benin City",
                    "ekiti":"Ado-Ekiti","enugu":"Enugu","gombe":"Gombe","imo":"Owerri",
                    "jigawa":"Dutse","kaduna":"Kaduna","kano":"Kano","katsina":"Katsina",
                    "kebbi":"Birnin Kebbi","kogi":"Lokoja","kwara":"Ilorin","lagos":"Ikeja",
                    "nasarawa":"Lafia","niger":"Minna","ogun":"Abeokuta","ondo":"Akure",
                    "osun":"Osogbo","oyo":"Ibadan","plateau":"Jos","rivers":"Port Harcourt",
                    "sokoto":"Sokoto","taraba":"Jalingo","yobe":"Damaturu","zamfara":"Gusau",
                    "federal capital territory":"Abuja","fct":"Abuja"
                };
                const canonicalState = value => String(value || "").toLowerCase()
                    .replace(/\bstate of\b/g, "")
                    .replace(/\bstate\b/g, "")
                    .replace(/\s+/g, " ").trim();
                let detectedState = state;
                if (hasGps) {
                    message.textContent = "Nearby search exhausted. Identifying your state to search its capital…";
                    try {
                        const reverseUrl = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat="
                            + encodeURIComponent(latitudeValue) + "&lon=" + encodeURIComponent(longitudeValue)
                            + "&zoom=5&addressdetails=1";
                        const geoResponse = await fetch(reverseUrl, { headers: { "Accept": "application/json" } });
                        if (geoResponse.ok) {
                            const geoData = await geoResponse.json();
                            const address = geoData.address || {};
                            detectedState = address.state || address.region || address.state_district || detectedState;
                            if (/abuja|federal capital/i.test([address.state, address.city, address.town, address.county].filter(Boolean).join(" "))) {
                                detectedState = "Federal Capital Territory";
                            }
                        }
                    } catch (geocodeError) {
                        console.warn("Could not resolve GPS coordinates to a Nigerian state; using the entered state if available.", geocodeError);
                    }
                }
                const capital = stateCapitals[canonicalState(detectedState)];
                if (capital) {
                    message.textContent = "No hospitals found within 100 km. Searching " + capital + ", the capital of " + detectedState + "…";
                    const capitalResult = await supabaseClient.rpc("healthos_search_hospitals_v3", {
                        ...baseParams, p_latitude: null, p_longitude: null, p_radius_km: null,
                        p_state: detectedState, p_region: null, p_city: capital, p_lga: null
                    });
                    if (capitalResult.error) throw capitalResult.error;
                    hospitals = capitalResult.data || [];
                } else {
                    message.textContent = "No hospitals found within 100 km. We could not identify your state for the capital-city fallback. Enter your state and search again.";
                }
            }
        } else {
            message.textContent = "Searching the location you entered…";
            const result = await supabaseClient.rpc("healthos_search_hospitals_v3", baseParams);
            if (result.error) throw result.error;
            hospitals = result.data || [];
            // Manual-location fallback follows the same state-capital rule when
            // the user supplied a state but no hospitals matched their entered area.
            if (!hospitals.length && state) {
                const manualStateKey = String(state).toLowerCase()
                    .replace(/\bstate of\b/g, "")
                    .replace(/\bstate\b/g, "")
                    .replace(/\s+/g, " ").trim();
                const manualStateCapitals = {
                    "abia":["Abia","Umuahia"],"adamawa":["Adamawa","Yola"],
                    "akwa ibom":["Akwa Ibom","Uyo"],"anambra":["Anambra","Awka"],
                    "bauchi":["Bauchi","Bauchi"],"bayelsa":["Bayelsa","Yenagoa"],
                    "benue":["Benue","Makurdi"],"borno":["Borno","Maiduguri"],
                    "cross river":["Cross River","Calabar"],"delta":["Delta","Asaba"],
                    "ebonyi":["Ebonyi","Abakaliki"],"edo":["Edo","Benin City"],
                    "ekiti":["Ekiti","Ado-Ekiti"],"enugu":["Enugu","Enugu"],
                    "gombe":["Gombe","Gombe"],"imo":["Imo","Owerri"],
                    "jigawa":["Jigawa","Dutse"],"kaduna":["Kaduna","Kaduna"],
                    "kano":["Kano","Kano"],"katsina":["Katsina","Katsina"],
                    "kebbi":["Kebbi","Birnin Kebbi"],"kogi":["Kogi","Lokoja"],
                    "kwara":["Kwara","Ilorin"],"lagos":["Lagos","Ikeja"],
                    "nasarawa":["Nasarawa","Lafia"],"niger":["Niger","Minna"],
                    "ogun":["Ogun","Abeokuta"],"ondo":["Ondo","Akure"],
                    "osun":["Osun","Osogbo"],"oyo":["Oyo","Ibadan"],
                    "plateau":["Plateau","Jos"],"rivers":["Rivers","Port Harcourt"],
                    "sokoto":["Sokoto","Sokoto"],"taraba":["Taraba","Jalingo"],
                    "yobe":["Yobe","Damaturu"],"zamfara":["Zamfara","Gusau"],
                    "fct":["Federal Capital Territory","Abuja"],
                    "federal capital territory":["Federal Capital Territory","Abuja"]
                };
                const entry = manualStateCapitals[manualStateKey];
                if (entry) {
                    message.textContent = "No hospitals matched that area. Searching " + entry[1] + ", the capital of " + entry[0] + "…";
                    const capitalResult = await supabaseClient.rpc("healthos_search_hospitals_v3", {
                        ...baseParams, p_region: null, p_state: entry[0], p_city: entry[1], p_lga: null
                    });
                    if (capitalResult.error) throw capitalResult.error;
                    hospitals = capitalResult.data || [];
                }
            }
        }
        // External map lookup is deferred until after database results render; it must not block search.
        // Load only published, server-moderated patient review summaries.
        await Promise.all(hospitals.map(async hospital => {
            hospital.review_count = 0;
            hospital.average_rating = null;
            if (hospital.listing_group !== "network") return;
            const summary = await supabaseClient.rpc("healthos_public_hospital_review_summary", {
                p_hospital_id: hospital.hospital_id
            });
            if (summary.error) {
                console.warn("Hospital review summary unavailable:", summary.error);
                return;
            }
            const row = Array.isArray(summary.data) ? summary.data[0] : summary.data;
            if (row) {
                hospital.review_count = Number(row.review_count || 0);
                hospital.average_rating = row.average_rating == null ? null : Number(row.average_rating);
            }
        }));
        if (window.HealthOSHospitalDiscovery) {
            window.HealthOSHospitalDiscovery.render(hospitals);
        }
        if (!hospitals.length) {
            message.textContent = hasGps
                ? "No approved hospital listings were found within 100 km or in your state capital yet."
                : "No hospitals found in this search area. Try another location.";
            message.className = "message";
            return;
        }
        const networkCount = hospitals.filter(h => h.listing_group === "network").length;
        const provisionalCount = hospitals.filter(h => h.listing_group === "provisional_external").length;
        const externalCount = hospitals.filter(h => h.listing_group === "other").length;
        message.textContent = networkCount + " verified HealthOS network hospital(s), "
            + provisionalCount + " unverified GRID3 facility record(s), and "
            + externalCount + " other external listing(s) found"
            + (hasGps ? " from your live-location search." : ". Unverified records are clearly labelled and are not HealthOS-verified hospitals.");
        message.className = "message success";
        // Supplement database results asynchronously; ignore late results from older searches.
        if (!hasGps && window.HealthOSHospitalDiscovery?.searchExternalHospitals) {
            const externalLocation = [lga, cityValue, state].filter(Boolean).join(", ");
            if (externalLocation) {
                const databaseMessage = message.textContent;
                window.HealthOSHospitalDiscovery.searchExternalHospitals(externalLocation, hospitalNameQuery)
                    .then(externalResults => {
                        if (searchRun !== hospitalDiscoverySearchRun || !Array.isArray(externalResults) || !externalResults.length) return;
                        const keys = new Set(hospitals.map(h => String(h.hospital_name || "").trim().toLowerCase() + "|" + Number(h.latitude || 0).toFixed(4) + "|" + Number(h.longitude || 0).toFixed(4)));
                        const additions = externalResults.filter(item => {
                            const key = String(item.hospital_name || "").trim().toLowerCase() + "|" + Number(item.latitude || 0).toFixed(4) + "|" + Number(item.longitude || 0).toFixed(4);
                            if (keys.has(key)) return false;
                            keys.add(key);
                            return true;
                        });
                        if (!additions.length) return;
                        hospitals.push(...additions);
                        window.HealthOSHospitalDiscovery.render(hospitals);
                        message.textContent = databaseMessage + " Live map listings added separately.";
                        message.className = "message success";
                    })
                    .catch(error => {
                        console.warn("Background OpenStreetMap lookup unavailable:", error);
                        if (searchRun === hospitalDiscoverySearchRun) message.textContent = databaseMessage + " Live map listings are temporarily unavailable.";
                    });
            }
        }
    } catch (error) {
        console.error("Hospital discovery search failed:", error);
        message.textContent = friendlyError(error);
        message.className = "message error";
    } finally {
        searchHospitalsButton.disabled = false;
    }
});

window.loadReviewableHospitalVisits = async function (hospitalId) {
    if (!currentUser) throw new Error("Sign in to your patient account to view completed visits.");
    const { data, error } = await supabaseClient.rpc("healthos_my_reviewable_hospital_visits", {
        p_hospital_id: hospitalId
    });
    if (error) throw new Error(error.message || "Could not load your completed visits.");
    return data || [];
};

window.submitHospitalReview = async function (hospitalId, encounterId, rating, reviewText) {
    if (!currentUser) throw new Error("Sign in to your patient account before submitting a review.");
    if (!encounterId) throw new Error("Enter the encounter ID from your completed visit record.");
    const { data, error } = await supabaseClient.rpc("healthos_submit_hospital_review", {
        p_hospital_id: hospitalId,
        p_encounter_id: encounterId,
        p_rating: rating,
        p_review_text: reviewText
    });
    if (error) throw new Error(error.message || "Review submission failed.");
    return data;
};

window.requestHospitalConnection = async function (hospitalId, button) {
    if (!currentUser) {
        setPatientAuthMessage("Sign in to your patient account before requesting a hospital connection.", "error");
        return;
    }
    button.disabled = true;
    try {
        const { data: hospital, error: lookupError } = await supabaseClient
            .from("healthos_hospital_directory")
            .select("clinic_id")
            .eq("id", hospitalId)
            .eq("verification_status", "verified")
            .maybeSingle();
        if (lookupError) throw lookupError;
        if (!hospital || !hospital.clinic_id) throw new Error("This hospital listing is not available for connection requests.");
        const { error } = await supabaseClient
            .from("healthos_patient_hospital_links")
            .upsert({ patient_user_id: currentUser.id, clinic_id: hospital.clinic_id, status: "pending" },
                { onConflict: "patient_user_id,clinic_id", ignoreDuplicates: true });
        if (error) throw error;
        button.textContent = "Request submitted";
        await loadPatientHospitalLinks();
    } catch (error) {
        setPatientAuthMessage(friendlyError(error), "error");
        button.disabled = false;
    }
};

/* HEALTHOS AI: HOSPITAL-SIDE PATIENT CONNECTION REQUEST REVIEW
 * RLS on healthos_patient_hospital_links is the authoritative clinic-owner/admin boundary.
 * A verified connection never grants clinical-record access.
 */
window.loadPatientConnectionRequests = async function loadPatientConnectionRequests() {
    const body = document.getElementById("patientConnectionRequestsBody");
    const message = document.getElementById("patientConnectionRequestsMessage");
    if (!body || !message) return;
    if (!supabaseClient || !currentUser || !currentClinic) {
        message.textContent = "Sign in to an active hospital workspace first.";
        message.className = "message error";
        return;
    }
    body.replaceChildren();
    message.textContent = "Loading requests for this hospital...";
    message.className = "message";
    try {
        const { data: links, error } = await supabaseClient
            .from("healthos_patient_hospital_links")
            .select("id, patient_user_id, status, patient_message, requested_at")
            .eq("clinic_id", currentClinic.id)
            .order("requested_at", { ascending: false })
            .limit(200);
        if (error) throw error;
        const rows = links || [];
        const pending = rows.filter(x => x.status === "pending").length;
        document.getElementById("patientConnectionPendingCount").textContent = pending;
        document.getElementById("patientConnectionApprovedCount").textContent = rows.filter(x => x.status === "verified").length;
        document.getElementById("patientConnectionRejectedCount").textContent = rows.filter(x => x.status === "rejected").length;
        if (!rows.length) {
            const tr = body.insertRow(), td = tr.insertCell();
            td.colSpan = 7;
            td.textContent = "No patient connection requests have been received.";
            message.textContent = "Request inbox loaded.";
            message.className = "message success";
            return;
        }
        const userIds = [...new Set(rows.map(x => x.patient_user_id))];
        const { data: profiles, error: profileError } = await supabaseClient
            .from("healthos_patient_profiles")
            .select("user_id, full_name, phone_e164, country_code")
            .in("user_id", userIds);
        if (profileError) throw profileError;
        const profileMap = new Map((profiles || []).map(x => [x.user_id, x]));
        rows.forEach(row => {
            const profile = profileMap.get(row.patient_user_id);
            const tr = body.insertRow();
            [
                new Date(row.requested_at).toLocaleString(),
                profile?.full_name || "Patient profile unavailable",
                profile?.phone_e164 || "—",
                profile?.country_code || "—",
                row.patient_message || "—",
                row.status.replace(/_/g, " ")
            ].forEach(value => {
                const td = tr.insertCell();
                td.textContent = value;
            });
            const action = tr.insertCell();
            if (row.status === "pending") {
                ["Approve", "Reject"].forEach(label => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = label === "Approve" ? "primary-button" : "logout-button";
                    button.textContent = label;
                    button.style.margin = "3px";
                    button.addEventListener("click", async () => {
                        if (!confirm(label + " this patient's hospital connection request? This does not share clinical records.")) return;
                        button.disabled = true;
                        const nextStatus = label === "Approve" ? "verified" : "rejected";
                        const { data: auth } = await supabaseClient.auth.getUser();
                        const { error: updateError } = await supabaseClient
                            .from("healthos_patient_hospital_links")
                            .update({ status: nextStatus, reviewed_at: new Date().toISOString(), reviewed_by: auth.user.id })
                            .eq("id", row.id)
                            .eq("clinic_id", currentClinic.id)
                            .eq("status", "pending");
                        if (updateError) {
                            message.textContent = friendlyError(updateError);
                            message.className = "message error";
                            button.disabled = false;
                            return;
                        }
                        message.textContent = "Request " + (nextStatus === "verified" ? "approved" : "rejected") + ".";
                        message.className = "message success";
                        await window.loadPatientConnectionRequests();
                    });
                    action.appendChild(button);
                });
            } else {
                action.textContent = "Reviewed";
            }
        });
        message.textContent = rows.length + " request(s) loaded for " + (currentClinic.name || "this hospital") + ".";
        message.className = "message success";
    } catch (error) {
        console.error("Patient connection request loading failed:", error);
        body.replaceChildren();
        const tr = body.insertRow(), td = tr.insertCell();
        td.colSpan = 7;
        td.textContent = "Requests could not be loaded. Check your hospital management permissions and database policies.";
        message.textContent = friendlyError(error);
        message.className = "message error";
    }
};
document.getElementById("refreshPatientConnectionRequests")?.addEventListener("click", () => {
    window.loadPatientConnectionRequests?.();
});

window.loadPatientIdentityLinkRequests = async function loadPatientIdentityLinkRequests() {
    const body = document.getElementById("patientIdentityLinkReviewBody");
    const message = document.getElementById("patientIdentityLinkReviewMessage");
    if (!body || !message) return;
    if (!supabaseClient || !currentUser || !currentClinic) {
        message.textContent = "Sign in to an active hospital workspace first.";
        message.className = "message error";
        return;
    }
    body.replaceChildren();
    message.textContent = "Loading patient identity-match requests...";
    message.className = "message";
    try {
        const { data: requests, error } = await supabaseClient
            .from("healthos_patient_record_identity_requests")
            .select("id,patient_user_id,patient_number,patient_message,status,requested_at")
            .eq("clinic_id", currentClinic.id)
            .order("requested_at", { ascending: false })
            .limit(200);
        if (error) throw error;
        const rows = requests || [];
        if (!rows.length) {
            const tr = body.insertRow(), td = tr.insertCell();
            td.colSpan = 6;
            td.textContent = "No patient identity-match requests have been received.";
            message.textContent = "Identity request queue loaded.";
            message.className = "message success";
            return;
        }

        const userIds = [...new Set(rows.map(row => row.patient_user_id))];
        const { data: profiles, error: profileError } = await supabaseClient
            .from("healthos_patient_profiles")
            .select("user_id,full_name,phone_e164")
            .in("user_id", userIds);
        if (profileError) throw profileError;
        const profileMap = new Map((profiles || []).map(profile => [profile.user_id, profile]));

        for (const request of rows) {
            const tr = body.insertRow();
            const profile = profileMap.get(request.patient_user_id);
            const cells = [
                new Date(request.requested_at).toLocaleString(),
                profile?.full_name || "Patient account",
                request.patient_number,
                "",
                request.patient_message || "—",
                request.status.replace(/_/g, " ")
            ];
            cells.forEach(value => {
                const td = tr.insertCell();
                td.textContent = value;
            });
            const matchCell = tr.cells[3];
            const decisionCell = tr.cells[5];

            if (request.status !== "requested") {
                decisionCell.textContent = "Reviewed";
                continue;
            }

            const { data: matches, error: matchError } = await supabaseClient
                .from("patients")
                .select("id,patient_number,first_name,last_name")
                .eq("clinic_id", currentClinic.id)
                .eq("patient_number", request.patient_number)
                .limit(10);
            if (matchError) throw matchError;

            const candidateSelect = document.createElement("select");
            candidateSelect.setAttribute("aria-label", "Select matching hospital patient record");
            candidateSelect.add(new Option(
                matches?.length ? "Select exact patient record" : "No matching patient number found",
                ""
            ));
            (matches || []).forEach(patient => {
                candidateSelect.add(new Option(
                    [patient.patient_number, patient.first_name, patient.last_name].filter(Boolean).join(" — "),
                    patient.id
                ));
            });
            candidateSelect.disabled = !matches?.length;
            matchCell.appendChild(candidateSelect);

            const reviewNote = document.createElement("input");
            reviewNote.type = "text";
            reviewNote.maxLength = 1000;
            reviewNote.placeholder = "Required review note";
            reviewNote.setAttribute("aria-label", "Identity match review note");
            decisionCell.appendChild(reviewNote);

            const approve = document.createElement("button");
            approve.type = "button";
            approve.className = "primary-button";
            approve.textContent = "Confirm match";
            approve.disabled = !matches?.length;
            approve.style.margin = "3px";
            approve.addEventListener("click", async () => {
                const patientId = candidateSelect.value;
                const note = reviewNote.value.trim();
                if (!patientId || note.length < 5) {
                    message.textContent = "Select the exact hospital patient record and enter at least five characters of review notes.";
                    message.className = "message error";
                    return;
                }
                if (!window.confirm("Confirm that this hospital patient record belongs to the patient account that submitted this request?")) return;
                approve.disabled = true;
                const { error: reviewError } = await supabaseClient.rpc("healthos_review_patient_identity_link_request", {
                    p_request_id: request.id,
                    p_decision: "matched",
                    p_patient_id: patientId,
                    p_review_note: note
                });
                if (reviewError) {
                    message.textContent = friendlyError(reviewError);
                    message.className = "message error";
                    approve.disabled = false;
                    return;
                }
                message.textContent = "Patient identity match confirmed and audit event recorded.";
                message.className = "message success";
                await window.loadPatientIdentityLinkRequests();
            });

            const reject = document.createElement("button");
            reject.type = "button";
            reject.className = "logout-button";
            reject.textContent = "Reject";
            reject.style.margin = "3px";
            reject.addEventListener("click", async () => {
                const note = reviewNote.value.trim();
                if (note.length < 5) {
                    message.textContent = "Enter at least five characters explaining why the request is rejected.";
                    message.className = "message error";
                    return;
                }
                if (!window.confirm("Reject this patient identity-match request?")) return;
                reject.disabled = true;
                const { error: reviewError } = await supabaseClient.rpc("healthos_review_patient_identity_link_request", {
                    p_request_id: request.id,
                    p_decision: "rejected",
                    p_patient_id: null,
                    p_review_note: note
                });
                if (reviewError) {
                    message.textContent = friendlyError(reviewError);
                    message.className = "message error";
                    reject.disabled = false;
                    return;
                }
                message.textContent = "Identity-match request rejected and audit event recorded.";
                message.className = "message success";
                await window.loadPatientIdentityLinkRequests();
            });
            decisionCell.append(approve, reject);
        }
        message.textContent = rows.length + " identity request(s) loaded for " + (currentClinic.name || "this hospital") + ".";
        message.className = "message success";
    } catch (error) {
        console.error("Patient identity-link request loading failed:", error);
        body.replaceChildren();
        const tr = body.insertRow(), td = tr.insertCell();
        td.colSpan = 6;
        td.textContent = "Identity requests could not be loaded. Check hospital management and patient-record permissions.";
        message.textContent = friendlyError(error);
        message.className = "message error";
    }
};
document.getElementById("refreshPatientIdentityLinkRequests")?.addEventListener("click", () => {
    window.loadPatientIdentityLinkRequests?.();
});

// END GLOBAL PATIENT ACCESS

async function openWorkspace(user) {
    if (user.user_metadata?.account_type === "patient") {
        await openPatientPortal(user);
        return;
    }
    currentUser = user;
    currentUserLabel.textContent =
        user.email || "Signed-in user";

    logoutButton.hidden = false;
    managementVerified = false;
    currentManagementRole = null;
    currentClinic = null;

    showOnly("clinic");
    showClinicMessage(
        "Checking your account, clinic membership and staff profile..."
    );

    try {
        if (!supabaseClient) {
            throw new Error(
                "Account service is not ready. Refresh and sign in again."
            );
        }

        // Check whether this user owns a clinic.
        const { data: ownedClinics, error: ownerError } =
            await supabaseClient
                .from("clinics")
                .select("id, name")
                .eq("owner_user_id", user.id)
                .order("created_at", { ascending: true })
                .limit(1);

        if (ownerError) throw ownerError;

        // Clinic owners must pass the existing management verification.
        if (ownedClinics && ownedClinics.length > 0) {
            showDashboard(ownedClinics[0]);
            return;
        }

        // Find the user's active clinic memberships.
        const { data: memberships, error: membershipError } =
            await supabaseClient
                .from("clinic_memberships")
                .select("clinic_id, role")
                .eq("user_id", user.id)
                .eq("status", "active");

        if (membershipError) throw membershipError;

        if (!memberships || memberships.length === 0) {
            throw new Error(
                "No active clinic membership was found for this account. " +
                "Ask your clinic administrator to verify your access."
            );
        }

        // Avoid silently choosing a clinic if the account belongs to
        // more than one clinic. Multi-clinic selection will be added later.
        if (memberships.length > 1) {
            throw new Error(
                "Your account belongs to more than one clinic. " +
                "Clinic selection must be completed before continuing."
            );
        }

        const membership = memberships[0];

        // Confirm the clinic exists and retrieve its name.
        const { data: clinic, error: clinicError } =
            await supabaseClient
                .from("clinics")
                .select("id, name")
                .eq("id", membership.clinic_id)
                .maybeSingle();

        if (clinicError) throw clinicError;

        if (!clinic) {
            throw new Error(
                "Your clinic could not be found. Contact your administrator."
            );
        } 
    // Store the verified clinic for staff operations.
        currentClinic = clinic;
        // Owners and administrators must use the verified management
        // dashboard. The membership role, not a form selection, governs this.
        if (
            membership.role === "owner" ||
            membership.role === "admin"
        ) {
            showDashboard(clinic);
            return;
        }

        // Retrieve this user's staff profile for this specific clinic.
        const { data: staffProfile, error: profileError } =
            await supabaseClient
                .from("staff_profiles")
                .select(
                "id, staff_id, full_name, department, professional_role, employment_status"
                )
                .eq("user_id", user.id)
                .eq("clinic_id", clinic.id)
                .maybeSingle();

        if (profileError) throw profileError;

        if (!staffProfile) {
    showOnly("staff");
    await showStaffProfileSubmission(user, clinic);
    return;
}

        if (staffProfile.employment_status !== "active") {
            throw new Error(
                "Your staff profile is not active. Contact your clinic administrator."
            );
        }
// HEALTHOS AI: START VERIFIED STAFF PRESENCE
 console.info("PRESENCE DEBUG: verified staff profile reached");
await startStaffPresenceTracking(
    staffProfile.id,
    clinic.id
);
        await loadStaffAttendanceWorkspace(
    staffProfile.id,
    clinic.id
);
        
// END HEALTHOS AI: START VERIFIED STAFF PRESENCE
        // Display only information retrieved from the verified database row.
        document.getElementById("staffWorkspaceName").textContent =
            staffProfile.full_name;

        document.getElementById("staffWorkspaceId").textContent =
            staffProfile.staff_id;

        document.getElementById("staffWorkspaceDepartment").textContent =
            staffProfile.department;

        document.getElementById("staffWorkspaceRole").textContent =
            staffProfile.professional_role.replace(/_/g, " ");

        // HEALTHOS AI: LOAD VERIFIED MULTI-DEPARTMENT WORKSPACE ASSIGNMENTS
        const assignmentPanel =
            document.getElementById("staffWorkspaceAssignments");
        if (assignmentPanel) {
            assignmentPanel.replaceChildren();
            const { data: workspaceContext, error: workspaceContextError } =
                await supabaseClient.rpc(
                    "get_my_staff_workspace_context",
                    { p_clinic_id: clinic.id }
                );

            if (workspaceContextError) {
                console.error(
                    "Staff workspace assignment context unavailable:",
                    workspaceContextError
                );
                const warning = document.createElement("p");
                warning.className = "message error";
                warning.textContent =
                    "Your department assignments could not be loaded. " +
                    "Your administrator should verify your active assignments.";
                assignmentPanel.appendChild(warning);
            } else {
                const assignments = Array.isArray(workspaceContext?.assignments)
                    ? workspaceContext.assignments
                    : [];


                // HEALTHOS AI: STAFF DEPARTMENT CONTEXT SELECTOR
                const contextLabel = document.createElement("label");
                contextLabel.htmlFor = "staffDepartmentContextSelect";
                contextLabel.textContent = "Current department context";
                contextLabel.className = "form-label";
                assignmentPanel.appendChild(contextLabel);

                const contextSelect = document.createElement("select");
                contextSelect.id = "staffDepartmentContextSelect";
                contextSelect.name = "staffDepartmentContextSelect";
                contextSelect.className = "form-control";
                contextSelect.setAttribute("aria-label", "Select your assigned department context");

                assignments.forEach(function (assignment, index) {
                    const option = document.createElement("option");
                    option.value = assignment.assignment_id;
                    option.dataset.departmentId = assignment.department_id || "";
                    option.textContent =
                        (assignment.department_name || "Department") +
                        " — " + (assignment.unit_name || "All units") +
                        (assignment.is_primary ? " (Primary)" : "");
                    if (assignment.is_primary || index === 0) {
                        option.selected = true;
                    }
                    contextSelect.appendChild(option);
                });

                assignmentPanel.appendChild(contextSelect);

                const contextNotice = document.createElement("p");
                contextNotice.className = "muted";
                contextNotice.textContent =
                    "Changing this selection changes the displayed department context only. " +
                    "Access to records and actions remains controlled by server-side permissions.";
                assignmentPanel.appendChild(contextNotice);

                // Stage 3G: universal department handover for all assigned staff.
                const handoverSection = document.createElement("section");
                handoverSection.className = "panel";
                handoverSection.style.margin = "18px 0";
                const handoverTitle = document.createElement("h3");
                handoverTitle.textContent = "Department shift handover";
                const handoverIntro = document.createElement("p");
                handoverIntro.className = "muted";
                handoverIntro.textContent = "Record outstanding work, operational risks and instructions for the incoming colleague. The designated incoming staff member must explicitly accept the handover.";
                const handoverMessage = document.createElement("p");
                handoverMessage.className = "message";
                handoverMessage.setAttribute("role","status");
                handoverMessage.setAttribute("aria-live","polite");
                const handoverForm = document.createElement("form");
                handoverForm.className = "form-grid";
                const incomingLabel = document.createElement("label");
                incomingLabel.textContent = "Incoming staff member";
                const incomingSelect = document.createElement("select");
                incomingSelect.required = true;
                incomingSelect.className = "form-control";
                incomingLabel.appendChild(incomingSelect);
                const summaryLabel = document.createElement("label");
                summaryLabel.textContent = "Handover summary (required)";
                const summaryInput = document.createElement("textarea");
                summaryInput.required = true;
                summaryInput.minLength = 10;
                summaryInput.maxLength = 5000;
                summaryInput.rows = 4;
                summaryInput.className = "form-control";
                summaryInput.placeholder = "Summarise the work completed, current operational position and what the incoming colleague needs to know.";
                summaryLabel.appendChild(summaryInput);
                const pendingLabel = document.createElement("label");
                pendingLabel.textContent = "Outstanding tasks / follow-up";
                const pendingInput = document.createElement("textarea");
                pendingInput.maxLength = 5000;
                pendingInput.rows = 3;
                pendingInput.className = "form-control";
                pendingInput.placeholder = "List pending tasks and their current status. Do not include unnecessary patient-identifying information.";
                pendingLabel.appendChild(pendingInput);
                const riskLabel = document.createElement("label");
                riskLabel.textContent = "Operational risks / blockers";
                const riskInput = document.createElement("textarea");
                riskInput.maxLength = 3000;
                riskInput.rows = 2;
                riskInput.className = "form-control";
                riskInput.placeholder = "Record equipment, supply, staffing or safety issues requiring attention.";
                riskLabel.appendChild(riskInput);
                const handoverSubmit = document.createElement("button");
                handoverSubmit.type = "submit";
                handoverSubmit.className = "primary-button";
                handoverSubmit.textContent = "Record handover";
                handoverForm.append(incomingLabel,summaryLabel,pendingLabel,riskLabel,handoverSubmit);
                const handoverListTitle = document.createElement("h4");
                handoverListTitle.textContent = "Recent department handovers";
                const handoverList = document.createElement("div");
                handoverSection.append(handoverTitle,handoverIntro,handoverMessage,handoverForm,handoverListTitle,handoverList);
                assignmentPanel.appendChild(handoverSection);

                async function refreshDepartmentHandovers(assignment) {
                    if (!assignment || !assignment.department_id) return;
                    handoverMessage.textContent = "Loading department handovers...";
                    handoverMessage.className = "message";
                    handoverList.replaceChildren();
                    incomingSelect.replaceChildren();
                    try {
                        const [recipientsResult, handoversResult] = await Promise.all([
                            supabaseClient.rpc("get_department_handover_recipients", {
                                p_clinic_id: clinic.id,p_department_id: assignment.department_id
                            }),
                            supabaseClient.rpc("get_department_shift_handovers", {
                                p_clinic_id: clinic.id,p_department_id: assignment.department_id,p_limit: 30
                            })
                        ]);
                        if (recipientsResult.error) throw recipientsResult.error;
                        if (handoversResult.error) throw handoversResult.error;
                        const recipients = Array.isArray(recipientsResult.data?.staff) ? recipientsResult.data.staff : [];
                        const eligible = recipients.filter(person => person.assignment_id !== assignment.assignment_id);
                        const placeholder = document.createElement("option");
                        placeholder.value = "";
                        placeholder.textContent = eligible.length ? "Select incoming colleague" : "No other active colleague is assigned";
                        incomingSelect.appendChild(placeholder);
                        eligible.forEach(person => {
                            const option = document.createElement("option");
                            option.value = person.assignment_id;
                            option.textContent = (person.full_name || "Staff member") + (person.staff_id ? " · " + person.staff_id : "");
                            incomingSelect.appendChild(option);
                        });
                        handoverSubmit.disabled = eligible.length === 0;
                        const handovers = Array.isArray(handoversResult.data?.handovers) ? handoversResult.data.handovers : [];
                        if (!handovers.length) {
                            const empty = document.createElement("p");
                            empty.className = "muted";
                            empty.textContent = "No handovers have been recorded for this department.";
                            handoverList.appendChild(empty);
                        } else handovers.forEach(record => {
                            const card = document.createElement("article");
                            card.className = "panel";
                            card.style.margin = "10px 0";
                            const heading = document.createElement("h4");
                            heading.textContent = (record.outgoing_name || "Outgoing staff") + " → " + (record.incoming_name || "Incoming staff not designated");
                            const status = document.createElement("p");
                            status.className = "message" + (record.handover_status === "accepted" ? " success" : "");
                            status.textContent = String(record.handover_status || "unknown").replace(/_/g," ") + " · " + new Date(record.recorded_at).toLocaleString();
                            const summary = document.createElement("p");
                            summary.textContent = record.handover_summary || "";
                            card.append(heading,status,summary);
                            [["Outstanding items",record.pending_items],["Operational risks",record.risk_notes]].forEach(([label,value]) => {
                                if (!value) return;
                                const detail = document.createElement("p");
                                detail.textContent = label + ": " + value;
                                card.appendChild(detail);
                            });
                            const ownIncoming = assignments.some(item => item.assignment_id === record.incoming_assignment_id);
                            if (record.handover_status === "awaiting_acceptance" && ownIncoming) {
                                const accept = document.createElement("button");
                                accept.type = "button";
                                accept.className = "secondary-button";
                                accept.textContent = "Accept handover";
                                accept.addEventListener("click", async () => {
                                    accept.disabled = true;
                                    try {
                                        const {error} = await supabaseClient.rpc("accept_department_shift_handover", {
                                            p_clinic_id: clinic.id,p_handover_id: record.id
                                        });
                                        if (error) throw error;
                                        handoverMessage.textContent = "Handover accepted and acceptance time recorded.";
                                        handoverMessage.className = "message success";
                                        await refreshDepartmentHandovers(assignment);
                                    } catch (error) {
                                        handoverMessage.textContent = friendlyError(error);
                                        handoverMessage.className = "message error";
                                        accept.disabled = false;
                                    }
                                });
                                card.appendChild(accept);
                            }
                            handoverList.appendChild(card);
                        });
                        handoverMessage.textContent = "Department handovers loaded. Only the designated incoming staff member can accept a handover; the database verifies this independently.";
                        handoverMessage.className = "message success";
                    } catch (error) {
                        console.error("Department handover loading failed:",error);
                        handoverMessage.textContent = friendlyError(error);
                        handoverMessage.className = "message error";
                    }
                }

                handoverForm.addEventListener("submit", async event => {
                    event.preventDefault();
                    const selected = assignments.find(item => item.assignment_id === contextSelect.value);
                    if (!selected) {
                        handoverMessage.textContent = "Select a valid active department assignment first.";
                        handoverMessage.className = "message error";
                        return;
                    }
                    if (!incomingSelect.value) {
                        handoverMessage.textContent = "Select the incoming staff member.";
                        handoverMessage.className = "message error";
                        return;
                    }
                    handoverSubmit.disabled = true;
                    try {
                        const {error} = await supabaseClient.rpc("record_department_shift_handover", {
                            p_clinic_id: clinic.id,
                            p_department_id: selected.department_id,
                            p_outgoing_assignment_id: selected.assignment_id,
                            p_incoming_assignment_id: incomingSelect.value,
                            p_shift_id: null,
                            p_handover_summary: summaryInput.value.trim(),
                            p_pending_items: pendingInput.value.trim() || null,
                            p_risk_notes: riskInput.value.trim() || null
                        });
                        if (error) throw error;
                        handoverForm.reset();
                        handoverMessage.textContent = "Handover recorded and sent to the designated incoming colleague for acceptance.";
                        handoverMessage.className = "message success";
                        await refreshDepartmentHandovers(selected);
                    } catch (error) {
                        console.error("Department handover submission failed:",error);
                        handoverMessage.textContent = friendlyError(error);
                        handoverMessage.className = "message error";
                    } finally {
                        handoverSubmit.disabled = false;
                    }
                });

                function displayStaffAssignmentContext(assignment) {
                    if (!assignment) return;
                    const departmentDisplay =
                        document.getElementById("staffWorkspaceDepartment");
                    const roleDisplay =
                        document.getElementById("staffWorkspaceRole");

                    if (departmentDisplay) {
                        departmentDisplay.textContent =
                            assignment.department_name || "Assigned department";
                    }

                    const roles = Array.isArray(assignment.roles)
                        ? assignment.roles
                        : [];
                    if (roleDisplay) {
                        roleDisplay.textContent = roles.length
                            ? roles.map(function (role) {
                                return role.role_name;
                            }).join(", ")
                            : "Role assignment pending";
                    }
                }

                contextSelect.addEventListener("change", function () {
                    const selectedAssignment = assignments.find(function (assignment) {
                        return assignment.assignment_id === contextSelect.value;
                    });
                    displayStaffAssignmentContext(selectedAssignment);
                    if (selectedAssignment) {
                        void loadDepartmentAppointmentInbox(selectedAssignment.department_id);
                        void refreshDepartmentHandovers(selectedAssignment);
                    }
                });

                const initialAssignment =
                    assignments.find(function (assignment) {
                        return assignment.assignment_id === contextSelect.value;
                    }) || assignments[0];
                displayStaffAssignmentContext(initialAssignment);
                if (initialAssignment) {
                    void loadDepartmentAppointmentInbox(initialAssignment.department_id);
                    void refreshDepartmentHandovers(initialAssignment);
                }
                // END HEALTHOS AI: STAFF DEPARTMENT CONTEXT SELECTOR

                assignments.forEach(function (assignment) {
                    const card = document.createElement("article");
                    card.className = "stat-card";

                    const heading = document.createElement("h3");
                    heading.textContent =
                        assignment.department_name || "Assigned department";
                    card.appendChild(heading);

                    const unit = document.createElement("p");
                    unit.className = "muted";
                    unit.textContent =
                        "Unit: " + (assignment.unit_name || "Department-wide");
                    card.appendChild(unit);

                    const roles = Array.isArray(assignment.roles)
                        ? assignment.roles
                        : [];
                    const roleText = document.createElement("p");
                    roleText.textContent = roles.length
                        ? "Roles: " + roles.map(function (role) {
                            return role.role_name;
                        }).join(", ")
                        : "Roles: Contact your administrator to complete role assignment.";
                    card.appendChild(roleText);

                    if (assignment.is_primary) {
                        const primary = document.createElement("span");
                        primary.className = "demo-badge";
                        primary.textContent = "Primary assignment";
                        card.appendChild(primary);
                    }

                    assignmentPanel.appendChild(card);
                });

                if (!assignments.length) {
                    const empty = document.createElement("p");
                    empty.className = "message";
                    empty.textContent =
                        "No active department assignments are available.";
                    assignmentPanel.appendChild(empty);
                }
            }
        }
        // END HEALTHOS AI: LOAD VERIFIED MULTI-DEPARTMENT WORKSPACE ASSIGNMENTS

        // HEALTHOS AI: LOAD HOSPITAL-APPROVED STAFF DUTIES
        const dutiesPanel = document.getElementById("staffWorkspaceDuties");
        if (dutiesPanel) {
            dutiesPanel.replaceChildren();
            const { data: dutiesResult, error: dutiesError } =
                await supabaseClient.rpc(
                    "get_my_staff_duties",
                    { p_clinic_id: clinic.id }
                );

            if (dutiesError) {
                console.error("Staff duties could not be loaded:", dutiesError);
                const errorMessage = document.createElement("p");
                errorMessage.className = "message error";
                errorMessage.textContent =
                    "Your approved duties could not be loaded. Please contact your supervisor.";
                dutiesPanel.appendChild(errorMessage);
            } else {
                const jobProfiles = Array.isArray(dutiesResult?.job_profiles)
                    ? dutiesResult.job_profiles
                    : [];
                let approvedDutyCount = 0;

                jobProfiles.forEach(function (jobProfile) {
                    const card = document.createElement("article");
                    card.className = "stat-card";

                    const title = document.createElement("h3");
                    title.textContent =
                        (jobProfile.job_title || jobProfile.role_name || "Job profile") +
                        " — " + (jobProfile.department_name || "Department");
                    card.appendChild(title);

                    if (jobProfile.job_purpose) {
                        const purpose = document.createElement("p");
                        purpose.textContent = jobProfile.job_purpose;
                        card.appendChild(purpose);
                    }

                    const duties = Array.isArray(jobProfile.duties)
                        ? jobProfile.duties
                        : [];
                    approvedDutyCount += duties.length;

                    if (duties.length) {
                        const list = document.createElement("ul");
                        duties.forEach(function (duty) {
                            const item = document.createElement("li");
                            const dutyTitle = document.createElement("strong");
                            dutyTitle.textContent = duty.duty_title || "Duty";
                            item.appendChild(dutyTitle);

                            if (duty.duty_description) {
                                item.appendChild(
                                    document.createTextNode(
                                        " — " + duty.duty_description
                                    )
                                );
                            }

                            const details = [];
                            if (duty.expected_frequency) {
                                details.push("Frequency: " + duty.expected_frequency);
                            }
                            if (duty.evidence_required) {
                                details.push("Evidence required");
                            }
                            if (duty.supervisor_review_required) {
                                details.push("Supervisor review required");
                            }
                            if (duty.separate_approval_required) {
                                details.push("Separate approval required");
                            }
                            if (details.length) {
                                const meta = document.createElement("small");
                                meta.className = "muted";
                                meta.textContent = details.join(" • ");
                                item.appendChild(document.createElement("br"));
                                item.appendChild(meta);
                            }
                            list.appendChild(item);
                        });
                        card.appendChild(list);
                    } else {
                        const pending = document.createElement("p");
                        pending.className = "message";
                        pending.textContent =
                            jobProfile.validation_status === "hospital_approved"
                                ? "No active duties have been published for this role yet."
                                : "This job profile is awaiting hospital review and approval. No duties are being presented as authorised instructions.";
                        card.appendChild(pending);
                    }

                    dutiesPanel.appendChild(card);
                });

                if (!jobProfiles.length) {
                    const empty = document.createElement("p");
                    empty.className = "message";
                    empty.textContent =
                        "No job profile is linked to your active role yet. Ask your administrator to configure one.";
                    dutiesPanel.appendChild(empty);
                }

                const summary = document.createElement("p");
                summary.className = "muted";
                summary.textContent =
                    approvedDutyCount + " hospital-approved duty item(s) available.";
                dutiesPanel.prepend(summary);
            }
        }
        // END HEALTHOS AI: LOAD HOSPITAL-APPROVED STAFF DUTIES

        // HEALTHOS AI: MY TASKS WORKSPACE
        const myTasksPanel = document.getElementById("staffWorkspaceTasks");
        async function refreshMyStaffTasks() {
            if (!myTasksPanel) return;
            myTasksPanel.replaceChildren();
            const loading = document.createElement("p");
            loading.className = "muted";
            loading.textContent = "Loading your assigned tasks...";
            myTasksPanel.appendChild(loading);

            const { data, error } = await supabaseClient.rpc(
                "get_my_staff_tasks",
                { p_clinic_id: clinic.id }
            );
            myTasksPanel.replaceChildren();

            if (error) {
                const failed = document.createElement("p");
                failed.className = "message error";
                failed.textContent = "Your tasks could not be loaded. Contact your supervisor.";
                myTasksPanel.appendChild(failed);
                console.error("My Tasks load failed:", error);
                return;
            }

            const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
            if (!tasks.length) {
                const empty = document.createElement("p");
                empty.className = "message";
                empty.textContent = "You have no tasks assigned at this time.";
                myTasksPanel.appendChild(empty);
                return;
            }

            tasks.forEach(function (task) {
                const card = document.createElement("article");
                card.className = "stat-card";
                const title = document.createElement("h3");
                title.textContent = task.task_title || "Assigned task";
                card.appendChild(title);

                const meta = document.createElement("p");
                meta.className = "muted";
                meta.textContent =
                    (task.department_name || "Department") +
                    (task.unit_name ? " / " + task.unit_name : "") +
                    " • " + String(task.priority || "normal").toUpperCase() +
                    " • " + String(task.task_status || "assigned").replace(/_/g, " ");
                card.appendChild(meta);

                if (task.task_description) {
                    const description = document.createElement("p");
                    description.textContent = task.task_description;
                    card.appendChild(description);
                }

                const due = document.createElement("p");
                due.textContent = task.due_at
                    ? "Due: " + new Date(task.due_at).toLocaleString()
                    : "No deadline set";
                card.appendChild(due);

                const requirements = [];
                if (task.requires_evidence) requirements.push("Evidence required");
                if (task.requires_supervisor_review) requirements.push("Supervisor review");
                if (task.requires_separate_approval) requirements.push("Separate approval");
                if (requirements.length) {
                    const req = document.createElement("small");
                    req.className = "muted";
                    req.textContent = requirements.join(" • ") +
                        " • Evidence attached: " + (task.evidence_count || 0);
                    card.appendChild(req);
                }


                if (["assigned", "accepted", "in_progress", "blocked"].includes(task.task_status)) {
                    const evidenceBox = document.createElement("div");
                    evidenceBox.className = "form-group";

                    const evidenceLabel = document.createElement("label");
                    evidenceLabel.textContent = "Add completion evidence (note or reference)";
                    evidenceBox.appendChild(evidenceLabel);

                    const evidenceText = document.createElement("textarea");
                    evidenceText.rows = 3;
                    evidenceText.maxLength = 5000;
                    evidenceText.placeholder = "Describe the work completed or evidence observed...";
                    evidenceBox.appendChild(evidenceText);

                    const evidenceReference = document.createElement("input");
                    evidenceReference.type = "text";
                    evidenceReference.maxLength = 1000;
                    evidenceReference.placeholder = "Optional reference / record ID";
                    evidenceBox.appendChild(evidenceReference);

                    const saveEvidence = document.createElement("button");
                    saveEvidence.type = "button";
                    saveEvidence.className = "btn btn-secondary";
                    saveEvidence.textContent = "Save evidence";
                    saveEvidence.addEventListener("click", async function () {
                        if (!evidenceText.value.trim() && !evidenceReference.value.trim()) {
                            alert("Enter a note or reference before saving.");
                            return;
                        }
                        saveEvidence.disabled = true;
                        const { error: evidenceError } = await supabaseClient.rpc(
                            "add_my_staff_task_evidence",
                            {
                                p_clinic_id: clinic.id,
                                p_task_id: task.id,
                                p_evidence_type: evidenceReference.value.trim() ? "reference" : "note",
                                p_evidence_text: evidenceText.value.trim() || null,
                                p_source_reference: evidenceReference.value.trim() || null
                            }
                        );
                        if (evidenceError) {
                            alert(friendlyError(evidenceError));
                            saveEvidence.disabled = false;
                            return;
                        }
                        await refreshMyStaffTasks();
                    });
                    evidenceBox.appendChild(saveEvidence);
                    card.appendChild(evidenceBox);
                }

                const actions = document.createElement("div");
                actions.className = "button-group";
                const available = [];
                if (task.task_status === "assigned") {
                    available.push(["accepted", "Accept task"]);
                }
                if (["assigned", "accepted"].includes(task.task_status)) {
                    available.push(["in_progress", "Start task"]);
                }
                if (["accepted", "in_progress"].includes(task.task_status)) {
                    available.push(["blocked", "Report blocked"]);
                }
                if (["accepted", "in_progress", "blocked"].includes(task.task_status)) {
                    if (task.requires_evidence && !(task.evidence_count > 0)) {
                        const note = document.createElement("p");
                        note.className = "muted";
                        note.textContent = "Add required evidence before submitting. Evidence capture is the next workflow layer.";
                        card.appendChild(note);
                    } else {
                        available.push(["submitted", "Submit for review"]);
                    }
                }

                available.forEach(function (action) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "btn btn-primary";
                    button.textContent = action[1];
                    button.addEventListener("click", async function () {
                        button.disabled = true;
                        const { error: actionError } = await supabaseClient.rpc(
                            "update_my_staff_task_status",
                            {
                                p_clinic_id: clinic.id,
                                p_task_id: task.id,
                                p_new_status: action[0],
                                p_notes: null
                            }
                        );
                        if (actionError) {
                            alert(friendlyError(actionError));
                            button.disabled = false;
                            return;
                        }
                        await refreshMyStaffTasks();
                    });
                    actions.appendChild(button);
                });

                if (available.length) card.appendChild(actions);
                myTasksPanel.appendChild(card);
            });
        }

        if (myTasksPanel) {
            const refreshTasksButton = document.getElementById("refreshMyStaffTasks");
            if (refreshTasksButton) {
                refreshTasksButton.addEventListener("click", refreshMyStaffTasks);
            }
            await refreshMyStaffTasks();
            await loadDepartmentTaskAssignmentOptions(clinic);
        }
        
        // HEALTHOS AI: SUPERVISOR REVIEW & APPROVAL
        const supervisorReviewPanel = document.getElementById("supervisorTaskReviews");

        async function refreshSupervisorTaskReviews() {
            if (!supervisorReviewPanel) return;
            supervisorReviewPanel.replaceChildren();
            const loading = document.createElement("p");
            loading.className = "muted";
            loading.textContent = "Loading submitted work for your review...";
            supervisorReviewPanel.appendChild(loading);

            const { data, error } = await supabaseClient.rpc(
                "get_supervisor_task_reviews",
                { p_clinic_id: clinic.id }
            );
            supervisorReviewPanel.replaceChildren();
            if (error) {
                const message = document.createElement("p");
                message.className = "muted";
                message.textContent = "Supervisor review access is available only to authorised supervisors and hospital administrators.";
                supervisorReviewPanel.appendChild(message);
                return;
            }

            const tasks = data && Array.isArray(data.tasks) ? data.tasks : [];
            if (!tasks.length) {
                const empty = document.createElement("p");
                empty.className = "muted";
                empty.textContent = "No submitted tasks are waiting for your review.";
                supervisorReviewPanel.appendChild(empty);
                return;
            }

            tasks.forEach(function (task) {
                const card = document.createElement("article");
                card.className = "stat-card";
                const title = document.createElement("h3");
                title.textContent = task.task_title || "Submitted task";
                card.appendChild(title);

                const meta = document.createElement("p");
                meta.className = "muted";
                meta.textContent = (task.assignee_name || "Staff member") + " • " +
                    (task.department_name || "Department") +
                    (task.unit_name ? " / " + task.unit_name : "") +
                    " • " + String(task.priority || "normal").toUpperCase();
                card.appendChild(meta);

                if (task.task_description) {
                    const desc = document.createElement("p");
                    desc.textContent = task.task_description;
                    card.appendChild(desc);
                }

                const evidenceHeading = document.createElement("strong");
                evidenceHeading.textContent = "Submitted evidence";
                card.appendChild(evidenceHeading);
                (Array.isArray(task.evidence) ? task.evidence : []).forEach(function (item) {
                    const evidence = document.createElement("p");
                    evidence.textContent = (item.type || "Evidence") + ": " +
                        (item.text || item.reference || "File evidence recorded") +
                        (item.submitted_by ? " — " + item.submitted_by : "");
                    card.appendChild(evidence);
                });

                const reviewNotes = document.createElement("textarea");
                reviewNotes.rows = 2;
                reviewNotes.maxLength = 3000;
                reviewNotes.placeholder = "Review notes (required when rejecting or requesting corrections)";
                card.appendChild(reviewNotes);

                const actions = document.createElement("div");
                actions.className = "button-group";
                [["approved", "Approve completion"], ["rejected", "Reject"], ["changes_requested", "Request corrections"]]
                    .forEach(function (choice) {
                        const button = document.createElement("button");
                        button.type = "button";
                        button.className = choice[0] === "approved" ? "btn btn-primary" : "btn btn-secondary";
                        button.textContent = choice[1];
                        button.addEventListener("click", async function () {
                            if (choice[0] !== "approved" && reviewNotes.value.trim().length < 3) {
                                alert("Please provide a clear reason before rejecting or requesting corrections.");
                                return;
                            }
                            button.disabled = true;
                            const { error: reviewError } = await supabaseClient.rpc(
                                "review_supervisor_staff_task",
                                {
                                    p_clinic_id: clinic.id,
                                    p_task_id: task.id,
                                    p_decision: choice[0],
                                    p_notes: reviewNotes.value.trim() || null
                                }
                            );
                            if (reviewError) {
                                alert(friendlyError(reviewError));
                                button.disabled = false;
                                return;
                            }
                            await refreshSupervisorTaskReviews();
                            await refreshMyStaffTasks();
                        });
                        actions.appendChild(button);
                    });
                card.appendChild(actions);
                supervisorReviewPanel.appendChild(card);
            });
        }

        if (supervisorReviewPanel) {
            const refreshReviewsButton = document.getElementById("refreshSupervisorTaskReviews");
            if (refreshReviewsButton) refreshReviewsButton.addEventListener("click", refreshSupervisorTaskReviews);
            await refreshSupervisorTaskReviews();
        }
        // END HEALTHOS AI: SUPERVISOR REVIEW & APPROVAL

// END HEALTHOS AI: MY TASKS WORKSPACE




        const links = document.getElementById("staffWorkspaceLinks");
        links.replaceChildren();

        const message =
            document.getElementById("staffWorkspaceMessage");

        message.textContent =
            "Staff profile verified. Your work areas will be enabled " +
            "according to your assigned permissions.";

        message.className = "message success";

        const workAreas = {
            clinician: ["Patients", "Appointments", "Service Capture"],
            doctor: ["Patients", "Appointments", "Service Capture"],
            surgeon: ["Patients", "Appointments", "Service Capture"],
            dentist: ["Patients", "Appointments", "Service Capture"],
            nurse: ["Patients", "Appointments", "Service Capture"],
            pharmacy: ["Pharmacy"],
            laboratory: ["Service Capture"],
            reception: ["Appointments"],
            medical_records: ["Patients"],
            finance_manager: ["Billing & Revenue"],
            billing: ["Billing & Revenue"],
            staff: ["Contact your administrator for assigned work areas"]
        };

    // ============================================================
// HEALTHOS AI: CLINICIAN WORKSPACE NAVIGATION
// ============================================================

const areas =
    workAreas[staffProfile.professional_role] ||
    ["Contact your administrator for assigned work areas"];

const workAreaRoutes = {
    "Patients": {
        sectionId: "patients",
        description: "Register and access authorised patient records."
    },
    "Appointments": {
        sectionId: "appointments",
        description: "Schedule appointments and review the appointment register."
    },
        "Service Capture": {
        sectionId: "serviceCapture",
        description: "Access the clinic service catalogue and service capture tools."
    },
    "Pharmacy": {
        sectionId: "pharmacy",
        description: "Manage pharmacy inventory, stock levels, and medicine expiry."
    },
    "Transaction Handling": {
        sectionId: "posReconciliation",
        description: "Capture, accept or review transactions according to your department permissions."
    }
};

// Financial work areas are permission-driven, not hard-coded to department names.
// Hospital administrators can grant capture/accept/review/reconcile to any mapped role.
let transactionCapabilities = {
    can_capture: false,
    can_accept: false,
    can_review: false,
    can_reconcile: false
};

try {
    const capabilityResult = await supabaseClient.rpc(
        "get_my_transaction_capabilities",
        { p_clinic_id: currentClinic.id }
    );
    if (!capabilityResult.error && capabilityResult.data) {
        transactionCapabilities = capabilityResult.data;
        if (
            transactionCapabilities.can_capture ||
            transactionCapabilities.can_accept ||
            transactionCapabilities.can_review ||
            transactionCapabilities.can_reconcile
        ) {
            if (!areas.includes("Transaction Handling")) {
                areas.push("Transaction Handling");
            }
        }
    } else if (capabilityResult.error) {
        console.warn("Transaction capabilities unavailable:", capabilityResult.error);
    }
} catch (capabilityError) {
    console.warn("Could not load transaction capabilities:", capabilityError);
}

areas.forEach(function (area) {
    const card = document.createElement("article");
    card.className = "stat-card";

    const heading = document.createElement("h3");
    heading.textContent = area;

    const description = document.createElement("p");
    description.className = "muted";

    const route = workAreaRoutes[area];

    description.textContent = route
        ? route.description
        : "This work area is not connected yet. Contact your administrator.";

    card.appendChild(heading);
    card.appendChild(description);

    if (route) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "primary-button";
        button.textContent = "Open " + area;

        button.addEventListener("click", async function () {
     const permittedRolesByArea = {
                "Patients": [
                    "clinician",
                    "doctor",
                    "surgeon",
                    "dentist",
                    "nurse",
                    "medical_records"
                ],
                "Appointments": [
                    "clinician",
                    "doctor",
                    "surgeon",
                    "dentist",
                    "nurse",
                    "reception"
                ],
                "Service Capture": [
                    "clinician",
                    "doctor",
                    "surgeon",
                    "dentist",
                    "nurse",
                    "laboratory"
                ],
                "Pharmacy": [
                    "pharmacy"
                ],
                "Transaction Handling": []
            };

            const permittedRoles = permittedRolesByArea[area] || [];
            const transactionAccessAllowed =
                area === "Transaction Handling" &&
                (
                    transactionCapabilities.can_capture ||
                    transactionCapabilities.can_accept ||
                    transactionCapabilities.can_review ||
                    transactionCapabilities.can_reconcile
                );

            if (
                area === "Transaction Handling"
                    ? !transactionAccessAllowed
                    : !permittedRoles.includes(staffProfile.professional_role)
            ) {
                message.textContent =
                    "Your assigned role does not permit access to this work area.";

                message.className = "message error";
                return;
            }

            const targetSection = document.getElementById(
                route.sectionId
            );

            if (!targetSection) {
                message.textContent =
                    "This work area is temporarily unavailable.";

                message.className = "message error";
                return;
            }

                        // HEALTHOS AI: OPEN CLINICIAN WORK AREA

            const mainContent = document.getElementById("dashboard");

            if (!mainContent || !targetSection) {
                message.textContent =
                    "This work area is temporarily unavailable.";

                message.className = "message error";
                return;
            }

            // Remember the existing visibility settings.
            const previousContentVisibility = new Map(
                Array.from(mainContent.children).map(function (element) {
                    return [element, element.hidden];
                })
            );

            const navigationLinks = Array.from(
                document.querySelectorAll(
                    "#appPanel .sidebar .nav-item"
                )
            );

            const previousNavigationVisibility = new Map(
                navigationLinks.map(function (link) {
                    return [link, link.hidden];
                })
            );

            // Reveal the application without hiding its main container.
            showOnly("dashboard");

            // Hide unrelated content, keeping the selected work area.
            Array.from(mainContent.children).forEach(function (element) {
                element.hidden = element !== targetSection;
            });

            // Keep the sidebar out of the initial clinician view.
            navigationLinks.forEach(function (link) {
                link.hidden = true;
            });

            // Add a button to return to the staff workspace.
            const backButton = document.createElement("button");

            backButton.type = "button";
            backButton.className = "primary-button";
            backButton.textContent = "← Back to My Workspace";

            backButton.addEventListener("click", function () {
                // Restore the original visibility settings.
                previousContentVisibility.forEach(function (wasHidden, element) {
                    element.hidden = wasHidden;
                });

                previousNavigationVisibility.forEach(function (wasHidden, link) {
                    link.hidden = wasHidden;
                });

                backButton.remove();

                showOnly("staff");
            });

            targetSection.insertBefore(
                backButton,
                targetSection.firstChild
            );

            targetSection.hidden = false;

            // Load transaction rows only after the work area is visible.
            // Use the explicit window export so navigation cannot fail on an
            // unresolved bare global before the section opens.
            if (area === "Transaction Handling") {
                if (typeof window.loadDepartmentTransactionCapture === "function") {
                    window.loadDepartmentTransactionCapture(transactionCapabilities).catch(function (error) {
                        console.error("Transaction capture load failed:", error);
                        const status = document.getElementById("posReceiptUploadMessage");
                        if (status) {
                            status.textContent = "Transaction records could not load. Please refresh and try again.";
                            status.className = "message error";
                        }
                    });
                } else {
                    console.error("Transaction handling module is not available.");
                }
            }

            targetSection.scrollIntoView({
                behavior: "auto",
                block: "start"
            });
            // Load appointment data when the Appointments area opens.
            if (area === "Appointments") {
                await loadAppointmentPatients();
                await loadAppointments();
            }
        
        });

        card.appendChild(button);
    }

    links.appendChild(card);
});

        showOnly("staff");

    } catch (error) {
        console.error(
            "HealthOS workspace lookup failed:",
            error
        );

        showOnly("clinic");

        showClinicMessage(
            "We could not open your workspace: " +
            friendlyError(error),
            "error"
        );
    }
}

// Open the dashboard after a clinic is found or created.
// Open the dashboard only after management verification.
function showDashboard(clinic) {
    managementVerified = false;
    currentClinic = clinic;
    currentClinicLabel.textContent = clinic.name;

    adminVerificationPassword.value = "";
    adminVerificationMessage.textContent = "";
    adminVerificationMessage.className = "message";

    showOnly("verification");
    adminVerificationPassword.focus();
}
// HEALTHOS AI: STAFF SHIFT ASSIGNMENT LOGIC

async function loadStaffShiftOptions(clinic) {
    const select = document.getElementById("shiftStaffProfile");

    if (!select) return;

    if (
        !currentUser ||
        !currentClinic ||
        !managementVerified ||
        clinic.id !== currentClinic.id
    ) {
        select.innerHTML =
            '<option value="">Administrator verification required</option>';
        return;
    }

    select.innerHTML =
        '<option value="">Loading active staff...</option>';

    const { data: staff, error } = await supabaseClient
        .from("staff_profiles")
        .select("id, full_name, staff_id, department")
        .eq("clinic_id", clinic.id)
        .eq("employment_status", "active")
        .order("full_name");

    if (error) {
        console.error("Staff list loading failed:", error);

        select.innerHTML =
            '<option value="">Unable to load staff</option>';

        return;
    }

    select.innerHTML =
        '<option value="">Select staff member</option>';

    (staff || []).forEach(function (person) {
        const option = document.createElement("option");

        option.value = person.id;

        option.textContent =
            person.full_name +
            " (" + person.staff_id + ")" +
            (person.department ? " - " + person.department : "");

        select.appendChild(option);
    });

    if (!staff || staff.length === 0) {
        select.innerHTML =
            '<option value="">No active staff available</option>';
    }
}


// Set the date field to today's local date.
(function initialiseStaffShiftForm() {
    const form = document.getElementById(
        "staffShiftAssignmentForm"
    );

    const dateInput = document.getElementById("staffShiftDate");

    if (!form || !dateInput) return;

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    dateInput.value = `${year}-${month}-${day}`;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const message = document.getElementById(
            "staffShiftAssignmentMessage"
        );

        const saveButton = document.getElementById(
            "saveStaffShiftButton"
        );

        function showShiftMessage(text, type) {
            if (message) {
                message.textContent = text;
                message.className = "message " + type;
            }
        }

        if (
            !currentUser ||
            !currentClinic ||
            !managementVerified
        ) {
            showShiftMessage(
                "Please verify administrator access first.",
                "error"
            );
            return;
        }

        const staffProfileId = document.getElementById(
            "shiftStaffProfile"
        ).value;

        const shiftDate = dateInput.value;

        const shiftType = document.getElementById(
            "staffShiftType"
        ).value;

        const startTime = document.getElementById(
            "staffShiftStartTime"
        ).value;

        const endTime = document.getElementById(
            "staffShiftEndTime"
        ).value;

        const notes = document.getElementById(
            "staffShiftNotes"
        ).value.trim();

        if (
            !staffProfileId ||
            !shiftDate ||
            !shiftType ||
            !startTime ||
            !endTime
        ) {
            showShiftMessage(
                "Complete all required shift fields.",
                "error"
            );
            return;
        }

        const startsAt = new Date(
            `${shiftDate}T${startTime}`
        );

        const endsAt = new Date(
            `${shiftDate}T${endTime}`
        );

        // Allow overnight shifts, such as 7:00 PM to 7:00 AM.
        if (endsAt <= startsAt) {
            endsAt.setDate(endsAt.getDate() + 1);
        }

        if (
            Number.isNaN(startsAt.getTime()) ||
            Number.isNaN(endsAt.getTime()) ||
            endsAt <= startsAt
        ) {
            showShiftMessage(
                "Enter a valid shift date and time.",
                "error"
            );
            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving Shift...";
        }

        showShiftMessage("Checking staff details...", "");

        try {
            // Confirm that the selected staff member is active
            // and belongs to the administrator's clinic.
            const { data: staffMember, error: staffError } =
                await supabaseClient
                    .from("staff_profiles")
                    .select("id")
                    .eq("id", staffProfileId)
                    .eq("clinic_id", currentClinic.id)
                    .eq("employment_status", "active")
                    .maybeSingle();

            if (staffError) throw staffError;

            if (!staffMember) {
                throw new Error(
                    "The selected staff member is not active " +
                    "in this clinic."
                );
            }

            const { error: insertError } =
                await supabaseClient
                    .from("staff_shifts")
                    .insert({
                        clinic_id: currentClinic.id,
                        staff_profile_id: staffProfileId,
                        shift_date: shiftDate,
                        shift_type: shiftType,
                        starts_at: startsAt.toISOString(),
                        ends_at: endsAt.toISOString(),
                        attendance_status: "scheduled",
                        created_by: currentUser.id,
                        notes: notes || null
                    });

            if (insertError) {
                if (insertError.code === "23505") {
                    throw new Error(
                        "This staff member already has an " +
                        "assignment for that date and shift type."
                    );
                }

                throw insertError;
            }

            showShiftMessage(
                "Shift assigned successfully.",
                "success"
            );

            document.getElementById(
                "staffShiftStartTime"
            ).value = "";

            document.getElementById(
                "staffShiftEndTime"
            ).value = "";

            document.getElementById(
                "staffShiftNotes"
            ).value = "";

            await loadAdminStaffDashboard(currentClinic);

            await loadStaffShiftOptions(currentClinic);

        } catch (error) {
            console.error(
                "Staff shift assignment failed:",
                error
            );

            showShiftMessage(
                error.message ||
                "Unable to assign this shift. Please try again.",
                "error"
            );

        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Assign Shift";
            }
        }
    });
})();

// END HEALTHOS AI: STAFF SHIFT ASSIGNMENT LOGIC
// HEALTHOS AI: ADMIN STAFF DASHBOARD STATISTICS
async function loadAdminStaffDashboard(clinic) {
    const message = document.getElementById(
        "staffDashboardMessage"
    );

    const setCount = function (id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(value);
        }
    };

    // Require a verified administrator session.
    if (
        !currentUser ||
        !currentClinic ||
        !managementVerified ||
        clinic.id !== currentClinic.id
    ) {
        if (message) {
            message.textContent =
                "Administrator verification is required.";
            message.className = "message error";
        }

        return;
    }

    if (message) {
        message.textContent = "Loading staff statistics...";
        message.className = "message";
    }

    try {
        // Get active staff for this clinic.
        const { data: staff, error: staffError } =
            await supabaseClient
                .from("staff_profiles")
                .select("id")
                .eq("clinic_id", clinic.id)
                .eq("employment_status", "active");

        if (staffError) throw staffError;

        // Use the browser's local calendar date.
        const now = new Date();

        const year = now.getFullYear();
        const month = String(
            now.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            now.getDate()
        ).padStart(2, "0");

        const today = `${year}-${month}-${day}`;

        // Get today's shifts and actual attendance.
        const { data: shifts, error: shiftsError } =
            await supabaseClient
                .from("staff_shifts")
                .select(
                    "staff_profile_id, shift_type, attendance_status, starts_at, ends_at, clocked_in_at, clocked_out_at"
                )
                .eq("clinic_id", clinic.id)
                .eq("shift_date", today)
                .neq("attendance_status", "cancelled");

        if (shiftsError) throw shiftsError;

        // Get staff presence separately from attendance.
        const fiveMinutesAgo = new Date(
            Date.now() - 5 * 60 * 1000
        ).toISOString();

        const { data: presence, error: presenceError } =
            await supabaseClient
                .from("staff_presence")
                .select(
                    "staff_profile_id, presence_status, last_seen_at"
                )
                .eq("clinic_id", clinic.id)
                .eq("presence_status", "online")
                .gte("last_seen_at", fiveMinutesAgo);

        if (presenceError) throw presenceError;

        // Count unique staff members, not duplicate shift rows.
        const activeStaffIds = new Set(
            (staff || []).map(function (person) {
                return person.id;
            })
        );

        const onDutyIds = new Set();

        (shifts || []).forEach(function (shift) {
            const currentlyWorking =
                shift.attendance_status === "on_duty" &&
                shift.clocked_in_at &&
                !shift.clocked_out_at &&
                new Date(shift.starts_at) <= now &&
                new Date(shift.ends_at) > now;

            if (
                currentlyWorking &&
                activeStaffIds.has(shift.staff_profile_id)
            ) {
                onDutyIds.add(shift.staff_profile_id);
            }
        });

        const onlineIds = new Set(
            (presence || [])
                .filter(function (person) {
                    return activeStaffIds.has(
                        person.staff_profile_id
                    );
                })
                .map(function (person) {
                    return person.staff_profile_id;
                })
        );

        // Count staff scheduled for each shift today.
        const shiftCounts = {
            morning: new Set(),
            afternoon: new Set(),
            night: new Set()
        };

        (shifts || []).forEach(function (shift) {
            if (
                shiftCounts[shift.shift_type] &&
                activeStaffIds.has(shift.staff_profile_id)
            ) {
                shiftCounts[shift.shift_type].add(
                    shift.staff_profile_id
                );
            }
        });

        // Update the seven dashboard cards.
        setCount("totalStaffCount", activeStaffIds.size);

        setCount("onDutyStaffCount", onDutyIds.size);

        setCount(
            "offDutyStaffCount",
            Math.max(0, activeStaffIds.size - onDutyIds.size)
        );

        setCount("onlineStaffCount", onlineIds.size);

        setCount(
            "morningShiftCount",
            shiftCounts.morning.size
        );

        setCount(
            "afternoonShiftCount",
            shiftCounts.afternoon.size
        );

        setCount(
            "nightShiftCount",
            shiftCounts.night.size
        );
        await loadStaffActivityTable(clinic);
        await loadStaffShiftRoster(clinic);
        if (message) {
            message.textContent =
                "Staff statistics updated successfully. " +
                "Online presence and shift attendance are " +
                "counted separately.";

            message.className = "message success";
        }

    } catch (error) {
        console.error(
            "HealthOS staff dashboard loading failed:",
            error
        );

        if (message) {
            message.textContent =
                "Unable to load staff statistics. " +
                "Check database permissions and try again.";

            message.className = "message error";
        }
    }
}



/* HEALTHOS AI: HISTORICAL ATTENDANCE & WORKFORCE REPORT */
async function loadStaffAttendanceReport(clinic) {
    const body = document.getElementById("staffAttendanceReportBody");
    const message = document.getElementById("staffAttendanceReportMessage");
    const startInput = document.getElementById("staffAttendanceReportStart");
    const endInput = document.getElementById("staffAttendanceReportEnd");
    if (!body || !message || !startInput || !endInput) return;
    if (!currentUser || !currentClinic || !managementVerified || clinic.id !== currentClinic.id) {
        message.textContent = "Administrator verification is required.";
        message.className = "message error";
        return;
    }
    const startDate = startInput.value;
    const endDate = endInput.value;
    if (!startDate || !endDate || startDate > endDate) {
        message.textContent = "Choose a valid start and end date.";
        message.className = "message error";
        return;
    }
    message.textContent = "Loading attendance history...";
    message.className = "message";
    body.replaceChildren();
    try {
        const from = new Date(startDate + "T00:00:00").toISOString();
        const to = new Date(new Date(endDate + "T00:00:00").getTime() + 86400000).toISOString();
        const [{data:sessions,error:sessionError},{data:shifts,error:shiftError}] = await Promise.all([
            supabaseClient.from("staff_attendance_sessions")
                .select("id,staff_profile_id,clocked_in_at,clocked_out_at")
                .eq("clinic_id",clinic.id).gte("clocked_in_at",from).lt("clocked_in_at",to)
                .order("clocked_in_at",{ascending:false}).limit(5000),
            supabaseClient.from("staff_shifts")
                .select("staff_profile_id,shift_date,starts_at,ends_at")
                .eq("clinic_id",clinic.id).gte("shift_date",startDate).lte("shift_date",endDate)
        ]);
        if (sessionError) throw sessionError;
        if (shiftError) throw shiftError;
        const ids=[...new Set((sessions||[]).map(s=>s.staff_profile_id))];
        let profiles=[];
        if(ids.length){
            const {data,error}=await supabaseClient.from("staff_profiles")
                .select("id,full_name,staff_id,department").eq("clinic_id",clinic.id).in("id",ids);
            if(error) throw error;
            profiles=data||[];
        }
        const people=new Map(profiles.map(p=>[p.id,p]));
        const shiftByKey=new Map((shifts||[]).map(s=>[s.staff_profile_id+"|"+s.shift_date,s]));
        let totalMinutes=0, incomplete=0, late=0;
        const fmt=v=>v?new Date(v).toLocaleString():"—";
        (sessions||[]).forEach(s=>{
            const p=people.get(s.staff_profile_id)||{};
            const day=new Date(s.clocked_in_at).toLocaleDateString("en-CA");
            const shift=shiftByKey.get(s.staff_profile_id+"|"+day);
            const minutes=s.clocked_out_at?Math.max(0,(new Date(s.clocked_out_at)-new Date(s.clocked_in_at))/60000):0;
            totalMinutes+=minutes;
            if(!s.clocked_out_at) incomplete++;
            if(shift && new Date(s.clocked_in_at).getTime()>new Date(shift.starts_at).getTime()+10*60000) late++;
            const row=document.createElement("tr");
            [p.full_name||"Unknown staff",p.department||"—",p.staff_id||"—",day,fmt(s.clocked_in_at),fmt(s.clocked_out_at),s.clocked_out_at?(minutes/60).toFixed(2)+" hrs":"Open session",shift?(new Date(s.clocked_in_at).getTime()>new Date(shift.starts_at).getTime()+10*60000?"Late":"On time"):"No shift linked"].forEach(v=>{
                const cell=document.createElement("td");cell.textContent=String(v);row.appendChild(cell);
            });
            body.appendChild(row);
        });
        if(!(sessions||[]).length){
            const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=8;cell.textContent="No attendance sessions found in this date range.";row.appendChild(cell);body.appendChild(row);
        }
        message.textContent="Report loaded: "+sessions.length+" sessions · "+(totalMinutes/60).toFixed(2)+" completed hours · "+late+" late arrivals · "+incomplete+" open sessions. Maximum 5,000 sessions per report.";
        message.className="message success";
    } catch(error) {
        console.error("Attendance report failed:",error);
        message.textContent=error.message||"Attendance report could not be loaded.";
        message.className="message error";
    }
}

/* HEALTHOS AI: LIVE HOSPITAL-WIDE SHIFT ROSTER */
async function loadStaffShiftRoster(clinic) {
    const body = document.getElementById("staffShiftRosterBody");
    const message = document.getElementById("staffShiftRosterMessage");
    if (!body || !message) return;
    if (!currentUser || !currentClinic || !managementVerified || clinic.id !== currentClinic.id) {
        message.textContent = "Administrator verification is required.";
        message.className = "message error";
        return;
    }
    message.textContent = "Loading today's shift roster...";
    message.className = "message";
    body.replaceChildren();
    try {
        const now = new Date();
        const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 10);
        const { data: shifts, error: shiftError } = await supabaseClient
            .from("staff_shifts")
            .select("id,staff_profile_id,shift_type,starts_at,ends_at,attendance_status,clocked_in_at,clocked_out_at")
            .eq("clinic_id", clinic.id)
            .eq("shift_date", localDate)
            .order("starts_at", { ascending: true });
        if (shiftError) throw shiftError;
        const ids = [...new Set((shifts || []).map(s => s.staff_profile_id).filter(Boolean))];
        let profiles = [];
        if (ids.length) {
            const { data, error } = await supabaseClient.from("staff_profiles")
                .select("id,full_name,staff_id,department,professional_role")
                .eq("clinic_id", clinic.id).in("id", ids);
            if (error) throw error;
            profiles = data || [];
        }
        const byId = new Map(profiles.map(p => [p.id, p]));
        const fmt = value => value ? new Date(value).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "—";
        const addCell = (row, value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value ?? "—");
            row.appendChild(cell);
        };
        if (!shifts || !shifts.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 8;
            cell.textContent = "No shifts have been assigned for today.";
            row.appendChild(cell);
            body.appendChild(row);
        } else {
            shifts.forEach(shift => {
                const person = byId.get(shift.staff_profile_id) || {};
                const start = new Date(shift.starts_at);
                const end = new Date(shift.ends_at);
                let status = shift.attendance_status || "scheduled";
                if (shift.clocked_out_at) status = "Completed";
                else if (shift.clocked_in_at) status = "On duty";
                else if (now > end) status = "Missed";
                else if (now > new Date(start.getTime() + 10 * 60000)) status = "Late";
                else status = "Scheduled";
                const row = document.createElement("tr");
                addCell(row, person.full_name || "Unknown staff");
                addCell(row, person.department || "—");
                addCell(row, (shift.shift_type || "—").replace(/_/g," "));
                addCell(row, fmt(shift.starts_at) + " – " + fmt(shift.ends_at));
                addCell(row, status);
                addCell(row, fmt(shift.clocked_in_at));
                addCell(row, fmt(shift.clocked_out_at));
                addCell(row, person.staff_id || "—");
                body.appendChild(row);
            });
        }
        const late = (shifts || []).filter(s => !s.clocked_in_at && now > new Date(new Date(s.starts_at).getTime()+10*60000) && now <= new Date(s.ends_at)).length;
        const missed = (shifts || []).filter(s => !s.clocked_in_at && now > new Date(s.ends_at)).length;
        message.textContent = "Today's roster: " + (shifts || []).length + " scheduled · " + late + " late · " + missed + " missed. Late threshold: 10 minutes after shift start.";
        message.className = "message success";
    } catch (error) {
        console.error("Staff shift roster failed:", error);
        message.textContent = error.message || "Today's shift roster could not be loaded.";
        message.className = "message error";
    }
}
/* END HEALTHOS AI: LIVE HOSPITAL-WIDE SHIFT ROSTER */


async function loadHospitalDepartmentCommand(clinic) {
 const message=document.getElementById("departmentCommandMessage");
 const body=document.getElementById("departmentCommandTableBody");
 if(!message||!body)return;
 if(!currentUser||!currentClinic||!managementVerified||clinic.id!==currentClinic.id){
  message.textContent="Verified owner or administrator access is required.";message.className="message error";return;
 }
 message.textContent="Refreshing department operations...";message.className="message";
 body.replaceChildren();
 try{
  const {data,error}=await supabaseClient.rpc("healthos_get_department_command_overview",{p_clinic_id:clinic.id});
  if(error)throw error;
  const departments=Array.isArray(data?.departments)?data.departments:[];
  const totals=departments.reduce((a,d)=>{
   a.staff+=Number(d.active_staff||0);a.pending+=Number(d.pending_requests||0);
   a.accepted+=Number(d.accepted_requests||0);a.rejected+=Number(d.rejected_requests||0);
   a.completed+=Number(d.completed_appointments||0);return a;
  },{staff:0,pending:0,accepted:0,rejected:0,completed:0});
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value);};
  set("commandDepartmentTotal",departments.length);set("commandStaffTotal",totals.staff);
  set("commandPendingTotal",totals.pending);set("commandAcceptedTotal",totals.accepted);
  set("commandRejectedTotal",totals.rejected);set("commandCompletedTotal",totals.completed);
  if(!departments.length){
   const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No active departments configured.";tr.appendChild(td);body.appendChild(tr);
  }else departments.forEach(d=>{
   const tr=document.createElement("tr");
   [d.department_name||"Department",d.active_staff||0,d.pending_requests||0,d.accepted_requests||0,d.rejected_requests||0,d.completed_appointments||0].forEach(value=>{
    const td=document.createElement("td");td.textContent=String(value);tr.appendChild(td);
   });
   body.appendChild(tr);
  });
  message.textContent="Live department overview updated. Staff and request totals are based on active department assignments and routed appointment requests.";
  message.className="message success";
 }catch(error){message.textContent=friendlyError(error);message.className="message error";const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="Unable to load department overview.";tr.appendChild(td);body.appendChild(tr);}
}
const refreshDepartmentCommand=document.getElementById("refreshDepartmentCommand");
if(refreshDepartmentCommand)refreshDepartmentCommand.addEventListener("click",()=>{if(currentClinic)void loadHospitalDepartmentCommand(currentClinic);});

// HEALTHOS AI: DEPARTMENT PERFORMANCE DASHBOARD
async function loadDepartmentPerformanceDashboard(clinic) {
    const message = document.getElementById("departmentPerformanceMessage");
    const body = document.getElementById("departmentPerformanceTableBody");

    if (!message || !body) return;

    if (
        !currentUser ||
        !currentClinic ||
        !managementVerified ||
        clinic.id !== currentClinic.id
    ) {
        message.textContent = "Administrator verification is required.";
        message.className = "message error";
        return;
    }

    message.textContent = "Loading department performance...";
    message.className = "message";
    body.replaceChildren();

    try {
        const { data, error } = await supabaseClient.rpc(
            "get_department_performance",
            { p_clinic_id: clinic.id }
        );

        if (error) throw error;

        const departments = data && Array.isArray(data.departments)
            ? data.departments
            : [];

        if (departments.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 8;
            cell.textContent = "No active departments are available in this report.";
            row.appendChild(cell);
            body.appendChild(row);
        } else {
            departments.forEach(function (department) {
                const row = document.createElement("tr");
                const values = [
                    department.department_name || "—",
                    department.unit_name || "All units",
                    department.active_staff ?? 0,
                    department.tasks_assigned ?? 0,
                    department.tasks_pending ?? 0,
                    department.tasks_completed ?? 0,
                    department.tasks_overdue ?? 0,
                    (department.completion_rate_percent ?? 0) + "%"
                ];

                values.forEach(function (value) {
                    const cell = document.createElement("td");
                    cell.textContent = String(value);
                    row.appendChild(cell);
                });

                body.appendChild(row);
            });
        }

        message.textContent =
            "Department report updated. Scope: " +
            (data.scope === "hospital_wide"
                ? "hospital-wide management"
                : "authorised departments only") +
            ". Task figures are based on tasks created within the last 30 days.";
        message.className = "message success";
        await loadDepartmentWorkspaceDirectory(clinic, departments);
        await loadDepartmentTaskEscalations(clinic);
    } catch (error) {
        console.error("Department performance report failed:", error);
        message.textContent =
            error.message ||
            "Department performance could not be loaded. Check the report permissions.";
        message.className = "message error";
    }
}

 

// HEALTHOS MEDICAL SYSTEMS: DEPARTMENT TASK BOARD
async function loadDepartmentWorkspaceTaskBoard(clinic, departmentId, root) {
    if (!root || !clinic || !departmentId) return;
    const status = root.querySelector("[data-task-board-status]");
    const list = root.querySelector("[data-task-board-list]");
    const filter = root.querySelector("[data-task-board-filter]");
    if (!status || !list || !filter) return;

    status.textContent = "Loading department task records...";
    status.className = "message";
    list.replaceChildren();

    try {
        const { data, error } = await supabaseClient.rpc("get_department_task_board", {
            p_clinic_id: clinic.id,
            p_department_id: departmentId,
            p_status: filter.value || null,
            p_limit: 200
        });
        if (error) throw error;
        const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
        const counts = tasks.reduce((result, task) => {
            const key = String(task.task_status || "unknown");
            result[key] = (result[key] || 0) + 1;
            return result;
        }, {});
        status.textContent = tasks.length + " task record(s) loaded · " +
            Object.entries(counts).map(([key, value]) => value + " " + key.replace(/_/g, " ")).join(" · ") +
            (tasks.length === 200 ? " · Showing the latest 200 matching records." : "");
        status.className = "message success";

        if (!tasks.length) {
            const empty = document.createElement("p");
            empty.className = "muted";
            empty.textContent = "No tasks match this department and status filter.";
            list.appendChild(empty);
            return;
        }

        const formatDate = value => value ? new Date(value).toLocaleString() : "Not recorded";
        tasks.forEach(task => {
            const card = document.createElement("article");
            card.className = "department-workspace-role";
            const title = document.createElement("h5");
            title.textContent = task.task_title || "Untitled task";
            const state = document.createElement("p");
            state.className = "stat-note";
            state.textContent = "Status: " + String(task.task_status || "unknown").replace(/_/g, " ") +
                " · Priority: " + String(task.priority || "normal").toUpperCase();
            const assignment = document.createElement("p");
            assignment.textContent = "Assigned to: " + (task.assignee_name || "Unknown staff") +
                (task.assignee_staff_id ? " (" + task.assignee_staff_id + ")" : "") +
                (task.unit_name ? " · Unit: " + task.unit_name : "");
            const due = document.createElement("p");
            due.textContent = "Deadline: " + formatDate(task.due_at) +
                " · Assigned: " + formatDate(task.created_at);
            card.append(title, state, assignment, due);

            if (task.task_description) {
                const description = document.createElement("p");
                description.textContent = "Instructions: " + task.task_description;
                card.appendChild(description);
            }
            const lifecycle = document.createElement("p");
            lifecycle.className = "muted";
            lifecycle.textContent = [
                task.accepted_at ? "Accepted " + formatDate(task.accepted_at) : "",
                task.started_at ? "Started " + formatDate(task.started_at) : "",
                task.submitted_at ? "Submitted " + formatDate(task.submitted_at) : "",
                task.completed_at ? "Completed " + formatDate(task.completed_at) : "",
                task.reviewed_at ? "Reviewed " + formatDate(task.reviewed_at) : ""
            ].filter(Boolean).join(" · ") || "No execution timestamps recorded yet.";
            card.appendChild(lifecycle);

            const requirements = document.createElement("p");
            requirements.className = "stat-note";
            requirements.textContent = "Controls: " +
                (task.requires_evidence ? "evidence required" : "evidence not required") + " · " +
                (task.requires_supervisor_review ? "supervisor review required" : "supervisor review not required") + " · " +
                (task.requires_separate_approval ? "separate approval required" : "separate approval not required");
            card.appendChild(requirements);

            if (task.review_status || task.review_notes || task.reviewed_by_name) {
                const review = document.createElement("p");
                review.textContent = "Review: " + String(task.review_status || "pending").replace(/_/g, " ") +
                    (task.reviewed_by_name ? " by " + task.reviewed_by_name : "") +
                    (task.review_notes ? " · " + task.review_notes : "");
                card.appendChild(review);
            }

            const evidenceItems = Array.isArray(task.evidence) ? task.evidence : [];
            const evidenceDetails = document.createElement("details");
            const evidenceSummary = document.createElement("summary");
            evidenceSummary.textContent = "Completion evidence (" + evidenceItems.length + ")";
            evidenceDetails.appendChild(evidenceSummary);
            if (!evidenceItems.length) {
                const none = document.createElement("p");
                none.className = "muted";
                none.textContent = "No evidence has been recorded.";
                evidenceDetails.appendChild(none);
            } else evidenceItems.forEach(item => {
                const line = document.createElement("p");
                line.textContent = [item.evidence_type || "Evidence", item.evidence_text || "", item.source_reference || "", item.submitted_by ? "Submitted by " + item.submitted_by : "", formatDate(item.captured_at || item.created_at)].filter(Boolean).join(" · ");
                evidenceDetails.appendChild(line);
            });
            card.appendChild(evidenceDetails);

            const events = Array.isArray(task.events) ? task.events : [];
            const eventDetails = document.createElement("details");
            const eventSummary = document.createElement("summary");
            eventSummary.textContent = "Accountability history (" + events.length + ")";
            eventDetails.appendChild(eventSummary);
            if (!events.length) {
                const none = document.createElement("p");
                none.className = "muted";
                none.textContent = "No task events have been recorded.";
                eventDetails.appendChild(none);
            } else events.forEach(item => {
                const line = document.createElement("p");
                line.textContent = formatDate(item.created_at) + " · " +
                    String(item.event_type || "event").replace(/_/g, " ") +
                    (item.actor_name ? " · " + item.actor_name : "") +
                    (item.from_status || item.to_status ? " · " + String(item.from_status || "new").replace(/_/g, " ") + " → " + String(item.to_status || "").replace(/_/g, " ") : "") +
                    (item.event_notes ? " · " + item.event_notes : "");
                eventDetails.appendChild(line);
            });
            card.appendChild(eventDetails);
            list.appendChild(card);
        });
    } catch (error) {
        console.error("Department task board failed:", error);
        status.textContent = friendlyError(error);
        status.className = "message error";
    }
}
// END DEPARTMENT TASK BOARD

// HEALTHOS MEDICAL SYSTEMS: DEPARTMENT WORKSPACE DIRECTORY
// Uses existing clinic department records and the authorised performance RPC.
// It does not create data or bypass department-level permissions.
async function loadDepartmentWorkspaceDirectory(clinic, performanceRows) {
    const list = document.getElementById("departmentWorkspaceCards");
    const search = document.getElementById("departmentWorkspaceSearch");
    const message = document.getElementById("departmentWorkspaceMessage");
    const detail = document.getElementById("departmentWorkspaceDetail");
    if (!list || !message || !clinic || !currentUser || !managementVerified || clinic.id !== currentClinic?.id) return;

    message.textContent = "Loading departments in your authorised hospital scope...";
    message.className = "message";
    list.replaceChildren();

    try {
        const { data: departments, error } = await supabaseClient
            .from("clinic_departments")
            .select("id, department_code, department_name, department_group, description, is_custom")
            .eq("clinic_id", clinic.id)
            .eq("is_active", true)
            .order("department_name", { ascending: true });
        if (error) throw error;

        const rows = Array.isArray(performanceRows) ? performanceRows : [];
        const metricsByName = new Map();
        rows.forEach(item => {
            const key = String(item.department_name || "").trim().toLowerCase();
            if (!key) return;
            const current = metricsByName.get(key) || { staff: 0, assigned: 0, pending: 0, completed: 0, overdue: 0 };
            current.staff = Math.max(current.staff, Number(item.active_staff || 0));
            current.assigned += Number(item.tasks_assigned || 0);
            current.pending += Number(item.tasks_pending || 0);
            current.completed += Number(item.tasks_completed || 0);
            current.overdue += Number(item.tasks_overdue || 0);
            metricsByName.set(key, current);
        });

        const render = () => {
            const term = String(search?.value || "").trim().toLowerCase();
            const filtered = (departments || []).filter(department =>
                [department.department_name, department.department_code, department.department_group, department.description]
                    .some(value => String(value || "").toLowerCase().includes(term))
            );
            list.replaceChildren();
            if (!filtered.length) {
                const empty = document.createElement("p");
                empty.className = "muted";
                empty.textContent = "No departments match this search.";
                list.appendChild(empty);
                return;
            }
            filtered.forEach(department => {
                const metric = metricsByName.get(String(department.department_name || "").trim().toLowerCase()) ||
                    { staff: 0, assigned: 0, pending: 0, completed: 0, overdue: 0 };
                const card = document.createElement("article");
                card.className = "department-workspace-card";
                const title = document.createElement("h4");
                title.textContent = department.department_name;
                const group = document.createElement("p");
                group.className = "muted";
                group.textContent = (department.department_group || "Hospital department") + (department.is_custom ? " · Hospital-created" : " · Standard");
                const summary = document.createElement("p");
                summary.textContent = metric.staff + " active staff · " + metric.pending + " pending tasks · " + metric.overdue + " overdue";
                const open = document.createElement("button");
                open.type = "button";
                open.className = "secondary-button";
                open.textContent = "Open department workspace";
                open.addEventListener("click", async () => {
                    if (!detail) return;
                    detail.hidden = false;
                    detail.replaceChildren();
                    const heading = document.createElement("h3");
                    heading.textContent = department.department_name + " — Department Workspace";
                    const loading = document.createElement("p");
                    loading.className = "message";
                    loading.textContent = "Loading authorised department workspace...";
                    detail.append(heading, loading);
                    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    try {
                        const { data, error } = await supabaseClient.rpc("get_department_workspace_foundation", {
                            p_clinic_id: clinic.id,
                            p_department_id: department.id
                        });
                        if (error) throw error;
                        const workspace = data || {};
                        const summaryData = workspace.summary || {};
                        const taskData = summaryData.tasks_30_days || {};
                        detail.replaceChildren();
                        detail.appendChild(heading);

                        const description = document.createElement("p");
                        description.className = "muted";
                        description.textContent = workspace.department?.description || department.description || "No department description has been configured.";
                        detail.appendChild(description);

                        const stats = document.createElement("div");
                        stats.className = "department-workspace-stats";
                        [
                            ["Active staff", summaryData.active_staff ?? metric.staff],
                            ["Tasks (30 days)", taskData.total ?? metric.assigned],
                            ["Pending tasks", taskData.pending ?? metric.pending],
                            ["Completed tasks", taskData.completed ?? metric.completed],
                            ["Overdue tasks", taskData.overdue ?? metric.overdue],
                            ["Awaiting review", taskData.awaiting_review ?? 0]
                        ].forEach(([label, value]) => {
                            const item = document.createElement("div");
                            item.className = "stat-card";
                            const name = document.createElement("p");
                            name.textContent = label;
                            const number = document.createElement("h3");
                            number.textContent = String(value);
                            item.append(name, number);
                            stats.appendChild(item);
                        });
                        detail.appendChild(stats);

                        const taskBoardHeading = document.createElement("h4");
                        taskBoardHeading.textContent = "Department task management & execution";
                        const taskBoard = document.createElement("section");
                        taskBoard.className = "panel";
                        taskBoard.style.margin = "18px 0";
                        const taskBoardControls = document.createElement("div");
                        taskBoardControls.className = "form-grid";
                        const taskBoardFilterLabel = document.createElement("label");
                        taskBoardFilterLabel.textContent = "Filter tasks by status";
                        const taskBoardFilter = document.createElement("select");
                        taskBoardFilter.setAttribute("data-task-board-filter", "");
                        [
                            ["", "All task statuses"], ["assigned", "Assigned"], ["accepted", "Accepted"],
                            ["in_progress", "In progress"], ["blocked", "Blocked"], ["submitted", "Submitted for review"],
                            ["completed", "Completed"], ["cancelled", "Cancelled"]
                        ].forEach(([value, label]) => taskBoardFilter.add(new Option(label, value)));
                        taskBoardFilterLabel.appendChild(taskBoardFilter);
                        const taskBoardRefresh = document.createElement("button");
                        taskBoardRefresh.type = "button";
                        taskBoardRefresh.className = "secondary-button";
                        taskBoardRefresh.textContent = "Refresh task board";
                        taskBoardControls.append(taskBoardFilterLabel, taskBoardRefresh);
                        const taskBoardStatus = document.createElement("p");
                        taskBoardStatus.className = "message";
                        taskBoardStatus.setAttribute("role", "status");
                        taskBoardStatus.setAttribute("data-task-board-status", "");
                        const taskBoardList = document.createElement("div");
                        taskBoardList.setAttribute("data-task-board-list", "");
                        taskBoard.append(taskBoardControls, taskBoardStatus, taskBoardList);
                        detail.append(taskBoardHeading, taskBoard);
                        taskBoardFilter.addEventListener("change", () => {
                            void loadDepartmentWorkspaceTaskBoard(clinic, department.id, taskBoard);
                        });
                        taskBoardRefresh.addEventListener("click", () => {
                            void loadDepartmentWorkspaceTaskBoard(clinic, department.id, taskBoard);
                        });
                        void loadDepartmentWorkspaceTaskBoard(clinic, department.id, taskBoard);

                        // Stage 3C: department-scoped supervisor review queue.
                        const reviewHeading = document.createElement("h4");
                        reviewHeading.textContent = "Supervisor review & approval";
                        const reviewPanel = document.createElement("section");
                        reviewPanel.className = "panel";
                        reviewPanel.style.margin = "18px 0";
                        const reviewIntro = document.createElement("p");
                        reviewIntro.className = "muted";
                        reviewIntro.textContent = "Review submitted work and its evidence. The database checks supervisor authority and separate-approval requirements before any decision is recorded.";
                        const reviewStatus = document.createElement("p");
                        reviewStatus.className = "message";
                        reviewStatus.setAttribute("role", "status");
                        reviewStatus.setAttribute("aria-live", "polite");
                        const reviewList = document.createElement("div");
                        const reviewRefresh = document.createElement("button");
                        reviewRefresh.type = "button";
                        reviewRefresh.className = "secondary-button";
                        reviewRefresh.textContent = "Refresh review queue";
                        reviewPanel.append(reviewIntro, reviewRefresh, reviewStatus, reviewList);
                        detail.append(reviewHeading, reviewPanel);

                        async function refreshDepartmentSupervisorReviews() {
                            reviewList.replaceChildren();
                            reviewStatus.textContent = "Loading submitted work for this department...";
                            reviewStatus.className = "message";
                            reviewRefresh.disabled = true;
                            try {
                                const { data: reviewData, error: reviewLoadError } = await supabaseClient.rpc(
                                    "get_department_supervisor_task_reviews",
                                    { p_clinic_id: clinic.id, p_department_id: department.id }
                                );
                                if (reviewLoadError) throw reviewLoadError;
                                const reviewTasks = Array.isArray(reviewData?.tasks) ? reviewData.tasks : [];
                                if (!reviewTasks.length) {
                                    reviewStatus.textContent = "No submitted tasks are currently waiting for your review in this department.";
                                    reviewStatus.className = "message success";
                                    return;
                                }
                                reviewStatus.textContent = reviewTasks.length + " submitted task(s) awaiting an authorised review.";
                                reviewStatus.className = "message success";
                                reviewTasks.forEach(task => {
                                    const card = document.createElement("article");
                                    card.className = "stat-card";
                                    const title = document.createElement("h5");
                                    title.textContent = task.task_title || "Submitted task";
                                    const meta = document.createElement("p");
                                    meta.className = "muted";
                                    meta.textContent = (task.assignee_name || "Staff member") +
                                        (task.assignee_staff_id ? " (" + task.assignee_staff_id + ")" : "") +
                                        (task.unit_name ? " · " + task.unit_name : "") +
                                        " · " + String(task.priority || "normal").toUpperCase() +
                                        (task.submitted_at ? " · Submitted " + formatDate(task.submitted_at) : "");
                                    card.append(title, meta);
                                    if (task.task_description) {
                                        const instructions = document.createElement("p");
                                        instructions.textContent = task.task_description;
                                        card.appendChild(instructions);
                                    }
                                    const requirements = document.createElement("p");
                                    requirements.className = "stat-note";
                                    requirements.textContent =
                                        (task.requires_evidence ? "Evidence required" : "Evidence not mandatory") +
                                        (task.requires_separate_approval ? " · Separate approval required" : "");
                                    card.appendChild(requirements);

                                    const evidenceHeading = document.createElement("strong");
                                    evidenceHeading.textContent = "Submitted evidence";
                                    card.appendChild(evidenceHeading);
                                    const evidenceItems = Array.isArray(task.evidence) ? task.evidence : [];
                                    if (!evidenceItems.length) {
                                        const noEvidence = document.createElement("p");
                                        noEvidence.className = "muted";
                                        noEvidence.textContent = task.requires_evidence
                                            ? "No evidence item was returned. Do not approve until the required evidence is available and verified."
                                            : "No evidence was attached to this submission.";
                                        card.appendChild(noEvidence);
                                    } else {
                                        evidenceItems.forEach(item => {
                                            const evidence = document.createElement("p");
                                            evidence.textContent = (item.type || "Evidence") + ": " +
                                                (item.text || item.reference || "Evidence record") +
                                                (item.submitted_by ? " · Submitted by " + item.submitted_by : "") +
                                                (item.captured_at ? " · " + formatDate(item.captured_at) : "");
                                            card.appendChild(evidence);
                                        });
                                    }

                                    const notesLabel = document.createElement("label");
                                    notesLabel.textContent = "Review notes (required for rejection or correction request)";
                                    const notes = document.createElement("textarea");
                                    notes.rows = 3;
                                    notes.maxLength = 3000;
                                    notes.placeholder = "Record findings, corrections or reason for rejection";
                                    notesLabel.appendChild(notes);
                                    card.appendChild(notesLabel);

                                    const actionStatus = document.createElement("p");
                                    actionStatus.className = "message";
                                    actionStatus.setAttribute("role", "status");
                                    const actions = document.createElement("div");
                                    actions.className = "button-group";
                                    [
                                        ["approved", "Approve completion"],
                                        ["changes_requested", "Request corrections"],
                                        ["rejected", "Reject submission"]
                                    ].forEach(([decision, label]) => {
                                        const button = document.createElement("button");
                                        button.type = "button";
                                        button.className = decision === "approved" ? "primary-button" : "secondary-button";
                                        button.textContent = label;
                                        button.addEventListener("click", async () => {
                                            if (decision !== "approved" && notes.value.trim().length < 3) {
                                                actionStatus.textContent = "Enter at least 3 characters explaining the decision.";
                                                actionStatus.className = "message error";
                                                return;
                                            }
                                            if (decision === "approved" && task.requires_evidence && !evidenceItems.length) {
                                                actionStatus.textContent = "Approval blocked in this screen: required evidence is missing. Verify and submit the evidence before approval.";
                                                actionStatus.className = "message error";
                                                return;
                                            }
                                            actions.querySelectorAll("button").forEach(item => item.disabled = true);
                                            actionStatus.textContent = "Submitting review decision to the secured database workflow...";
                                            actionStatus.className = "message";
                                            try {
                                                const { error: reviewError } = await supabaseClient.rpc(
                                                    "review_supervisor_staff_task",
                                                    {
                                                        p_clinic_id: clinic.id,
                                                        p_task_id: task.id,
                                                        p_decision: decision,
                                                        p_notes: notes.value.trim() || null
                                                    }
                                                );
                                                if (reviewError) throw reviewError;
                                                actionStatus.textContent = decision === "approved"
                                                    ? "Completion approved and recorded."
                                                    : decision === "changes_requested"
                                                        ? "Corrections requested and recorded."
                                                        : "Submission rejected and recorded.";
                                                actionStatus.className = "message success";
                                                await refreshDepartmentSupervisorReviews();
                                                await loadDepartmentWorkspaceTaskBoard(clinic, department.id, taskBoard);
                                            } catch (reviewError) {
                                                console.error("Department task review failed:", reviewError);
                                                actionStatus.textContent = friendlyError(reviewError);
                                                actionStatus.className = "message error";
                                                actions.querySelectorAll("button").forEach(item => item.disabled = false);
                                            }
                                        });
                                        actions.appendChild(button);
                                    });
                                    card.append(actions, actionStatus);
                                    reviewList.appendChild(card);
                                });
                            } catch (reviewLoadError) {
                                console.error("Department supervisor review queue failed:", reviewLoadError);
                                reviewStatus.textContent = friendlyError(reviewLoadError);
                                reviewStatus.className = "message error";
                            } finally {
                                reviewRefresh.disabled = false;
                            }
                        }
                        reviewRefresh.addEventListener("click", () => void refreshDepartmentSupervisorReviews());
                        void refreshDepartmentSupervisorReviews();

                        // Stage 3D: department performance, accountability and escalation centre.
                        // Uses the existing department-scoped task board; no parallel task engine or
                        // client-side permission bypass is introduced.
                        const escalationHeading = document.createElement("h4");
                        escalationHeading.textContent = "Department performance & escalation centre";
                        const escalationPanel = document.createElement("section");
                        escalationPanel.className = "panel";
                        escalationPanel.style.margin = "18px 0";
                        const escalationIntro = document.createElement("p");
                        escalationIntro.className = "muted";
                        escalationIntro.textContent = "Live view of overdue work, blockers, delayed reviews and recorded staff completions. Escalation visibility follows the same department and unit permissions as the task board.";
                        const escalationRefresh = document.createElement("button");
                        escalationRefresh.type = "button";
                        escalationRefresh.className = "secondary-button";
                        escalationRefresh.textContent = "Refresh performance & escalations";
                        const escalationStatus = document.createElement("p");
                        escalationStatus.className = "message";
                        escalationStatus.setAttribute("role", "status");
                        escalationStatus.setAttribute("aria-live", "polite");
                        const escalationStats = document.createElement("div");
                        escalationStats.className = "department-workspace-stats";
                        const escalationList = document.createElement("div");
                        escalationPanel.append(escalationIntro, escalationRefresh, escalationStatus, escalationStats, escalationList);
                        detail.append(escalationHeading, escalationPanel);

                        async function refreshDepartmentPerformanceEscalations() {
                            escalationRefresh.disabled = true;
                            escalationStatus.textContent = "Loading department accountability and escalation records...";
                            escalationStatus.className = "message";
                            escalationStats.replaceChildren();
                            escalationList.replaceChildren();
                            try {
                                const { data: boardData, error: boardError } = await supabaseClient.rpc(
                                    "get_department_task_board",
                                    { p_clinic_id: clinic.id, p_department_id: department.id, p_status: null, p_limit: 200 }
                                );
                                if (boardError) throw boardError;
                                const tasks = Array.isArray(boardData?.tasks) ? boardData.tasks : [];
                                const now = Date.now();
                                const active = tasks.filter(task => !["completed", "cancelled"].includes(task.task_status));
                                const overdue = active.filter(task => task.due_at && new Date(task.due_at).getTime() < now);
                                const blocked = active.filter(task => task.task_status === "blocked");
                                const awaitingReview = active.filter(task => task.task_status === "submitted" &&
                                    (task.requires_supervisor_review || task.requires_separate_approval));
                                const delayedReviews = awaitingReview.filter(task => {
                                    const submitted = task.submitted_at || task.updated_at;
                                    return submitted && now - new Date(submitted).getTime() >= 24 * 60 * 60 * 1000;
                                });
                                const completed = tasks.filter(task => task.task_status === "completed");
                                const staffCompletions = new Map();
                                completed.forEach(task => {
                                    const name = task.assignee_name || "Unidentified staff";
                                    const item = staffCompletions.get(name) || { count: 0, staffId: task.assignee_staff_id || "" };
                                    item.count += 1;
                                    staffCompletions.set(name, item);
                                });
                                const metrics = [
                                    ["Overdue tasks", overdue.length],
                                    ["Blocked tasks", blocked.length],
                                    ["Awaiting review", awaitingReview.length],
                                    ["Reviews delayed ≥24h", delayedReviews.length],
                                    ["Completed in loaded records", completed.length],
                                    ["Staff with completions", staffCompletions.size]
                                ];
                                metrics.forEach(([label, value]) => {
                                    const card = document.createElement("div");
                                    card.className = "stat-card";
                                    const name = document.createElement("p");
                                    name.textContent = label;
                                    const number = document.createElement("h3");
                                    number.textContent = String(value);
                                    card.append(name, number);
                                    escalationStats.appendChild(card);
                                });
                                escalationStatus.textContent = tasks.length + " task record(s) assessed in this authorised department scope." +
                                    (tasks.length === 200 ? " The board reached its 200-record limit; older records may not be represented." : "") +
                                    " A review is flagged delayed after 24 hours from its latest submitted timestamp.";
                                escalationStatus.className = "message success";

                                const formatWhen = value => value ? new Date(value).toLocaleString() : "Not recorded";
                                const appendGroup = (titleText, records, detailText) => {
                                    const group = document.createElement("section");
                                    group.className = "department-workspace-role";
                                    const title = document.createElement("h5");
                                    title.textContent = titleText + " (" + records.length + ")";
                                    group.appendChild(title);
                                    if (!records.length) {
                                        const empty = document.createElement("p");
                                        empty.className = "muted";
                                        empty.textContent = "No records in this category.";
                                        group.appendChild(empty);
                                    } else records.forEach(task => {
                                        const row = document.createElement("p");
                                        row.textContent = (task.task_title || "Untitled task") +
                                            " · " + (task.assignee_name || "Unassigned / unknown staff") +
                                            (task.assignee_staff_id ? " (" + task.assignee_staff_id + ")" : "") +
                                            " · " + String(task.task_status || "unknown").replace(/_/g, " ") +
                                            (task.due_at ? " · Due " + formatWhen(task.due_at) : "") +
                                            (detailText(task) ? " · " + detailText(task) : "");
                                        group.appendChild(row);
                                    });
                                    escalationList.appendChild(group);
                                };
                                appendGroup("Overdue work", overdue, task => {
                                    const hours = Math.max(0, Math.floor((now - new Date(task.due_at).getTime()) / 3600000));
                                    return hours + " hour(s) overdue";
                                });
                                appendGroup("Unresolved blockers", blocked, task => task.unit_name ? "Unit: " + task.unit_name : "");
                                appendGroup("Supervisor reviews awaiting decision", awaitingReview, task =>
                                    "Submitted " + formatWhen(task.submitted_at || task.updated_at) +
                                    (delayedReviews.includes(task) ? " · DELAYED ≥24 HOURS" : ""));
                                const completionGroup = document.createElement("section");
                                completionGroup.className = "department-workspace-role";
                                const completionTitle = document.createElement("h5");
                                completionTitle.textContent = "Staff completion records (" + completed.length + ")";
                                completionGroup.appendChild(completionTitle);
                                if (!staffCompletions.size) {
                                    const empty = document.createElement("p");
                                    empty.className = "muted";
                                    empty.textContent = "No completed task records in the loaded period.";
                                    completionGroup.appendChild(empty);
                                } else {
                                    [...staffCompletions.entries()].sort((a,b) => b[1].count - a[1].count).forEach(([name, item]) => {
                                        const row = document.createElement("p");
                                        row.textContent = name + (item.staffId ? " (" + item.staffId + ")" : "") + " · " + item.count + " completed task(s)";
                                        completionGroup.appendChild(row);
                                    });
                                }
                                escalationList.appendChild(completionGroup);
                            } catch (escalationError) {
                                console.error("Department performance and escalation centre failed:", escalationError);
                                escalationStatus.textContent = friendlyError(escalationError);
                                escalationStatus.className = "message error";
                            } finally {
                                escalationRefresh.disabled = false;
                            }
                        }
                        escalationRefresh.addEventListener("click", () => void refreshDepartmentPerformanceEscalations());
                        void refreshDepartmentPerformanceEscalations();

                        // Stage 3E: department staff attendance, shift and task accountability.
                        // Presence (online) is deliberately displayed separately from duty (clocked in).
                        const accountabilityHeading = document.createElement("h4");
                        accountabilityHeading.textContent = "Staff attendance & accountability";
                        const accountabilityPanel = document.createElement("section");
                        accountabilityPanel.className = "panel";
                        accountabilityPanel.style.margin = "18px 0";
                        const accountabilityIntro = document.createElement("p");
                        accountabilityIntro.className = "muted";
                        accountabilityIntro.textContent = "Compare today's assigned shift, attendance clock-ins, online presence and recent task completion. Online status does not mean a staff member is on duty.";
                        const accountabilityRefresh = document.createElement("button");
                        accountabilityRefresh.type = "button";
                        accountabilityRefresh.className = "secondary-button";
                        accountabilityRefresh.textContent = "Refresh staff accountability";
                        const accountabilityStatus = document.createElement("p");
                        accountabilityStatus.className = "message";
                        accountabilityStatus.setAttribute("role", "status");
                        accountabilityStatus.setAttribute("aria-live", "polite");
                        const accountabilityStats = document.createElement("div");
                        accountabilityStats.className = "department-workspace-stats";
                        const accountabilityTableWrap = document.createElement("div");
                        accountabilityTableWrap.style.overflowX = "auto";
                        const accountabilityTable = document.createElement("table");
                        accountabilityTable.className = "data-table";
                        const accountabilityHead = document.createElement("thead");
                        const accountabilityHeaderRow = document.createElement("tr");
                        ["Staff member","Role / unit","Online presence","Today's shift","Attendance","Last clock-in","Last clock-out","Tasks completed (30d)","Overdue tasks"].forEach(label => {
                            const th = document.createElement("th");
                            th.textContent = label;
                            accountabilityHeaderRow.appendChild(th);
                        });
                        accountabilityHead.appendChild(accountabilityHeaderRow);
                        const accountabilityBody = document.createElement("tbody");
                        accountabilityTable.append(accountabilityHead, accountabilityBody);
                        accountabilityTableWrap.appendChild(accountabilityTable);
                        accountabilityPanel.append(accountabilityIntro, accountabilityRefresh, accountabilityStatus, accountabilityStats, accountabilityTableWrap);
                        detail.append(accountabilityHeading, accountabilityPanel);

                        async function refreshDepartmentStaffAccountability() {
                            accountabilityRefresh.disabled = true;
                            accountabilityStatus.textContent = "Loading authorised department staff, shift and attendance records...";
                            accountabilityStatus.className = "message";
                            accountabilityStats.replaceChildren();
                            accountabilityBody.replaceChildren();
                            try {
                                const { data: accountabilityData, error: accountabilityError } = await supabaseClient.rpc(
                                    "get_department_staff_accountability",
                                    { p_clinic_id: clinic.id, p_department_id: department.id }
                                );
                                if (accountabilityError) throw accountabilityError;
                                const staffRows = Array.isArray(accountabilityData?.staff) ? accountabilityData.staff : [];
                                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                                const isOnline = row => row.presence_status === "online" && row.last_seen_at &&
                                    new Date(row.last_seen_at).getTime() >= fiveMinutesAgo;
                                const isOnDuty = row => row.today_shift_attendance_status === "on_duty" ||
                                    Boolean(row.open_attendance_clock_in_at);
                                const stats = [
                                    ["Active department assignments", staffRows.length],
                                    ["Online now", staffRows.filter(isOnline).length],
                                    ["Clocked in / on duty", staffRows.filter(isOnDuty).length],
                                    ["Not clocked in", staffRows.filter(row => !isOnDuty(row)).length],
                                    ["Completed tasks (30d)", staffRows.reduce((sum,row) => sum + Number(row.tasks_completed_30d || 0),0)],
                                    ["Overdue open tasks", staffRows.reduce((sum,row) => sum + Number(row.overdue_open_tasks || 0),0)]
                                ];
                                stats.forEach(([label,value]) => {
                                    const card = document.createElement("div");
                                    card.className = "stat-card";
                                    const title = document.createElement("p");
                                    title.textContent = label;
                                    const number = document.createElement("h3");
                                    number.textContent = String(value);
                                    card.append(title,number);
                                    accountabilityStats.appendChild(card);
                                });
                                const time = value => value ? new Date(value).toLocaleString() : "—";
                                if (!staffRows.length) {
                                    const row = accountabilityBody.insertRow();
                                    const cell = row.insertCell();
                                    cell.colSpan = 9;
                                    cell.textContent = "No active staff assignments are recorded for this department and your authorised scope.";
                                } else staffRows.forEach(person => {
                                    const row = accountabilityBody.insertRow();
                                    const values = [
                                        (person.full_name || "Unnamed staff") + (person.staff_id ? " · " + person.staff_id : ""),
                                        (person.professional_role || "Role not recorded") + (person.unit_name ? " · " + person.unit_name : ""),
                                        isOnline(person) ? "Online" : "Offline / stale",
                                        person.today_shift_type
                                            ? String(person.today_shift_type).replace(/_/g," ") + " · " +
                                              time(person.today_shift_starts_at) + " – " + time(person.today_shift_ends_at)
                                            : "No shift assigned today",
                                        person.today_shift_attendance_status
                                            ? String(person.today_shift_attendance_status).replace(/_/g," ")
                                            : person.open_attendance_clock_in_at ? "Clocked in (no shift)" : "Not clocked in",
                                        time(person.today_shift_clocked_in_at || person.open_attendance_clock_in_at || person.last_clock_in_at),
                                        time(person.today_shift_clocked_out_at || person.latest_session_clock_out_at || person.last_clock_out_at),
                                        Number(person.tasks_completed_30d || 0),
                                        Number(person.overdue_open_tasks || 0)
                                    ];
                                    values.forEach(value => {
                                        const cell = row.insertCell();
                                        cell.textContent = String(value);
                                    });
                                });
                                accountabilityStatus.textContent = staffRows.length + " active staff assignment(s) loaded. Online means a presence heartbeat within five minutes; on-duty is based on attendance records. Attendance and task records are read-only in this panel.";
                                accountabilityStatus.className = "message success";
                            } catch (accountabilityLoadError) {
                                console.error("Department staff accountability load failed:", accountabilityLoadError);
                                accountabilityStatus.textContent = friendlyError(accountabilityLoadError);
                                accountabilityStatus.className = "message error";
                            } finally {
                                accountabilityRefresh.disabled = false;
                            }
                        }
                        accountabilityRefresh.addEventListener("click", () => void refreshDepartmentStaffAccountability());
                        void refreshDepartmentStaffAccountability();

                        // Stage 3H: compare recorded roster and clock-ins against approved hospital requirements.
                        const staffingCoverageHeading=document.createElement("h4");
                        staffingCoverageHeading.textContent="Minimum staffing requirement coverage";
                        const staffingCoveragePanel=document.createElement("section");
                        staffingCoveragePanel.className="panel";
                        staffingCoveragePanel.style.margin="18px 0";
                        const staffingCoverageIntro=document.createElement("p");
                        staffingCoverageIntro.className="muted";
                        staffingCoverageIntro.textContent="This compares approved hospital staffing requirements with recorded staff shifts and active clock-ins. It does not create clinical staffing ratios or treat missing roster entries as staff absence.";
                        const staffingCoverageControls=document.createElement("div");
                        staffingCoverageControls.className="button-row";
                        const staffingCoverageDate=document.createElement("input");
                        staffingCoverageDate.type="date";
                        staffingCoverageDate.setAttribute("aria-label","Coverage date");
                        staffingCoverageDate.value=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
                        const staffingCoverageRefresh=document.createElement("button");
                        staffingCoverageRefresh.type="button";
                        staffingCoverageRefresh.className="secondary-button";
                        staffingCoverageRefresh.textContent="Refresh coverage";
                        staffingCoverageControls.append(staffingCoverageDate,staffingCoverageRefresh);
                        const staffingCoverageStatus=document.createElement("p");
                        staffingCoverageStatus.className="message";
                        staffingCoverageStatus.setAttribute("role","status");
                        staffingCoverageStatus.setAttribute("aria-live","polite");
                        const staffingCoverageTableWrap=document.createElement("div");
                        staffingCoverageTableWrap.style.overflowX="auto";
                        const staffingCoverageTable=document.createElement("table");
                        staffingCoverageTable.className="data-table";
                        const staffingCoverageHead=document.createElement("thead");
                        const staffingCoverageHeader=document.createElement("tr");
                        ["Professional role","Shift","Approved minimum","Scheduled","Clocked in","Recorded comparison","Policy reference"].forEach(label=>{const th=document.createElement("th");th.textContent=label;staffingCoverageHeader.appendChild(th);});
                        staffingCoverageHead.appendChild(staffingCoverageHeader);
                        const staffingCoverageBody=document.createElement("tbody");
                        staffingCoverageTable.append(staffingCoverageHead,staffingCoverageBody);
                        staffingCoverageTableWrap.appendChild(staffingCoverageTable);
                        staffingCoveragePanel.append(staffingCoverageIntro,staffingCoverageControls,staffingCoverageStatus,staffingCoverageTableWrap);
                        detail.append(staffingCoverageHeading,staffingCoveragePanel);
                        async function refreshDepartmentStaffingCoverage(){
                            staffingCoverageRefresh.disabled=true;
                            staffingCoverageStatus.textContent="Comparing approved staffing requirements with recorded shift data...";
                            staffingCoverageStatus.className="message";
                            staffingCoverageBody.replaceChildren();
                            try{
                                const {data,error}=await supabaseClient.rpc("get_department_staffing_coverage",{
                                    p_clinic_id:clinic.id,p_department_id:department.id,p_shift_date:staffingCoverageDate.value||null
                                });
                                if(error)throw error;
                                const requirements=Array.isArray(data?.requirements)?data.requirements:[];
                                if(!requirements.length){
                                    const row=staffingCoverageBody.insertRow();const cell=row.insertCell();cell.colSpan=7;
                                    cell.textContent="No hospital-approved staffing requirements apply to this department on the selected date. Configure and independently approve requirements in the administrator governance area.";
                                }else requirements.forEach(item=>{
                                    const row=staffingCoverageBody.insertRow();
                                    const labels={no_roster_entries:"No roster entries",roster_below_requirement:"Roster below approved minimum",scheduled_but_not_yet_covered:"Scheduled, but clock-ins below minimum",recorded_minimum_met:"Recorded minimum met"};
                                    [item.role_name,item.shift_type,item.minimum_headcount,item.scheduled_count,item.clocked_in_count,labels[item.roster_state]||item.roster_state,item.policy_reference||"Not recorded"].forEach(value=>{const cell=row.insertCell();cell.textContent=String(value??"—");});
                                });
                                staffingCoverageStatus.textContent=requirements.length+" approved role/shift requirement(s) checked for "+(data?.shift_date||staffingCoverageDate.value)+". Scheduled headcount and clocked-in headcount are shown separately; only recorded evidence is compared.";
                                staffingCoverageStatus.className="message success";
                            }catch(error){console.error("Department staffing coverage failed:",error);staffingCoverageStatus.textContent=friendlyError(error);staffingCoverageStatus.className="message error";}
                            finally{staffingCoverageRefresh.disabled=false;}
                        }
                        staffingCoverageRefresh.addEventListener("click",()=>void refreshDepartmentStaffingCoverage());
                        staffingCoverageDate.addEventListener("change",()=>void refreshDepartmentStaffingCoverage());
                        void refreshDepartmentStaffingCoverage();

                        // Stage 3F: shift coverage and operational risk monitoring.
                        // Uses the same server-authorised department roster; never invents staffing ratios.
                        const shiftRiskHeading = document.createElement("h4");
                        shiftRiskHeading.textContent = "Shift coverage & operational risks";
                        const shiftRiskPanel = document.createElement("section");
                        shiftRiskPanel.className = "panel";
                        shiftRiskPanel.style.margin = "18px 0";
                        const shiftRiskIntro = document.createElement("p");
                        shiftRiskIntro.className = "muted";
                        shiftRiskIntro.textContent = "Flags scheduled shifts with no recorded clock-in after a 15-minute grace period, shifts that elapsed without clock-in, missing clock-out records and unresolved tasks at shift end. This is an operational exception list, not a clinical staffing-ratio assessment.";
                        const shiftRiskRefresh = document.createElement("button");
                        shiftRiskRefresh.type = "button";
                        shiftRiskRefresh.className = "secondary-button";
                        shiftRiskRefresh.textContent = "Refresh shift risk monitor";
                        const shiftRiskStatus = document.createElement("p");
                        shiftRiskStatus.className = "message";
                        shiftRiskStatus.setAttribute("role", "status");
                        shiftRiskStatus.setAttribute("aria-live", "polite");
                        const shiftRiskStats = document.createElement("div");
                        shiftRiskStats.className = "department-workspace-stats";
                        const shiftRiskList = document.createElement("div");
                        shiftRiskPanel.append(shiftRiskIntro, shiftRiskRefresh, shiftRiskStatus, shiftRiskStats, shiftRiskList);
                        detail.append(shiftRiskHeading, shiftRiskPanel);

                        async function refreshDepartmentShiftCoverageRisks() {
                            shiftRiskRefresh.disabled = true;
                            shiftRiskStatus.textContent = "Checking authorised shift records and outstanding work...";
                            shiftRiskStatus.className = "message";
                            shiftRiskStats.replaceChildren();
                            shiftRiskList.replaceChildren();
                            try {
                                const { data: riskData, error: riskError } = await supabaseClient.rpc(
                                    "get_department_shift_coverage_risks",
                                    { p_clinic_id: clinic.id, p_department_id: department.id, p_days: 2 }
                                );
                                if (riskError) throw riskError;
                                const risks = Array.isArray(riskData?.risks) ? riskData.risks : [];
                                const counts = [
                                    ["Late clock-in / no clock-in", risks.filter(r => ["late_clock_in","shift_elapsed_without_clock_in"].includes(r.risk_code)).length],
                                    ["Open tasks after shift end", risks.filter(r => r.risk_code === "open_tasks_after_shift_end").length],
                                    ["Missing clock-out", risks.filter(r => r.risk_code === "shift_ended_without_clock_out").length],
                                    ["Shift ending soon with open tasks", risks.filter(r => r.risk_code === "upcoming_shift_end_with_open_tasks").length]
                                ];
                                counts.forEach(([label,value]) => {
                                    const card = document.createElement("div");
                                    card.className = "stat-card";
                                    const title = document.createElement("p");
                                    title.textContent = label;
                                    const number = document.createElement("h3");
                                    number.textContent = String(value);
                                    card.append(title,number);
                                    shiftRiskStats.appendChild(card);
                                });
                                if (!risks.length) {
                                    const empty = document.createElement("p");
                                    empty.className = "message success";
                                    empty.textContent = "No shift coverage exceptions were identified in the current authorised roster for the next two days.";
                                    shiftRiskList.appendChild(empty);
                                } else {
                                    risks.forEach(risk => {
                                        const item = document.createElement("article");
                                        item.className = "panel";
                                        item.style.margin = "10px 0";
                                        const title = document.createElement("h5");
                                        const labels = {
                                            late_clock_in: "Late clock-in — grace period exceeded",
                                            shift_elapsed_without_clock_in: "Shift elapsed without recorded clock-in",
                                            open_tasks_after_shift_end: "Unresolved tasks remain after shift end",
                                            shift_ended_without_clock_out: "Shift ended without recorded clock-out",
                                            upcoming_shift_end_with_open_tasks: "Shift ending within 60 minutes with open tasks"
                                        };
                                        title.textContent = labels[risk.risk_code] || "Shift exception";
                                        const details = document.createElement("p");
                                        details.className = "muted";
                                        const when = value => value ? new Date(value).toLocaleString() : "—";
                                        details.textContent = (risk.full_name || "Unassigned staff") +
                                            (risk.staff_id ? " · " + risk.staff_id : "") +
                                            " · " + String(risk.shift_type || "Shift").replace(/_/g," ") +
                                            " · " + when(risk.starts_at) + " – " + when(risk.ends_at) +
                                            " · Attendance: " + String(risk.attendance_status || "not recorded").replace(/_/g," ");
                                        item.append(title,details);
                                        const tasks = Array.isArray(risk.open_tasks) ? risk.open_tasks : [];
                                        if (tasks.length) {
                                            const taskList = document.createElement("ul");
                                            tasks.forEach(task => {
                                                const li = document.createElement("li");
                                                li.textContent = (task.title || "Untitled task") + " · " +
                                                    String(task.status || "open").replace(/_/g," ") +
                                                    (task.priority ? " · " + task.priority : "");
                                                taskList.appendChild(li);
                                            });
                                            item.appendChild(taskList);
                                        }
                                        shiftRiskList.appendChild(item);
                                    });
                                }
                                shiftRiskStatus.textContent = risks.length + " shift exception(s) found. A 15-minute late clock-in threshold is used for this monitor; it does not change attendance status or mark staff absent. Results cover today and the next two calendar days.";
                                shiftRiskStatus.className = "message success";
                            } catch (riskLoadError) {
                                console.error("Department shift risk monitor failed:", riskLoadError);
                                shiftRiskStatus.textContent = friendlyError(riskLoadError);
                                shiftRiskStatus.className = "message error";
                            } finally {
                                shiftRiskRefresh.disabled = false;
                            }
                        }
                        shiftRiskRefresh.addEventListener("click", () => void refreshDepartmentShiftCoverageRisks());
                        void refreshDepartmentShiftCoverageRisks();

                        // Stage 3B: department-scoped task assignment. Reuses the existing
                        // authorised options RPC and server-side task creation RPC.
                        const assignmentHeading = document.createElement("h4");
                        assignmentHeading.textContent = "Assign work within this department";
                        const assignmentPanel = document.createElement("section");
                        assignmentPanel.className = "panel";
                        assignmentPanel.style.margin = "18px 0";
                        const assignmentForm = document.createElement("form");
                        assignmentForm.className = "form-grid";
                        const assignmentMessage = document.createElement("p");
                        assignmentMessage.className = "message";
                        assignmentMessage.setAttribute("role", "status");
                        assignmentMessage.textContent = "Loading authorised department staff and approved duties...";
                        const assigneeLabel = document.createElement("label");
                        assigneeLabel.textContent = "Assigned staff member";
                        const assigneeSelect = document.createElement("select");
                        assigneeSelect.required = true;
                        assigneeSelect.add(new Option("Loading authorised team...", ""));
                        assigneeLabel.appendChild(assigneeSelect);
                        const dutyLabel = document.createElement("label");
                        dutyLabel.textContent = "Approved job duty (optional)";
                        const dutySelect = document.createElement("select");
                        dutySelect.add(new Option("No approved duty linked", ""));
                        dutyLabel.appendChild(dutySelect);
                        const titleLabel = document.createElement("label");
                        titleLabel.textContent = "Task title";
                        const titleInput = document.createElement("input");
                        titleInput.type = "text";
                        titleInput.required = true;
                        titleInput.minLength = 3;
                        titleInput.maxLength = 200;
                        titleInput.placeholder = "Describe the work to be completed";
                        titleLabel.appendChild(titleInput);
                        const descriptionLabel = document.createElement("label");
                        descriptionLabel.textContent = "Task instructions";
                        const descriptionInput = document.createElement("textarea");
                        descriptionInput.rows = 3;
                        descriptionInput.maxLength = 3000;
                        descriptionInput.placeholder = "Provide clear instructions and expected evidence";
                        descriptionLabel.appendChild(descriptionInput);
                        const priorityLabel = document.createElement("label");
                        priorityLabel.textContent = "Priority";
                        const prioritySelect = document.createElement("select");
                        [["low","Low"],["normal","Normal"],["high","High"],["urgent","Urgent"]].forEach(([value,label]) => prioritySelect.add(new Option(label,value)));
                        priorityLabel.appendChild(prioritySelect);
                        const dueLabel = document.createElement("label");
                        dueLabel.textContent = "Deadline (optional)";
                        const dueInput = document.createElement("input");
                        dueInput.type = "datetime-local";
                        dueLabel.appendChild(dueInput);
                        const assignButton = document.createElement("button");
                        assignButton.type = "submit";
                        assignButton.className = "primary-button";
                        assignButton.textContent = "Assign department task";
                        assignmentForm.append(assigneeLabel, dutyLabel, titleLabel, descriptionLabel, priorityLabel, dueLabel, assignButton);
                        assignmentPanel.append(assignmentMessage, assignmentForm);
                        detail.append(assignmentHeading, assignmentPanel);

                        let departmentAssignments = [];
                        let departmentDuties = [];
                        try {
                            const { data: options, error: optionsError } = await supabaseClient.rpc(
                                "get_task_assignment_options", { p_clinic_id: clinic.id }
                            );
                            if (optionsError) throw optionsError;
                            departmentAssignments = (Array.isArray(options?.staff_assignments) ? options.staff_assignments : [])
                                .filter(item => item.department_id === department.id);
                            departmentDuties = (Array.isArray(options?.approved_duties) ? options.approved_duties : [])
                                .filter(item => item.department_id === department.id);
                            assigneeSelect.replaceChildren(new Option("Select department staff member", ""));
                            departmentAssignments.forEach(item => {
                                assigneeSelect.add(new Option(
                                    item.name + " (" + (item.staff_id || "No staff ID") + ")" +
                                    (item.unit_name ? " — " + item.unit_name : ""),
                                    item.assignment_id
                                ));
                            });
                            dutySelect.replaceChildren(new Option("No approved duty linked", ""));
                            departmentDuties.forEach(item => dutySelect.add(new Option(item.title, item.id)));
                            if (!departmentAssignments.length) {
                                assignmentMessage.textContent = "No active staff assignments are currently available in this department within your authorised scope.";
                                assignmentMessage.className = "message";
                                assignButton.disabled = true;
                            } else {
                                assignmentMessage.textContent = departmentAssignments.length + " authorised staff assignment(s) and " +
                                    departmentDuties.length + " approved duty option(s) loaded for " + department.department_name +
                                    ". The server will validate department and manager scope again when you assign.";
                                assignmentMessage.className = "message success";
                            }
                        } catch (optionsError) {
                            console.error("Department-specific task options failed:", optionsError);
                            assignmentMessage.textContent = friendlyError(optionsError);
                            assignmentMessage.className = "message error";
                            assignButton.disabled = true;
                        }

                        assignmentForm.addEventListener("submit", async event => {
                            event.preventDefault();
                            if (assignButton.disabled) return;
                            const selectedAssignment = departmentAssignments.find(item => item.assignment_id === assigneeSelect.value);
                            const selectedDuty = departmentDuties.find(item => item.id === dutySelect.value);
                            if (!selectedAssignment || selectedAssignment.department_id !== department.id) {
                                assignmentMessage.textContent = "Choose an active staff assignment belonging to this department.";
                                assignmentMessage.className = "message error";
                                return;
                            }
                            if (dutySelect.value && (!selectedDuty || selectedDuty.department_id !== department.id)) {
                                assignmentMessage.textContent = "The selected approved duty does not belong to this department.";
                                assignmentMessage.className = "message error";
                                return;
                            }
                            assignButton.disabled = true;
                            assignmentMessage.textContent = "Creating task and recording its assignment event...";
                            assignmentMessage.className = "message";
                            const dueValue = dueInput.value;
                            try {
                                const { data: created, error: createError } = await supabaseClient.rpc(
                                    "create_supervised_staff_task",
                                    {
                                        p_clinic_id: clinic.id,
                                        p_assignment_id: selectedAssignment.assignment_id,
                                        p_title: titleInput.value.trim(),
                                        p_description: descriptionInput.value.trim() || null,
                                        p_priority: prioritySelect.value,
                                        p_due_at: dueValue ? new Date(dueValue).toISOString() : null,
                                        p_duty_id: dutySelect.value || null
                                    }
                                );
                                if (createError) throw createError;
                                assignmentForm.reset();
                                prioritySelect.value = "normal";
                                assignmentMessage.textContent = "Task assigned successfully. The system recorded the task ID " +
                                    (created?.task_id || "and its assignment event") + ". Refreshing the department task board...";
                                assignmentMessage.className = "message success";
                                await loadDepartmentWorkspaceTaskBoard(clinic, department.id, taskBoard);
                                if (typeof loadDepartmentPerformanceDashboard === "function") {
                                    void loadDepartmentPerformanceDashboard(clinic);
                                }
                                if (typeof loadHospitalDepartmentCommand === "function") {
                                    void loadHospitalDepartmentCommand(clinic);
                                }
                            } catch (createError) {
                                console.error("Department task creation failed:", createError);
                                assignmentMessage.textContent = friendlyError(createError);
                                assignmentMessage.className = "message error";
                            } finally {
                                assignButton.disabled = departmentAssignments.length === 0;
                            }
                        });

                        const roleHeading = document.createElement("h4");
                        roleHeading.textContent = "Professional roles and approved job duties";
                        detail.appendChild(roleHeading);
                        const roles = Array.isArray(workspace.professional_roles) ? workspace.professional_roles : [];
                        if (!roles.length) {
                            const emptyRoles = document.createElement("p");
                            emptyRoles.className = "muted";
                            emptyRoles.textContent = "No active professional roles are linked to this department yet. An authorised administrator can configure them in Department Role Management.";
                            detail.appendChild(emptyRoles);
                        }
                        roles.forEach(role => {
                            const roleCard = document.createElement("article");
                            roleCard.className = "department-workspace-role";
                            const roleTitle = document.createElement("h5");
                            roleTitle.textContent = role.role_name || "Professional role";
                            roleCard.appendChild(roleTitle);
                            const roleMeta = document.createElement("p");
                            roleMeta.className = "muted";
                            roleMeta.textContent = (role.role_code || "No role code") +
                                (role.clinical_role ? " · Clinical role" : " · Non-clinical role") +
                                (role.registration_required ? " · Registration required" + (role.registration_body ? " (" + role.registration_body + ")" : "") : "");
                            roleCard.appendChild(roleMeta);
                            const profiles = Array.isArray(role.job_profiles) ? role.job_profiles : [];
                            if (!profiles.length) {
                                const noProfile = document.createElement("p");
                                noProfile.textContent = "No active job profile has been configured for this role.";
                                roleCard.appendChild(noProfile);
                            }
                            profiles.forEach(profile => {
                                const profileTitle = document.createElement("h6");
                                profileTitle.textContent = profile.job_title || "Job profile";
                                roleCard.appendChild(profileTitle);

                                // Stage 2: make job-profile governance state explicit.
                                const profileStatus = document.createElement("p");
                                profileStatus.className = "stat-note";
                                const isApprovedProfile = profile.validation_status === "hospital_approved";
                                profileStatus.textContent = isApprovedProfile
                                    ? "Governance status: Hospital approved"
                                    : "Governance status: " + String(profile.validation_status || "draft").replace(/_/g, " ") + " — not an authorised duty instruction";
                                profileStatus.setAttribute("role", "status");
                                roleCard.appendChild(profileStatus);

                                if (profile.job_purpose || profile.job_summary || profile.scope_notes) {
                                    const purpose = document.createElement("p");
                                    purpose.textContent = [profile.job_purpose, profile.job_summary, profile.scope_notes].filter(Boolean).join(" ");
                                    roleCard.appendChild(purpose);
                                }
                                const duties = Array.isArray(profile.duties) ? profile.duties : [];
                                const dutyList = document.createElement("ul");
                                if (!duties.length) {
                                    const noDuties = document.createElement("li");
                                    noDuties.textContent = "No hospital-approved duties are published for this job profile.";
                                    dutyList.appendChild(noDuties);
                                } else {
                                    duties.forEach(duty => {
                                        const item = document.createElement("li");
                                        item.textContent = (duty.duty_title || "Duty") +
                                            (duty.expected_frequency ? " — " + duty.expected_frequency : "") +
                                            (duty.evidence_required ? " · Evidence required" : "") +
                                            (duty.supervisor_review_required ? " · Supervisor review" : "") +
                                            (duty.separate_approval_required ? " · Separate approval" : "");
                                        dutyList.appendChild(item);
                                    });
                                }
                                roleCard.appendChild(dutyList);
                            });
                            detail.appendChild(roleCard);
                        });

                        const scopeNote = document.createElement("p");
                        scopeNote.className = "stat-note";
                        scopeNote.textContent = "Access scope: " +
                            (workspace.access_scope === "hospital_wide_admin" ? "hospital administrator" : "appointed department manager") +
                            ". Only hospital-approved duties are shown. Clinical and regulated duties remain subject to verified credentials, hospital policy and statutory scope of practice.";
                        detail.appendChild(scopeNote);
                    } catch (workspaceError) {
                        console.error("Department workspace foundation failed:", workspaceError);
                        const errorMessage = document.createElement("p");
                        errorMessage.className = "message error";
                        errorMessage.textContent = friendlyError(workspaceError);
                        detail.appendChild(errorMessage);
                    }
                    const close = document.createElement("button");
                    close.type = "button";
                    close.className = "secondary-button";
                    close.textContent = "Close workspace";
                    close.addEventListener("click", () => { detail.hidden = true; });
                    detail.appendChild(close);
                });
                card.append(title, group, summary, open);
                list.appendChild(card);
            });
        };

        if (search && search.dataset.bound !== "true") {
            search.dataset.bound = "true";
            search.addEventListener("input", render);
        }
        render();
        message.textContent = (departments || []).length + " active departments loaded from this hospital's records. Department access and task figures remain limited by database permissions.";
        message.className = "message success";
        void loadDepartmentRoleGovernance(clinic);
    } catch (error) {
        console.error("Department workspace directory failed:", error);
        message.textContent = friendlyError(error);
        message.className = "message error";
    }
}
const refreshDepartmentWorkspaceDirectoryButton = document.getElementById("refreshDepartmentWorkspaceDirectory");
if (refreshDepartmentWorkspaceDirectoryButton) {
    refreshDepartmentWorkspaceDirectoryButton.addEventListener("click", () => {
        if (currentClinic) void loadDepartmentWorkspaceDirectory(currentClinic);
    });
}

// HEALTHOS MEDICAL SYSTEMS: DEPARTMENT ROLE & DUTY GOVERNANCE
async function loadDepartmentRoleGovernance(clinic) {
    const message = document.getElementById("departmentRoleGovernanceMessage");
    const register = document.getElementById("departmentRoleGovernanceRegister");
    if (!message || !register || !clinic || !currentUser || !managementVerified || clinic.id !== currentClinic?.id) return;
    message.textContent = "Loading the hospital role and duty register...";
    message.className = "message";
    try {
        const { data, error } = await supabaseClient.rpc("get_department_role_catalog", { p_clinic_id: clinic.id });
        if (error) throw error;
        const departments = Array.isArray(data?.departments) ? data.departments : [];
        const roles = Array.isArray(data?.roles) ? data.roles : [];
        const departmentSelect = document.getElementById("governanceRoleDepartment");
        const roleSelect = document.getElementById("governanceProfileRole");
        const profileSelect = document.getElementById("governanceDutyProfile");
        if (departmentSelect) {
            const selected = departmentSelect.value;
            departmentSelect.replaceChildren(new Option("Select department", ""));
            departments.forEach(item => departmentSelect.add(new Option(item.name, item.id)));
            if (departments.some(item => item.id === selected)) departmentSelect.value = selected;
        }
        if (roleSelect) {
            const selected = roleSelect.value;
            roleSelect.replaceChildren(new Option("Select department role", ""));
            roles.forEach(item => roleSelect.add(new Option(item.department_name + " — " + item.role_name, item.department_role_id)));
            if (roles.some(item => item.department_role_id === selected)) roleSelect.value = selected;
        }
        const allProfiles = [];
        roles.forEach(role => (role.job_profiles || []).forEach(profile => {
            allProfiles.push({ ...profile, department_name: role.department_name, role_name: role.role_name });
        }));
        if (profileSelect) {
            const selected = profileSelect.value;
            profileSelect.replaceChildren(new Option("Select job profile", ""));
            allProfiles.forEach(profile => profileSelect.add(new Option(profile.department_name + " — " + profile.role_name + " — " + profile.job_title, profile.id)));
            if (allProfiles.some(profile => profile.id === selected)) profileSelect.value = selected;
        }
        const profiles = allProfiles;
        const duties = profiles.flatMap(profile => profile.duties || []);
        const approvedDuties = duties.filter(duty => duty.validation_status === "hospital_approved").length;
        const awaiting = profiles.filter(profile => profile.validation_status === "under_review").length +
            duties.filter(duty => duty.validation_status === "under_review").length;
        const setCount = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = String(value); };
        setCount("roleGovernanceRoleCount", roles.length);
        setCount("roleGovernanceProfileCount", profiles.length);
        setCount("roleGovernanceDutyCount", approvedDuties);
        setCount("roleGovernanceReviewCount", awaiting);

        register.replaceChildren();
        if (!roles.length) {
            const empty = document.createElement("p");
            empty.className = "muted";
            empty.textContent = "No professional roles have been linked yet. Use the role registration form above to begin.";
            register.appendChild(empty);
        }
        const statusLabel = value => String(value || "draft").replace(/_/g, " ");
        const makeGovernanceAction = (label, action, id) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = action.startsWith("approve") ? "primary-button" : "secondary-button";
            button.textContent = label;
            button.addEventListener("click", async () => {
                button.disabled = true;
                const prior = message.textContent;
                message.textContent = label + "...";
                message.className = "message";
                try {
                    const result = await supabaseClient.rpc("manage_department_role_catalog", {
                        p_clinic_id: clinic.id, p_action: action, p_payload: { id }
                    });
                    if (result.error) throw result.error;
                    message.textContent = label + " completed and recorded in the governance audit trail.";
                    message.className = "message success";
                    await loadDepartmentRoleGovernance(clinic);
                } catch (error) {
                    message.textContent = friendlyError(error);
                    message.className = "message error";
                    button.disabled = false;
                }
            });
            return button;
        };
        roles.forEach(role => {
            const card = document.createElement("article");
            card.className = "department-governance-card";
            const heading = document.createElement("h4");
            heading.textContent = role.department_name + " — " + role.role_name;
            const meta = document.createElement("p");
            meta.className = "muted";
            meta.textContent = role.role_code + (role.clinical_role ? " · Clinical" : " · Non-clinical") +
                (role.registration_required ? " · Registration required" + (role.registration_body ? " (" + role.registration_body + ")" : "") : "");
            card.append(heading, meta);
            (role.job_profiles || []).forEach(profile => {
                const profileBox = document.createElement("div");
                profileBox.className = "department-governance-item";
                const title = document.createElement("h5");
                title.textContent = profile.job_title + " — " + statusLabel(profile.validation_status);
                profileBox.appendChild(title);
                if (profile.qualification_requirements) {
                    const qualifications = document.createElement("p");
                    qualifications.textContent = "Qualifications: " + profile.qualification_requirements;
                    profileBox.appendChild(qualifications);
                }
                if (profile.scope_notes) {
                    const scope = document.createElement("p");
                    scope.textContent = "Scope: " + profile.scope_notes;
                    profileBox.appendChild(scope);
                }
                const profileActions = document.createElement("div");
                profileActions.className = "button-row";
                if (profile.validation_status === "draft") profileActions.appendChild(makeGovernanceAction("Submit profile for review", "submit_profile", profile.id));
                if (profile.validation_status === "under_review") profileActions.appendChild(makeGovernanceAction("Approve profile", "approve_profile", profile.id));
                if (profileActions.childElementCount) profileBox.appendChild(profileActions);
                (profile.duties || []).forEach(duty => {
                    const dutyLine = document.createElement("div");
                    dutyLine.className = "department-governance-duty";
                    const dutyText = document.createElement("p");
                    dutyText.textContent = duty.duty_title + " — " + statusLabel(duty.validation_status) +
                        (duty.evidence_required ? " · Evidence" : "") +
                        (duty.supervisor_review_required ? " · Supervisor review" : "") +
                        (duty.separate_approval_required ? " · Separate approval" : "") +
                        (duty.clinical_or_regulated_scope ? " · Regulated scope" : "");
                    dutyLine.appendChild(dutyText);
                    const dutyActions = document.createElement("div");
                    dutyActions.className = "button-row";
                    if (duty.validation_status === "draft") dutyActions.appendChild(makeGovernanceAction("Submit duty", "submit_duty", duty.id));
                    if (duty.validation_status === "under_review") dutyActions.appendChild(makeGovernanceAction("Approve duty", "approve_duty", duty.id));
                    if (dutyActions.childElementCount) dutyLine.appendChild(dutyActions);
                    profileBox.appendChild(dutyLine);
                });
                card.appendChild(profileBox);
            });
            register.appendChild(card);
        });
        message.textContent = roles.length + " linked role(s), " + profiles.length + " job profile(s), " +
            approvedDuties + " approved duty item(s). Draft and under-review content remains excluded from authorised staff duties.";
        message.className = "message success";
        await loadDepartmentStaffingRequirementCatalog(clinic);
    } catch (error) {
        console.error("Department role governance register failed:", error);
        message.textContent = friendlyError(error);
        message.className = "message error";
        register.replaceChildren();
    }
}

async function submitDepartmentGovernanceAction(form, action, payload, successText) {
    if (!form || !currentClinic) return;
    const message = document.getElementById("departmentRoleGovernanceMessage");
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    if (message) { message.textContent = "Saving governance record..."; message.className = "message"; }
    try {
        const { error } = await supabaseClient.rpc("manage_department_role_catalog", {
            p_clinic_id: currentClinic.id, p_action: action, p_payload: payload
        });
        if (error) throw error;
        form.reset();
        if (message) { message.textContent = successText + " It is saved as a draft and is not an authorised instruction."; message.className = "message success"; }
        await loadDepartmentRoleGovernance(currentClinic);
    } catch (error) {
        if (message) { message.textContent = friendlyError(error); message.className = "message error"; }
    } finally {
        if (submit) submit.disabled = false;
    }
}

const departmentRoleCreateForm = document.getElementById("departmentRoleCreateForm");
if (departmentRoleCreateForm) departmentRoleCreateForm.addEventListener("submit", event => {
    event.preventDefault();
    const registrationRequired = document.getElementById("governanceRoleRegistration").checked;
    const registrationBody = document.getElementById("governanceRoleRegistrationBody").value.trim();
    if (registrationRequired && !registrationBody) {
        document.getElementById("departmentRoleGovernanceMessage").textContent = "Enter the professional registration body when registration is required.";
        document.getElementById("departmentRoleGovernanceMessage").className = "message error";
        return;
    }
    void submitDepartmentGovernanceAction(departmentRoleCreateForm, "create_role", {
        department_id: document.getElementById("governanceRoleDepartment").value,
        role_code: document.getElementById("governanceRoleCode").value.trim(),
        role_name: document.getElementById("governanceRoleName").value.trim(),
        role_group: document.getElementById("governanceRoleGroup").value.trim(),
        description: document.getElementById("governanceRoleDescription").value.trim(),
        clinical_role: document.getElementById("governanceRoleClinical").checked,
        registration_required: registrationRequired,
        registration_body: registrationBody
    }, "Professional role created and linked");
});
const departmentProfileCreateForm = document.getElementById("departmentProfileCreateForm");
if (departmentProfileCreateForm) departmentProfileCreateForm.addEventListener("submit", event => {
    event.preventDefault();
    void submitDepartmentGovernanceAction(departmentProfileCreateForm, "create_profile", {
        department_role_id: document.getElementById("governanceProfileRole").value,
        job_title: document.getElementById("governanceProfileTitle").value.trim(),
        job_purpose: document.getElementById("governanceProfilePurpose").value.trim(),
        job_summary: document.getElementById("governanceProfileSummary").value.trim(),
        qualification_requirements: document.getElementById("governanceProfileQualifications").value.trim(),
        scope_notes: document.getElementById("governanceProfileScope").value.trim()
    }, "Job profile created");
});
const departmentDutyCreateForm = document.getElementById("departmentDutyCreateForm");
if (departmentDutyCreateForm) departmentDutyCreateForm.addEventListener("submit", event => {
    event.preventDefault();
    void submitDepartmentGovernanceAction(departmentDutyCreateForm, "create_duty", {
        job_profile_id: document.getElementById("governanceDutyProfile").value,
        duty_code: document.getElementById("governanceDutyCode").value.trim(),
        duty_title: document.getElementById("governanceDutyTitle").value.trim(),
        duty_description: document.getElementById("governanceDutyDescription").value.trim(),
        duty_category: document.getElementById("governanceDutyCategory").value,
        expected_frequency: document.getElementById("governanceDutyFrequency").value.trim(),
        evidence_required: document.getElementById("governanceDutyEvidence").checked,
        supervisor_review_required: document.getElementById("governanceDutyReview").checked,
        separate_approval_required: document.getElementById("governanceDutySeparateApproval").checked,
        clinical_or_regulated_scope: document.getElementById("governanceDutyRegulated").checked
    }, "Job duty created");
});
const refreshDepartmentRoleGovernanceButton = document.getElementById("refreshDepartmentRoleGovernance");
if (refreshDepartmentRoleGovernanceButton) refreshDepartmentRoleGovernanceButton.addEventListener("click", () => {
    if (currentClinic) void loadDepartmentRoleGovernance(currentClinic);
});
// STAGE 3H: HOSPITAL STAFFING REQUIREMENT GOVERNANCE
async function loadDepartmentStaffingRequirementCatalog(clinic) {
 const message=document.getElementById("staffingRequirementMessage");
 const register=document.getElementById("staffingRequirementRegister");
 if(!message||!register||!clinic||!currentUser||!managementVerified||clinic.id!==currentClinic?.id)return;
 message.textContent="Loading hospital-approved staffing requirement register...";
 message.className="message";
 try {
  const {data,error}=await supabaseClient.rpc("get_department_staffing_requirement_catalog",{p_clinic_id:clinic.id});
  if(error)throw error;
  const departments=Array.isArray(data?.departments)?data.departments:[];
  const roles=Array.isArray(data?.roles)?data.roles:[];
  const requirements=Array.isArray(data?.requirements)?data.requirements:[];
  const deptSelect=document.getElementById("staffingRequirementDepartment");
  const roleSelect=document.getElementById("staffingRequirementRole");
  const selectedDept=deptSelect?.value||"";
  if(deptSelect){deptSelect.replaceChildren(new Option("Select department",""));departments.forEach(d=>deptSelect.add(new Option(d.name,d.id)));if(departments.some(d=>d.id===selectedDept))deptSelect.value=selectedDept;}
  const fillRoles=()=>{if(!roleSelect)return;const dep=deptSelect?.value;const old=roleSelect.value;roleSelect.replaceChildren(new Option("Select professional role",""));roles.filter(r=>r.department_id===dep).forEach(r=>roleSelect.add(new Option(r.role_name,r.id)));if([...roleSelect.options].some(o=>o.value===old))roleSelect.value=old;};
  fillRoles();
  if(deptSelect&&!deptSelect.dataset.staffingBound){deptSelect.addEventListener("change",fillRoles);deptSelect.dataset.staffingBound="1";}
  register.replaceChildren();
  if(!requirements.length){const p=document.createElement("p");p.className="muted";p.textContent="No staffing requirements have been configured yet.";register.append(p);}
  requirements.forEach(item=>{
   const card=document.createElement("article");card.className="department-governance-card";
   const title=document.createElement("h4");title.textContent=item.department_name+" — "+item.role_name+" — "+item.shift_type;
   const meta=document.createElement("p");meta.className="muted";meta.textContent="Minimum: "+item.minimum_headcount+" · Effective "+item.effective_from+(item.effective_to?" to "+item.effective_to:" onward")+" · "+String(item.validation_status).replace(/_/g," ");
   card.append(title,meta);
   if(item.policy_reference){const policy=document.createElement("p");policy.textContent="Policy: "+item.policy_reference;card.append(policy);}
   if(item.requirement_notes){const notes=document.createElement("p");notes.textContent=item.requirement_notes;card.append(notes);}
   const actions=document.createElement("div");actions.className="button-row";
   const actionButton=(label,action,primary)=>{const b=document.createElement("button");b.type="button";b.className=primary?"primary-button":"secondary-button";b.textContent=label;b.addEventListener("click",async()=>{b.disabled=true;try{const {error}=await supabaseClient.rpc("manage_department_staffing_requirement",{p_clinic_id:clinic.id,p_action:action,p_payload:{requirement_id:item.id}});if(error)throw error;message.textContent=label+" recorded in the staffing governance audit.";message.className="message success";await loadDepartmentStaffingRequirementCatalog(clinic);}catch(e){message.textContent=friendlyError(e);message.className="message error";b.disabled=false;}});return b;};
   if(item.validation_status==="draft")actions.append(actionButton("Submit for independent review","submit",false));
   if(item.validation_status==="under_review")actions.append(actionButton("Approve requirement","approve",true));
   if(actions.childElementCount)card.append(actions);
   register.append(card);
  });
  message.textContent=requirements.length+" staffing requirement record(s) loaded. Only hospital-approved requirements are used in department coverage comparisons.";
  message.className="message success";
 }catch(error){console.error("Staffing requirement register failed:",error);message.textContent=friendlyError(error);message.className="message error";register.replaceChildren();}
}
const staffingRequirementForm=document.getElementById("staffingRequirementCreateForm");
if(staffingRequirementForm)staffingRequirementForm.addEventListener("submit",async event=>{
 event.preventDefault();
 const message=document.getElementById("staffingRequirementMessage");
 const button=staffingRequirementForm.querySelector('button[type="submit"]');button.disabled=true;
 const from=document.getElementById("staffingRequirementFrom").value;
 const to=document.getElementById("staffingRequirementTo").value;
 if(to&&to<from){message.textContent="Effective-to date cannot be earlier than effective-from date.";message.className="message error";button.disabled=false;return;}
 try{
  const {error}=await supabaseClient.rpc("manage_department_staffing_requirement",{p_clinic_id:currentClinic.id,p_action:"create",p_payload:{
   department_id:document.getElementById("staffingRequirementDepartment").value,
   department_role_id:document.getElementById("staffingRequirementRole").value,
   shift_type:document.getElementById("staffingRequirementShift").value.trim(),
   minimum_headcount:Number(document.getElementById("staffingRequirementHeadcount").value),
   effective_from:from,effective_to:to||null,
   policy_reference:document.getElementById("staffingRequirementPolicy").value.trim(),
   requirement_notes:document.getElementById("staffingRequirementNotes").value.trim()
  }});
  if(error)throw error;
  staffingRequirementForm.reset();
  message.textContent="Staffing requirement saved as a draft. It will not affect coverage until independently approved.";
  message.className="message success";
  await loadDepartmentStaffingRequirementCatalog(currentClinic);
 }catch(error){message.textContent=friendlyError(error);message.className="message error";}
 finally{button.disabled=false;}
});
const refreshStaffingRequirementButton=document.getElementById("refreshDepartmentRoleGovernance");
if(refreshStaffingRequirementButton&&!refreshStaffingRequirementButton.dataset.staffingBound){refreshStaffingRequirementButton.addEventListener("click",()=>{if(currentClinic)void loadDepartmentStaffingRequirementCatalog(currentClinic);});refreshStaffingRequirementButton.dataset.staffingBound="1";}
// END STAGE 3H STAFFING REQUIREMENT GOVERNANCE

// END DEPARTMENT ROLE & DUTY GOVERNANCE

// END DEPARTMENT WORKSPACE DIRECTORY

// HEALTHOS AI: DEPARTMENT TASK ESCALATION REPORT
async function loadDepartmentTaskEscalations(clinic) {
    const body = document.getElementById("departmentTaskEscalationsBody");
    const message = document.getElementById("departmentTaskEscalationsMessage");
    if (!body || !message || !clinic || !currentUser || !managementVerified) return;
    body.replaceChildren();
    message.textContent = "Loading overdue, blocked and review-pending tasks...";
    message.className = "message";
    const { data, error } = await supabaseClient.rpc("get_department_task_escalations", {
        p_clinic_id: clinic.id
    });
    if (error) {
        message.textContent = friendlyError(error);
        message.className = "message error";
        return;
    }
    const items = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = "No overdue, blocked or review-pending tasks in your authorised scope.";
        row.appendChild(cell);
        body.appendChild(row);
    } else {
        items.forEach(item => {
            const row = document.createElement("tr");
            const issue = item.escalation_type === "overdue" ? "OVERDUE" :
                item.escalation_type === "blocked" ? "BLOCKED" : "AWAITING REVIEW";
            const due = item.due_at ? new Date(item.due_at).toLocaleString() : "No deadline";
            const values = [
                issue + (item.hours_overdue > 0 ? " • " + item.hours_overdue + "h late" : ""),
                item.task_title || "Untitled task",
                (item.department_name || "—") + (item.unit_name ? " / " + item.unit_name : ""),
                (item.assignee_name || "Unassigned") + (item.staff_id ? " (" + item.staff_id + ")" : ""),
                String(item.priority || "normal").toUpperCase(),
                due,
                String(item.status || "—").replaceAll("_", " ")
            ];
            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = String(value);
                row.appendChild(cell);
            });
            body.appendChild(row);
        });
    }
    message.textContent = items.length + " escalation(s) found. Scope: " +
        (data.scope === "hospital_wide" ? "hospital-wide" : "your authorised departments") + ".";
    message.className = "message success";
}
const refreshEscalationsButton = document.getElementById("refreshDepartmentTaskEscalations");
if (refreshEscalationsButton) refreshEscalationsButton.addEventListener("click", () => {
    if (currentClinic) void loadDepartmentTaskEscalations(currentClinic);
});

// HEALTHOS AI: DEPARTMENT HEAD TASK ASSIGNMENT
async function loadDepartmentTaskAssignmentOptions(clinic) {
    const panel = document.getElementById("departmentTaskAssignmentPanel");
    const staff = document.getElementById("departmentTaskAssignee");
    const duty = document.getElementById("departmentTaskDuty");
    const message = document.getElementById("departmentTaskAssignmentMessage");
    if (!panel || !staff || !duty || !clinic) return;
    panel.hidden = false;
    staff.replaceChildren(new Option("Loading authorised team...", ""));
    const { data, error } = await supabaseClient.rpc("get_task_assignment_options", { p_clinic_id: clinic.id });
    if (error) { panel.hidden = true; console.error("Department task assignment access:", error); return; }
    const assignments = Array.isArray(data?.staff_assignments) ? data.staff_assignments : [];
    if (!assignments.length) { panel.hidden = true; return; }
    staff.replaceChildren(new Option("Select team member", ""));
    assignments.forEach(item => staff.add(new Option(item.name + " (" + item.staff_id + ") — " + item.department_name + (item.unit_name ? " / " + item.unit_name : ""), item.assignment_id)));
    duty.replaceChildren(new Option("No approved duty linked", ""));
    (data.approved_duties || []).forEach(item => duty.add(new Option(item.department_name + " — " + item.title, item.id)));
    message.textContent = "Your assignment scope is limited by your active department leadership appointment.";
    message.className = "message";
}
const departmentTaskForm = document.getElementById("departmentTaskAssignmentForm");
if (departmentTaskForm) departmentTaskForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentClinic || !currentUser) return;
    const button = document.getElementById("createDepartmentTaskButton");
    const message = document.getElementById("departmentTaskAssignmentMessage");
    button.disabled = true;
    const due = document.getElementById("departmentTaskDueAt").value;
    const { data, error } = await supabaseClient.rpc("create_supervised_staff_task", {
        p_clinic_id: currentClinic.id,
        p_assignment_id: document.getElementById("departmentTaskAssignee").value,
        p_title: document.getElementById("departmentTaskTitle").value.trim(),
        p_description: document.getElementById("departmentTaskDescription").value.trim() || null,
        p_priority: document.getElementById("departmentTaskPriority").value,
        p_due_at: due ? new Date(due).toISOString() : null,
        p_duty_id: document.getElementById("departmentTaskDuty").value || null
    });
    button.disabled = false;
    if (error) { message.textContent = friendlyError(error); message.className = "message error"; return; }
    message.textContent = "Task assigned. The team member can accept, work on, and submit it for review.";
    message.className = "message success";
    departmentTaskForm.reset();
    await loadDepartmentTaskAssignmentOptions(currentClinic);
    if (typeof loadDepartmentPerformanceDashboard === "function") loadDepartmentPerformanceDashboard(currentClinic);
    if (typeof loadHospitalDepartmentCommand === "function") loadHospitalDepartmentCommand(currentClinic);
});
const refreshDepartmentTaskOptions = document.getElementById("refreshDepartmentTaskOptions");
if (refreshDepartmentTaskOptions) refreshDepartmentTaskOptions.addEventListener("click", () => { if (currentClinic) loadDepartmentTaskAssignmentOptions(currentClinic); });

// HEALTHOS AI: TASK ASSIGNMENT PANEL
async function loadTaskAssignmentOptions(clinic) {
    const form = document.getElementById("taskAssignmentForm");
    const staffSelect = document.getElementById("taskAssignee");
    const dutySelect = document.getElementById("taskDuty");
    const message = document.getElementById("taskAssignmentMessage");
    if (!form || !staffSelect || !dutySelect) return;
    staffSelect.replaceChildren(new Option("Loading staff...", ""));
    dutySelect.replaceChildren(new Option("No approved duty linked", ""));
    const { data, error } = await supabaseClient.rpc(
        "get_task_assignment_options", { p_clinic_id: clinic.id }
    );
    if (error) {
        message.textContent = "Task assignment options could not be loaded. Check administrator access.";
        message.className = "message error";
        staffSelect.replaceChildren(new Option("Unable to load staff", ""));
        return;
    }
    staffSelect.replaceChildren(new Option("Select staff member", ""));
    (data.staff_assignments || []).forEach(function (item) {
        const label = item.name + " (" + item.staff_id + ") — " +
            item.department_name + (item.unit_name ? " / " + item.unit_name : "");
        staffSelect.add(new Option(label, item.assignment_id));
    });
    dutySelect.replaceChildren(new Option("No approved duty linked", ""));
    (data.approved_duties || []).forEach(function (duty) {
        dutySelect.add(new Option(duty.department_name + " — " + duty.title, duty.id));
    });
    message.textContent = "Choose an active staff assignment. Only approved duties are available to link.";
    message.className = "message";
}

const taskAssignmentForm = document.getElementById("taskAssignmentForm");
if (taskAssignmentForm) {
    taskAssignmentForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!currentClinic || !managementVerified) {
            alert("Administrator verification is required to assign tasks here.");
            return;
        }
        const button = document.getElementById("createStaffTaskButton");
        const message = document.getElementById("taskAssignmentMessage");
        button.disabled = true;
        const dueValue = document.getElementById("taskDueAt").value;
        const { data, error } = await supabaseClient.rpc("create_supervised_staff_task", {
            p_clinic_id: currentClinic.id,
            p_assignment_id: document.getElementById("taskAssignee").value,
            p_title: document.getElementById("taskTitle").value.trim(),
            p_description: document.getElementById("taskDescription").value.trim() || null,
            p_priority: document.getElementById("taskPriority").value,
            p_due_at: dueValue ? new Date(dueValue).toISOString() : null,
            p_duty_id: document.getElementById("taskDuty").value || null
        });
        if (error) {
            message.textContent = friendlyError(error);
            message.className = "message error";
            button.disabled = false;
            return;
        }
        message.textContent = "Task assigned successfully. Task ID: " + data.task_id;
        message.className = "message success";
        taskAssignmentForm.reset();
        button.disabled = false;
        await loadDepartmentPerformanceDashboard(currentClinic);
        await loadHospitalDepartmentCommand(currentClinic);
    });
}
const refreshTaskAssignmentOptions = document.getElementById("refreshTaskAssignmentOptions");
if (refreshTaskAssignmentOptions) {
    refreshTaskAssignmentOptions.addEventListener("click", function () {
        if (currentClinic && managementVerified) loadTaskAssignmentOptions(currentClinic);
    });
}

 
// HEALTHOS AI: DEPARTMENT HEAD & SUPERVISOR APPOINTMENTS
let managementAppointmentData = null;
async function loadManagementAppointments(clinic) {
    const message = document.getElementById("managementAppointmentMessage");
    const department = document.getElementById("managementDepartment");
    const unit = document.getElementById("managementUnit");
    const manager = document.getElementById("managementStaffAssignment");
    const list = document.getElementById("managementAppointmentList");
    if (!message || !department || !unit || !manager || !list) return;
    const { data, error } = await supabaseClient.rpc(
        "get_management_appointment_options", { p_clinic_id: clinic.id }
    );
    if (error) {
        message.textContent = "Only hospital owners and administrators can manage appointments.";
        message.className = "message error";
        return;
    }
    managementAppointmentData = data;
    department.replaceChildren(new Option("Select department", ""));
    (data.departments || []).forEach(x => department.add(new Option(x.name, x.id)));
    unit.replaceChildren(new Option("Department-wide (no unit)", ""));
    manager.replaceChildren(new Option("Select manager", ""));
    renderManagementAppointmentOptions();
    list.replaceChildren();
    const appointments = data.appointments || [];
    if (!appointments.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No department leadership appointments have been recorded.";
        list.appendChild(empty);
    } else {
        appointments.forEach(function (item) {
            const row = document.createElement("div");
            row.className = "leadership-appointment-row";
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.gap = "12px";
            row.style.padding = "12px 0";
            row.style.borderBottom = "1px solid var(--border-color, #e5e7eb)";
            const details = document.createElement("p");
            details.textContent = item.department_name + (item.unit_name ? " / " + item.unit_name : "") +
                " — " + item.role.replaceAll("_", " ") + ": " + item.manager_name +
                " (" + item.status + ", " + item.effective_from +
                (item.effective_to ? " to " + item.effective_to : " onward") + ")";
            row.appendChild(details);
            if (["active", "delegated", "on_leave"].includes(item.status)) {
                const endButton = document.createElement("button");
                endButton.type = "button";
                endButton.className = "logout-button";
                endButton.textContent = "End appointment";
                endButton.addEventListener("click", async function () {
                    if (!currentClinic || !managementVerified ||
                        !confirm("End this leadership appointment? Its history will be retained.")) return;
                    endButton.disabled = true;
                    const { data: result, error: endError } = await supabaseClient.rpc(
                        "healthos_end_department_leadership_appointment",
                        { p_clinic_id: currentClinic.id, p_appointment_id: item.id }
                    );
                    if (endError) {
                        message.textContent = friendlyError(endError);
                        message.className = "message error";
                        endButton.disabled = false;
                        return;
                    }
                    message.textContent = "Leadership appointment ended. Historical record retained.";
                    message.className = "message success";
                    await loadManagementAppointments(currentClinic);
                });
                row.appendChild(endButton);
            }
            list.appendChild(row);
        });
    }
    message.textContent = "Leadership appointments loaded. Choose the department or unit and an active staff assignment.";
    message.className = "message success";
}
function renderManagementAppointmentOptions() {
    if (!managementAppointmentData) return;
    const deptId = document.getElementById("managementDepartment").value;
    const unitSelect = document.getElementById("managementUnit");
    const managerSelect = document.getElementById("managementStaffAssignment");
    const selectedUnit = unitSelect.value;
    unitSelect.replaceChildren(new Option("Department-wide (no unit)", ""));
    (managementAppointmentData.units || []).filter(x => x.department_id === deptId)
        .forEach(x => unitSelect.add(new Option(x.name, x.id)));
    if ([...unitSelect.options].some(o => o.value === selectedUnit)) unitSelect.value = selectedUnit;
    const unitId = unitSelect.value;
    managerSelect.replaceChildren(new Option("Select manager", ""));
    (managementAppointmentData.staff_assignments || []).filter(x =>
        x.department_id === deptId && (unitId ? x.unit_id === unitId : true)
    ).forEach(x => managerSelect.add(new Option(
        x.name + " (" + x.staff_id + ") — " + x.department_name +
        (x.unit_name ? " / " + x.unit_name : ""), x.assignment_id
    )));
    const roleSelect = document.getElementById("managementLeadershipRole");
    const unitScoped = Boolean(unitId);
    const roles = unitScoped
        ? [["unit_head","Unit Head"],["unit_supervisor","Unit Supervisor"],["coordinator","Coordinator"]]
        : [["department_head","Department Head"],["deputy_head","Deputy Head"],["department_supervisor","Department Supervisor"],["coordinator","Coordinator"]];
    roleSelect.replaceChildren(new Option("Select leadership role", ""));
    roles.forEach(x => roleSelect.add(new Option(x[1],x[0])));
}
const managementDepartment = document.getElementById("managementDepartment");
if (managementDepartment) managementDepartment.addEventListener("change",renderManagementAppointmentOptions);
const managementUnit = document.getElementById("managementUnit");
if (managementUnit) managementUnit.addEventListener("change",renderManagementAppointmentOptions);
const managementAppointmentForm = document.getElementById("managementAppointmentForm");
if (managementAppointmentForm) managementAppointmentForm.addEventListener("submit",async function(event) {
    event.preventDefault();
    const button=document.getElementById("saveManagementAppointment");
    const message=document.getElementById("managementAppointmentMessage");
    button.disabled=true;
    const {data,error}=await supabaseClient.rpc("appoint_clinic_department_manager",{
        p_clinic_id:currentClinic.id,
        p_department_id:document.getElementById("managementDepartment").value,
        p_unit_id:document.getElementById("managementUnit").value||null,
        p_manager_assignment_id:document.getElementById("managementStaffAssignment").value,
        p_leadership_role:document.getElementById("managementLeadershipRole").value,
        p_effective_from:document.getElementById("managementEffectiveFrom").value,
        p_effective_to:document.getElementById("managementEffectiveTo").value||null,
        p_notes:document.getElementById("managementAppointmentNotes").value.trim()||null
    });
    if(error){message.textContent=friendlyError(error);message.className="message error";button.disabled=false;return;}
    message.textContent="Leadership appointment saved. Appointment ID: "+data.appointment_id;
    message.className="message success";
    managementAppointmentForm.reset();
    button.disabled=false;
    await loadManagementAppointments(currentClinic);
});
const refreshManagementAppointments=document.getElementById("refreshManagementAppointments");
if(refreshManagementAppointments) refreshManagementAppointments.addEventListener("click",function(){
    if(currentClinic&&managementVerified) loadManagementAppointments(currentClinic);
});
// END HEALTHOS AI: DEPARTMENT HEAD & SUPERVISOR APPOINTMENTS

// END HEALTHOS AI: TASK ASSIGNMENT PANEL

// END HEALTHOS AI: DEPARTMENT PERFORMANCE DASHBOARD
const departmentPerformanceRefreshButton = document.getElementById(
    "refreshDepartmentPerformanceButton"
);

if (departmentPerformanceRefreshButton) {
    departmentPerformanceRefreshButton.addEventListener("click", function () {
        if (currentClinic && managementVerified) {
            loadDepartmentPerformanceDashboard(currentClinic);
        }
    });
}


// END HEALTHOS AI: ADMIN STAFF DASHBOARD STATISTICS
// HEALTHOS AI: LOAD INDIVIDUAL STAFF ACTIVITY

async function loadStaffActivityTable(clinic) {
    const tableBody = document.getElementById(
        "staffActivityTableBody"
    );

    if (!tableBody || !supabaseClient || !clinic) {
        return;
    }

    tableBody.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");

    loadingCell.colSpan = 7;
    loadingCell.textContent = "Loading staff activity...";
    loadingRow.appendChild(loadingCell);
    tableBody.appendChild(loadingRow);

    try {
        const { data: staff, error: staffError } =
            await supabaseClient
                .from("staff_profiles")
                .select(
                    "id, full_name, department, professional_role"
                )
                .eq("clinic_id", clinic.id)
                .eq("employment_status", "active")
                .order("full_name");

        if (staffError) {
            throw staffError;
        }

        const { data: presence, error: presenceError } =
            await supabaseClient
                .from("staff_presence")
                .select(
                           "staff_profile_id, presence_status, " +
                "last_seen_at, last_login_at, last_sign_out_at, " +
                "last_clock_in_at, last_clock_out_at"
            ) 
                .eq("clinic_id", clinic.id);

        if (presenceError) {
            throw presenceError;
        }

        const presenceByStaffId = new Map();

        (presence || []).forEach(function (record) {
            presenceByStaffId.set(
                record.staff_profile_id,
                record
            );
        });

        tableBody.replaceChildren();

        if (!staff || staff.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.textContent =
                "No active staff members are registered.";

            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        const fiveMinutesAgo =
            Date.now() - 5 * 60 * 1000;

        function formatStaffTime(value) {
            if (!value) {
                return "—";
            }

            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return "—";
            }

            return date.toLocaleString();
        }

        staff.forEach(function (person) {
            const record = presenceByStaffId.get(person.id);

            const isOnline = Boolean(
                record &&
                record.presence_status === "online" &&
                record.last_seen_at &&
                new Date(record.last_seen_at).getTime() >=
                    fiveMinutesAgo
            );

            const row = document.createElement("tr");

                       const values = [
                person.full_name || "Unnamed staff",
                person.department || "—",
                person.professional_role || "—",
                isOnline ? "Online" : "Offline",
                formatStaffTime(
                    record ? record.last_login_at : null
                ),
                formatStaffTime(
                    record ? record.last_sign_out_at : null
                ),
                formatStaffTime(
                    record ? record.last_clock_in_at : null
                ),
                formatStaffTime(
                    record ? record.last_clock_out_at : null
                )
            ]; 
            

            values.forEach(function (value, index) {
                const cell = document.createElement("td");

                if (index === 3) {
                    const statusBadge = document.createElement("span");
                    const online = value === "Online";

                    statusBadge.className = online
                        ? "staff-presence-badge staff-presence-online"
                        : "staff-presence-badge staff-presence-offline";
                    statusBadge.setAttribute(
                        "aria-label",
                        online ? "Staff portal is online" : "Staff portal is offline"
                    );

                    const statusDot = document.createElement("span");
                    statusDot.className = "staff-presence-dot";
                    statusDot.setAttribute("aria-hidden", "true");

                    const statusText = document.createElement("span");
                    statusText.textContent = value;

                    statusBadge.append(statusDot, statusText);
                    cell.appendChild(statusBadge);
                } else {
                    cell.textContent = value;
                }

                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error(
            "HealthOS: Staff activity table failed:",
            error
        );

        tableBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent =
            "Unable to load staff activity. Check database permissions.";

        row.appendChild(cell);
        tableBody.appendChild(row);
    }
}

// END HEALTHOS AI: LOAD INDIVIDUAL STAFF ACTIVITY
// Load billing transactions and revenue findings for this clinic.
async function loadBillingData(clinic) {
    const transactionsBody =
        document.getElementById("transactionsBody");

    const totalRevenueElement =
        document.getElementById("totalRevenue");
    const totalInvoicedElement =
        document.getElementById("totalInvoiced");
    const outstandingBalanceElement =
        document.getElementById("outstandingBalance");

    const billingFindingCountElement =
        document.getElementById("billingFindingCount");

    const transactionCountElement =
        document.getElementById("transactionCount");

    if (
        !transactionsBody ||
        !totalRevenueElement ||
        !totalInvoicedElement ||
        !outstandingBalanceElement ||
        !billingFindingCountElement ||
        !transactionCountElement
    ) {

        console.error(
            "HealthOS: Billing dashboard elements are missing."
        );
        return;
    }

    transactionsBody.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");

    loadingCell.colSpan = 5;
    loadingCell.textContent = "Loading billing records...";

    loadingRow.appendChild(loadingCell);
    transactionsBody.appendChild(loadingRow);

    try {
        if (!supabaseClient || !clinic || !clinic.id) {
            throw new Error(
                "The clinic workspace could not be identified."
            );
        }
        // HEALTHOS AI: AUTOMATIC REVENUE AUDIT
        const { data: revenueAuditResult, error: revenueAuditError } =
            await supabaseClient.rpc(
                "detect_unlinked_performed_services",
                {
                    p_clinic_id: clinic.id
                }
            );

        if (revenueAuditError) {
            throw revenueAuditError;
        }

        console.log(
            "Revenue audit completed:",
            revenueAuditResult
        );
        // END AUTOMATIC REVENUE AUDIT
        const { data: transactions, error: transactionError } =
            await supabaseClient
                .from("billing_transactions")
                .select(
                    "id, clinic_id, reference, service_description, invoice_amount, amount_paid, payment_status, transaction_date"
                )
                .eq("clinic_id", clinic.id)
                .order("transaction_date", {
                    ascending: false
                });

        if (transactionError) {
            throw transactionError;
        }

        // Load department-captured payments separately from invoices.
        // These are operational payment records, not new invoices, and must
        // not inflate confirmed revenue until bank/POS settlement is reconciled.
        const { data: departmentPayments, error: departmentPaymentsError } =
            await supabaseClient
                .from("pos_receipts")
                .select("id, created_at, transaction_at, payment_provider, transaction_reference, invoice_reference, payment_method, amount, currency, captured_department, acceptance_status, reconciliation_status")
                .eq("clinic_id", clinic.id)
                .order("created_at", { ascending: false })
                .limit(1000);

        if (departmentPaymentsError) {
            throw departmentPaymentsError;
        }

        // DEPARTMENTAL FINANCIAL ACCOUNTABILITY — receipt capture visibility.
        // Accepted and reconciled are separate controls; neither is treated as a new invoice.
        const departmentSummaryBody = document.getElementById("departmentFinancialSummaryBody");
        if (departmentSummaryBody) {
            departmentSummaryBody.replaceChildren();
            const groups = new Map();
            (departmentPayments || []).forEach(payment => {
                const department = (payment.captured_department || "Department not recorded").trim();
                const currency = String(payment.currency || "NGN").trim().toUpperCase();
                const key = department + "::" + currency;
                if (!groups.has(key)) groups.set(key, {department,currency,count:0,captured:0,accepted:0,reconciled:0,pending:0,unassigned:department === "Department not recorded"});
                const item = groups.get(key);
                const amount = Number(payment.amount || 0);
                item.count += 1;
                item.captured += amount;
                if (payment.acceptance_status === "accepted") item.accepted += amount;
                else item.pending += amount;
                if (payment.reconciliation_status === "reconciled") item.reconciled += amount;
            });
            if (!groups.size) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 7;
                cell.textContent = "No department receipts available for this clinic.";
                row.appendChild(cell);
                departmentSummaryBody.appendChild(row);
            } else {
                [...groups.values()].sort((a,b) => a.department.localeCompare(b.department)).forEach(item => {
                    const row = document.createElement("tr");
                    const money = value => new Intl.NumberFormat("en-NG",{style:"currency",currency:item.currency,maximumFractionDigits:2}).format(value);
                    [item.department,item.currency,String(item.count),money(item.captured),money(item.accepted),money(item.reconciled),money(item.pending)].forEach(value => {
                        const cell = document.createElement("td");
                        cell.textContent = String(value);
                        row.appendChild(cell);
                    });
                    departmentSummaryBody.appendChild(row);
                });
            }
        }

        // DEPARTMENT CASH DECLARATION + INDEPENDENT FINANCE VERIFICATION
        const cashDepositForm = document.getElementById("departmentCashDepositForm");
        const cashDepositMessage = document.getElementById("cashDepositMessage");
        const cashDepositDepartment = document.getElementById("cashDepositDepartment");
        const cashDepositRows = document.getElementById("departmentCashDepositRows");
        const { data: cashDepartments, error: cashDepartmentsError } = await supabaseClient
            .from("clinic_departments")
            .select("id,department_name")
            .eq("clinic_id", clinic.id)
            .eq("is_active", true)
            .order("department_name");
        if (cashDepartmentsError) throw cashDepartmentsError;
        if (cashDepositDepartment) {
            const previous = cashDepositDepartment.value;
            cashDepositDepartment.replaceChildren();
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Select department";
            cashDepositDepartment.appendChild(placeholder);
            (cashDepartments || []).forEach(department => {
                const option = document.createElement("option");
                option.value = department.id;
                option.textContent = department.department_name;
                cashDepositDepartment.appendChild(option);
            });
            if (previous) cashDepositDepartment.value = previous;
        }
        const cashDate = document.getElementById("cashDepositDate");
        if (cashDate && !cashDate.value) cashDate.value = new Date().toISOString().slice(0,10);
        if (cashDepositForm && cashDepositForm.dataset.bound !== "true") {
            cashDepositForm.dataset.bound = "true";
            cashDepositForm.addEventListener("submit", async event => {
                event.preventDefault();
                const submit = document.getElementById("submitCashDeposit");
                submit.disabled = true;
                if (cashDepositMessage) cashDepositMessage.textContent = "Submitting declaration…";
                try {
                    const payload = {
                        clinic_id: clinic.id,
                        department_id: cashDepositDepartment.value,
                        shift_date: cashDate.value,
                        shift_label: document.getElementById("cashDepositShift").value.trim(),
                        currency: document.getElementById("cashDepositCurrency").value,
                        declared_cash_amount: Number(document.getElementById("cashDepositDeclared").value),
                        cash_bag_reference: document.getElementById("cashDepositBag").value.trim() || null,
                        notes: document.getElementById("cashDepositNotes").value.trim() || null,
                        recorded_by: currentUser.id
                    };
                    if (!payload.department_id || !payload.shift_label || !Number.isFinite(payload.declared_cash_amount) || payload.declared_cash_amount < 0) throw new Error("Complete the department, shift and valid cash amount.");
                    const { error } = await supabaseClient.from("department_cash_deposits").insert(payload);
                    if (error) throw error;
                    cashDepositForm.reset();
                    if (cashDate) cashDate.value = new Date().toISOString().slice(0,10);
                    if (cashDepositMessage) cashDepositMessage.textContent = "Cash declaration submitted. It is awaiting independent Finance verification.";
                    await loadBillingData(clinic);
                } catch (error) {
                    if (cashDepositMessage) cashDepositMessage.textContent = "Submission failed: " + (error.message || "Check your department permissions.");
                } finally {
                    submit.disabled = false;
                }
            });
        }
        const { data: cashDeposits, error: cashDepositsError } = await supabaseClient
            .from("department_cash_deposits")
            .select("id,department_id,shift_date,shift_label,currency,declared_cash_amount,deposited_amount,bank_reference,status,recorded_by,created_at")
            .eq("clinic_id", clinic.id)
            .order("created_at", { ascending: false })
            .limit(100);
        if (cashDepositsError) throw cashDepositsError;
        if (cashDepositRows) {
            cashDepositRows.replaceChildren();
            if (!cashDeposits || !cashDeposits.length) {
                const empty = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 7;
                cell.textContent = "No department cash declarations submitted.";
                empty.appendChild(cell);
                cashDepositRows.appendChild(empty);
            } else {
                const deptNames = new Map((cashDepartments || []).map(d => [d.id,d.department_name]));
                cashDeposits.forEach(item => {
                    const row = document.createElement("tr");
                    const money = value => value == null ? "Awaiting verification" : new Intl.NumberFormat("en-NG",{style:"currency",currency:item.currency,maximumFractionDigits:2}).format(Number(value));
                    const vals = [item.shift_date + " / " + item.shift_label,deptNames.get(item.department_id) || "Department",money(item.declared_cash_amount),money(item.deposited_amount),item.bank_reference || "—",item.status.replace(/_/g," ")];
                    vals.forEach(value => { const cell=document.createElement("td"); cell.textContent=String(value); row.appendChild(cell); });
                    const actionCell=document.createElement("td");
                    if (item.status === "submitted") {
                        const verify=document.createElement("button");
                        verify.type="button"; verify.className="secondary-button"; verify.textContent="Verify / review";
                        verify.addEventListener("click", async () => {
                            const decision=window.prompt("Enter VERIFIED or REJECTED. Only an independent authorised Finance reviewer can complete this action.");
                            if (!decision || !["VERIFIED","REJECTED"].includes(decision.trim().toUpperCase())) return;
                            const status=decision.trim().toLowerCase();
                            let update={status,reviewed_by:currentUser.id,reviewed_at:new Date().toISOString()};
                            const note=window.prompt("Finance review note (required):");
                            if (!note || note.trim().length<3) return;
                            update.review_notes=note.trim();
                            if (status==="verified") {
                                const amount=window.prompt("Enter the bank-confirmed deposited amount:");
                                const bankRef=window.prompt("Enter the bank statement / deposit reference:");
                                const evidence=window.prompt("Enter the secure evidence file path (deposit slip / bank proof):");
                                if (amount===null || !Number.isFinite(Number(amount)) || Number(amount)<0 || !bankRef?.trim() || !evidence?.trim()) {
                                    if(cashDepositMessage) cashDepositMessage.textContent="Verification requires a valid banked amount, bank reference and evidence path.";
                                    return;
                                }
                                update.deposited_amount=Number(amount);
                                update.bank_reference=bankRef.trim();
                                update.bank_evidence_path=evidence.trim();
                                update.bank_booked_at=new Date().toISOString();
                            }
                            verify.disabled=true;
                            try {
                                const {error}=await supabaseClient.from("department_cash_deposits").update(update).eq("id",item.id).eq("clinic_id",clinic.id).eq("status","submitted");
                                if(error) throw error;
                                if(cashDepositMessage) cashDepositMessage.textContent="Finance review saved. Original cash declaration remains unchanged.";
                                await loadBillingData(clinic);
                            } catch(error) {
                                if(cashDepositMessage) cashDepositMessage.textContent="Review not saved: "+(error.message || "Check Finance review permissions and ensure the reviewer is not the recorder.");
                                verify.disabled=false;
                            }
                        });
                        actionCell.appendChild(verify);
                    } else {
                        actionCell.textContent="Locked after review";
                    }
                    row.appendChild(actionCell);
                    cashDepositRows.appendChild(row);
                });
            }
        }
        // END DEPARTMENT CASH DECLARATION + INDEPENDENT FINANCE VERIFICATION

        const departmentPaymentsBody =
            document.getElementById("departmentPaymentsBody");

        if (departmentPaymentsBody) {
            departmentPaymentsBody.replaceChildren();

            if (!departmentPayments || departmentPayments.length === 0) {
                const emptyRow = document.createElement("tr");
                const emptyCell = document.createElement("td");
                emptyCell.colSpan = 8;
                emptyCell.textContent = "No department payments recorded yet.";
                emptyRow.appendChild(emptyCell);
                departmentPaymentsBody.appendChild(emptyRow);
            } else {
                const departmentMoney = new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    maximumFractionDigits: 2
                });

                departmentPayments.forEach(function (payment) {
                    const row = document.createElement("tr");
                    const dateValue = payment.transaction_at || payment.created_at;
                    const values = [
                        dateValue ? new Date(dateValue).toLocaleString() : "—",
                        payment.captured_department || "Department not recorded",
                        payment.invoice_reference || payment.transaction_reference || "No reference",
                        payment.payment_provider || "—",
                        payment.payment_method || "—",
                        payment.amount == null ? "—" : departmentMoney.format(Number(payment.amount)),
                        String(payment.acceptance_status || "awaiting_acceptance").replace(/_/g, " "),
                        String(payment.reconciliation_status || "unmatched").replace(/_/g, " ")
                    ];

                    values.forEach(function (value) {
                        const cell = document.createElement("td");
                        cell.textContent = String(value);
                        row.appendChild(cell);
                    });

                    departmentPaymentsBody.appendChild(row);
                });
            }
        }

        // HEALTHOS AI: INVOICE-TO-BANK REVENUE LEAKAGE REVIEW
        const auditPanel = document.getElementById("revenueLeakageAuditPanel");
        const auditRows = document.getElementById("revenueLeakageAuditRows");
        const auditMessage = document.getElementById("revenueLeakageAuditMessage");
        if (auditPanel && auditRows) {
            auditPanel.hidden = false;
            if (auditMessage) auditMessage.textContent = "Scanning invoices, performed services and accepted department receipts…";
            const { data: auditRun, error: auditRunError } = await supabaseClient.rpc(
                "run_revenue_leakage_audit", { p_clinic_id: clinic.id }
            );
            if (auditRunError) throw auditRunError;
            const { data: auditCases, error: auditCasesError } = await supabaseClient
                .from("revenue_audit_cases")
                .select("id,finding_type,severity,source_type,source_id,reference,expected_amount,observed_amount,currency,details,status,detected_at")
                .eq("clinic_id", clinic.id)
                .in("status", ["open", "under_review"])
                .order("detected_at", { ascending: false })
                .limit(200);
            if (auditCasesError) throw auditCasesError;
            auditRows.replaceChildren();
            if (!auditCases || auditCases.length === 0) {
                const empty = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 8;
                cell.textContent = "No open revenue leakage flags. This is not a guarantee that every transaction is settled.";
                empty.appendChild(cell);
                auditRows.appendChild(empty);
            } else {
                auditCases.forEach(item => {
                    const row = document.createElement("tr");
                    const details = item.details || {};
                    const descriptions = {
                        unbilled_service: "Performed service has no linked billing transaction",
                        duplicate_invoice_reference: "Duplicate invoice reference detected",
                        receipt_not_bank_matched: "Accepted department receipt not yet bank-reconciled",
                        invoice_payment_variance: "Recorded invoice payments differ from accepted receipts",
                        unallocated_bank_credit: "Positive bank deposit has no exact invoice or accepted receipt reference",
                        duplicate_payment_reference: "Repeated accepted payment reference — verify for possible duplicate capture",
                        duplicate_bank_reference: "Repeated bank reference across statement imports — verify for possible duplicate import or replay",
                        duplicate_supplier_payment: "Repeated supplier payment reference — verify against payment and bank evidence",
                        supplier_payment_over_purchase_order: "Approved supplier payments exceed the purchase order total — reconcile before further payment"
                    };
                    const moneyText = value => value == null ? "—" :
                        new Intl.NumberFormat("en-NG", {style:"currency",currency:item.currency || "NGN",maximumFractionDigits:2}).format(Number(value));
                    const values = [
                        String(item.severity || "medium").toUpperCase(),
                        descriptions[item.finding_type] || String(item.finding_type).replace(/_/g, " "),
                        item.reference || details.service || item.source_type,
                        moneyText(item.expected_amount),
                        moneyText(item.observed_amount),
                        String(item.status).replace(/_/g, " "),
                        item.detected_at ? new Date(item.detected_at).toLocaleString() : "—"
                    ];
                    values.forEach(value => {
                        const cell = document.createElement("td");
                        cell.textContent = String(value);
                        row.appendChild(cell);
                    });
                    const actions = document.createElement("td");
                    [["under_review","Review"],["resolved","Resolve"],["dismissed","Dismiss"]].forEach(([status,label]) => {
                        const button = document.createElement("button");
                        button.type = "button";
                        button.className = status === "resolved" ? "primary-button" : "secondary-button";
                        button.textContent = label;
                        button.addEventListener("click", async () => {
                            const note = window.prompt("Add a Finance review note (required):");
                            if (!note || note.trim().length < 3) return;
                            button.disabled = true;
                            try {
                                const { error } = await supabaseClient.from("revenue_audit_cases").update({
                                    status, review_notes: note.trim(), reviewed_by: currentUser.id,
                                    reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString()
                                }).eq("id", item.id).eq("clinic_id", clinic.id);
                                if (error) throw error;
                                if (auditMessage) auditMessage.textContent = "Revenue audit case updated. No payment or invoice amount was changed.";
                                await loadBillingData(clinic);
                            } catch (error) {
                                if (auditMessage) auditMessage.textContent = "Could not update case: " + (error.message || "Please retry.");
                                button.disabled = false;
                            }
                        });
                        actions.appendChild(button);
                    });
                    row.appendChild(actions);
                    auditRows.appendChild(row);
                });
            }
            if (auditMessage) auditMessage.textContent =
                (auditRun?.new_cases || 0) + " new flag(s) created. " +
                (auditCases?.length || 0) + " open case(s) require Finance review. Flags are not proof of fraud or confirmed loss.";
        }
        // END INVOICE-TO-BANK REVENUE LEAKAGE REVIEW

        const { data: findings, error: findingsError } =
            await supabaseClient
                .from("revenue_audit_findings")
                .select(
                    "transaction_id, finding_type, description, status"
                )
                .eq("clinic_id", clinic.id);

        if (findingsError) {
            throw findingsError;
        }

        const activeFindings = (findings || []).filter(
            function (finding) {
                return (
                    finding.status === "open" ||
                    finding.status === "investigating"
                );
            }
        );

        const findingsByTransaction = new Map();

        activeFindings.forEach(function (finding) {
            if (!finding.transaction_id) {
                return;
            }

            if (
                !findingsByTransaction.has(
                    finding.transaction_id
                )
            ) {
                findingsByTransaction.set(
                    finding.transaction_id,
                    []
                );
            }

            findingsByTransaction
                .get(finding.transaction_id)
                .push(finding);
        });

        const money = new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2
        });

                    let totalInvoiced = 0;
        let totalPaymentsRecorded = 0;
        let outstandingBalance = 0;

        (transactions || []).forEach(function (transaction) {
            const invoiceAmount =
                Number(transaction.invoice_amount) || 0;

            const amountPaid =
                Number(transaction.amount_paid) || 0;

            const status = transaction.payment_status;

            // Exclude void and refunded transactions.
            if (
                status !== "void" &&
                status !== "refunded"
            ) {
                totalInvoiced += invoiceAmount;
                totalPaymentsRecorded += amountPaid;
            }

            // Calculate outstanding balances.
            if (
                status === "pending" ||
                status === "part_paid"
            ) {
                outstandingBalance += Math.max(
                    0,
                    invoiceAmount - amountPaid
                );
            }
        });
        totalInvoicedElement.textContent =
            money.format(totalInvoiced);
        totalRevenueElement.textContent =
            money.format(totalPaymentsRecorded);

        outstandingBalanceElement.textContent =
            money.format(outstandingBalance); 

        // Count only findings that still require human attention.
        billingFindingCountElement.textContent =
            String(activeFindings.length);

        transactionCountElement.textContent =
            String((transactions || []).length);

        transactionsBody.replaceChildren();

        if (!transactions || transactions.length === 0) {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");

            emptyCell.colSpan = 5;
            emptyCell.textContent =
                "No billing transactions recorded for this clinic yet.";

            emptyRow.appendChild(emptyCell);
            transactionsBody.appendChild(emptyRow);

            showDashboardMessage(
                "Your clinic is connected. No billing transactions have been recorded yet."
            );

            return;
        }

        transactions.forEach(function (transaction) {
            const row = document.createElement("tr");

            const transactionFindings =
                findingsByTransaction.get(transaction.id) || [];

            let reviewText;

            if (transactionFindings.length > 0) {
                reviewText = transactionFindings
                    .map(function (finding) {
                        return finding.description ||
                            finding.finding_type;
                    })
                    .join("; ");
            } else {
                reviewText = "No open finding recorded";
            }

            const statusText =
                transactionFindings.length > 0
                    ? "Review needed"
                    : String(
                        transaction.payment_status || "unknown"
                    )
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, function (letter) {
                            return letter.toUpperCase();
                        });

            const values = [
                transaction.reference || "No reference",
                transaction.service_description || "Unspecified service",
                reviewText,
                money.format(
                    Number(transaction.invoice_amount) || 0
                ),
                statusText
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            transactionsBody.appendChild(row);
        });

        showDashboardMessage(
            "Billing records loaded. Review any flagged findings before taking action."
        );

    } catch (error) {
        console.error(
            "HealthOS billing data loading failed:",
            error
        );

        transactionsBody.replaceChildren();

        const errorRow = document.createElement("tr");
        const errorCell = document.createElement("td");

        errorCell.colSpan = 5;
        errorCell.textContent =
            "Unable to load billing records. Please refresh and try again.";

        errorRow.appendChild(errorCell);
        transactionsBody.appendChild(errorRow);

        showDashboardMessage(
            "The dashboard opened, but billing data could not be loaded: " +
            friendlyError(error),
            "error"
        );
    }
}    
// Connect the transaction form controls.
const toggleTransactionForm =
    document.getElementById("toggleTransactionForm");

const transactionForm =
    document.getElementById("transactionForm");

const transactionDate =
    document.getElementById("transactionDate");

if (toggleTransactionForm && transactionForm) {
    toggleTransactionForm.addEventListener("click", function () {
        transactionForm.hidden = !transactionForm.hidden;

        toggleTransactionForm.setAttribute(
            "aria-expanded",
            String(!transactionForm.hidden)
        );

        toggleTransactionForm.textContent =
            transactionForm.hidden
                ? "+ Record transaction"
                : "Cancel transaction";
    });
}

if (transactionDate && !transactionDate.value) {
    const today = new Date();

    const localDate =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    transactionDate.value = localDate;
}
// Save a billing transaction to Supabase.
if (transactionForm) {
    transactionForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const message =
            document.getElementById("transactionFormMessage");

        const saveButton =
            document.getElementById("saveTransactionButton");

        const reference =
            document.getElementById("transactionReference")
                .value.trim();

        const service =
            document.getElementById("transactionService")
                .value.trim();

        const invoiceAmount =
            Number(document.getElementById("transactionInvoice").value);

        const amountPaid =
            Number(document.getElementById("transactionPaid").value);

        const transactionStatus =
            document.getElementById("transactionStatus");

        const transactionDateValue =
            document.getElementById("transactionDate").value;

        message.textContent = "";
        message.className = "message";

        if (!supabaseClient || !currentClinic || !currentUser) {
            message.textContent =
                "Your clinic session is not ready. Please sign in again.";
            message.className = "message error";
            return;
        }

        if (
            !reference ||
            !service ||
            !transactionDateValue ||
            !Number.isFinite(invoiceAmount) ||
            !Number.isFinite(amountPaid) ||
            invoiceAmount <= 0 ||
            amountPaid < 0 ||
            amountPaid > invoiceAmount
        ) {
            message.textContent =
                "Check the reference, service, date, and amounts. " +
                "The amount paid cannot exceed the invoice.";
            message.className = "message error";
            return;
        }

        let paymentStatus = "pending";

        if (amountPaid >= invoiceAmount) {
            paymentStatus = "paid";
        } else if (amountPaid > 0) {
            paymentStatus = "part_paid";
        }

        transactionStatus.value = paymentStatus;

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const { data: existing, error: duplicateError } =
                await supabaseClient
                    .from("billing_transactions")
                    .select("id")
                    .eq("clinic_id", currentClinic.id)
                    .eq("reference", reference)
                    .limit(1);

            if (duplicateError) {
                throw duplicateError;
            }

            if (existing && existing.length > 0) {
                throw new Error(
                    "This transaction reference already exists " +
                    "in this clinic. Please use another reference."
                );
            }

            const { error: insertError } =
                await supabaseClient
                    .from("billing_transactions")
                    .insert({
                        clinic_id: currentClinic.id,
                        reference: reference,
                        service_description: service,
                        invoice_amount: invoiceAmount,
                        amount_paid: amountPaid,
                        currency: "NGN",
                        payment_status: paymentStatus,
                        transaction_date: transactionDateValue,
                        created_by: currentUser.id
                    });

            if (insertError) {
                throw insertError;
            }

            message.textContent =
                "Transaction saved successfully.";
            message.className = "message success";

            transactionForm.reset();

            const today = new Date();

            document.getElementById("transactionDate").value =
                today.getFullYear() + "-" +
                String(today.getMonth() + 1).padStart(2, "0") + "-" +
                String(today.getDate()).padStart(2, "0");

            transactionForm.hidden = true;

            toggleTransactionForm.setAttribute(
                "aria-expanded",
                "false"
            );

            toggleTransactionForm.textContent =
                "+ Record transaction";

            await loadBillingData(currentClinic);

        } catch (error) {
            console.error(
                "HealthOS transaction save failed:",
                error
            );

            message.textContent = friendlyError(error);
            message.className = "message error";

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save transaction";
        }
    });
}
// HEALTHOS AI: LOAD LIVE HOSPITAL DEPARTMENT CATALOGUE
async function loadStaffDepartmentOptions(clinic) {
    const select = document.getElementById("staffDepartment");
    const message = document.getElementById("staffRegistrationMessage");

    if (!select || !clinic || !clinic.id) {
        throw new Error("Department selector or clinic context is unavailable.");
    }

    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Loading hospital departments...";
    select.appendChild(placeholder);
    select.disabled = true;

    const { data, error } = await supabaseClient.rpc(
        "get_clinic_departments",
        { p_clinic_id: clinic.id }
    );

    if (error) {
        select.replaceChildren();
        const failed = document.createElement("option");
        failed.value = "";
        failed.textContent = "Departments could not be loaded";
        select.appendChild(failed);
        if (message) {
            message.textContent = "Could not load the hospital department catalogue. " + friendlyError(error);
            message.className = "message error";
        }
        throw error;
    }

    select.replaceChildren();
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Select department";
    select.appendChild(first);

    const groups = new Map();
    (Array.isArray(data) ? data : []).forEach(function (department) {
        const groupName = department.department_group || "Other departments";
        if (!groups.has(groupName)) {
            const group = document.createElement("optgroup");
            group.label = groupName;
            groups.set(groupName, group);
            select.appendChild(group);
        }

        const option = document.createElement("option");
        option.value = department.department_name;
        option.textContent = department.department_name;
        option.dataset.departmentId = department.id;
        option.dataset.departmentCode = department.department_code;
        groups.get(groupName).appendChild(option);
    });

    if (!Array.isArray(data) || data.length === 0) {
        first.textContent = "No active departments configured";
    }

    select.disabled = false;
    if (message) {
        message.textContent = data.length + " hospital departments loaded.";
        message.className = "message";
    }
}
// END HEALTHOS AI: LOAD LIVE HOSPITAL DEPARTMENT CATALOGUE

// HEALTHOS AI: LOAD PROFESSIONAL ROLES FOR THE SELECTED DEPARTMENT
async function loadStaffProfessionalRoleOptions(clinic, departmentId) {
    const roleSelect = document.getElementById("staffProfessionalRole");
    const registrationInput = document.getElementById("staffRegistrationNumber");
    const message = document.getElementById("staffRegistrationMessage");

    if (!roleSelect || !clinic || !clinic.id || !departmentId) {
        if (roleSelect) {
            roleSelect.replaceChildren();
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Select a department first";
            roleSelect.appendChild(option);
            roleSelect.disabled = true;
        }
        if (registrationInput) {
            registrationInput.required = false;
        }
        return;
    }

    roleSelect.replaceChildren();
    const loading = document.createElement("option");
    loading.value = "";
    loading.textContent = "Loading department roles...";
    roleSelect.appendChild(loading);
    roleSelect.disabled = true;

    const { data, error } = await supabaseClient.rpc(
        "get_clinic_professional_roles",
        {
            p_clinic_id: clinic.id,
            p_department_id: departmentId
        }
    );

    if (error) {
        roleSelect.replaceChildren();
        const failed = document.createElement("option");
        failed.value = "";
        failed.textContent = "Roles could not be loaded";
        roleSelect.appendChild(failed);
        if (message) {
            message.textContent =
                "Could not load professional roles. " + friendlyError(error);
            message.className = "message error";
        }
        throw error;
    }

    roleSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = data && data.length
        ? "Select professional role"
        : "No roles configured for this department";
    roleSelect.appendChild(placeholder);

    (Array.isArray(data) ? data : []).forEach(function (role) {
        const option = document.createElement("option");
        option.value = role.role_code;
        option.textContent = role.role_name;
        option.dataset.roleId = role.id;
        option.dataset.registrationRequired =
            String(Boolean(role.registration_required));
        option.dataset.registrationBody = role.registration_body || "";
        option.dataset.clinicalRole = String(Boolean(role.clinical_role));
        roleSelect.appendChild(option);
    });

    roleSelect.disabled = !Array.isArray(data) || data.length === 0;
    if (registrationInput) {
        registrationInput.required = false;
        registrationInput.placeholder = "Optional, where applicable";
    }
    if (message && Array.isArray(data) && data.length) {
        message.textContent = data.length + " professional role(s) available.";
        message.className = "message";
    }
}

const staffDepartmentRoleSelect =
    document.getElementById("staffDepartment");
const staffProfessionalRoleSelect =
    document.getElementById("staffProfessionalRole");
const staffRegistrationNumberInput =
    document.getElementById("staffRegistrationNumber");

if (staffDepartmentRoleSelect) {
    staffDepartmentRoleSelect.addEventListener("change", async function () {
        const selected = staffDepartmentRoleSelect.selectedOptions[0];
        const departmentId = selected && selected.dataset.departmentId;

        if (staffProfessionalRoleSelect) {
            staffProfessionalRoleSelect.value = "";
        }
        if (staffRegistrationNumberInput) {
            staffRegistrationNumberInput.value = "";
            staffRegistrationNumberInput.required = false;
        }

        try {
            await loadStaffProfessionalRoleOptions(currentClinic, departmentId);
        } catch (error) {
            console.error("Department professional roles failed to load:", error);
        }
    });
}

if (staffProfessionalRoleSelect) {
    staffProfessionalRoleSelect.addEventListener("change", function () {
        const selected = staffProfessionalRoleSelect.selectedOptions[0];
        const registrationRequired =
            selected && selected.dataset.registrationRequired === "true";

        if (staffRegistrationNumberInput) {
            staffRegistrationNumberInput.required = Boolean(registrationRequired);
            staffRegistrationNumberInput.placeholder = registrationRequired
                ? "Required for this professional role"
                : "Optional, where applicable";
        }
    });
}
// END HEALTHOS AI: LOAD PROFESSIONAL ROLES FOR THE SELECTED DEPARTMENT


// HEALTHOS AI: CONNECT STAFF REGISTRATION FORM
const staffRegistrationForm =
    document.getElementById("staffRegistrationForm");

if (staffRegistrationForm) {
    staffRegistrationForm.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const message = document.getElementById(
                "staffRegistrationMessage"
            );

            const submitButton = document.getElementById(
                "staffRegistrationSubmit"
            );

            if (
                !currentUser ||
                !currentClinic ||
                !managementVerified
            ) {
                message.textContent =
                    "Please sign in and verify administrator access first.";

                message.className = "message error";
                return;
            }

            const email = document.getElementById(
                "staffEmail"
            ).value.trim();
            const initialPassword = document.getElementById(
                "staffInitialPassword"
            ).value;
            const fullName = document.getElementById(
                "staffFullName"
            ).value.trim();

            const staffId = document.getElementById(
                "staffEmployeeId"
            ).value.trim();

            const department = document.getElementById(
                "staffDepartment"
            ).value;

            const professionalRole = document.getElementById(
                "staffProfessionalRole"
            ).value;

            const registrationNumber = document.getElementById(
                "staffRegistrationNumber"
            ).value.trim();

            submitButton.disabled = true;
            submitButton.textContent = "Registering...";

            message.textContent =
                "Checking permissions and sending staff invitation...";

            message.className = "message";

                          try {
                const { data, error } =
                    await supabaseClient.functions.invoke(
                        "register-staff",
                        {
                            body: {
                                clinic_id: currentClinic.id,
                                email: email,
                                                                initial_password: initialPassword,
                                full_name: fullName,
                                staff_id: staffId,
                                department: department,
                                professional_role: professionalRole,
                                professional_registration_number:
                                    registrationNumber
                            }
                        }
                    );        

                if (error) {
                    throw error;
                }

                if (data && data.error) {
                    throw new Error(data.error);
                }

                message.textContent =
                    data.message ||
                    "Staff invitation submitted successfully.";

                message.className = "message success";

                staffRegistrationForm.reset();

            } catch (error) {
                console.error(
                    "HealthOS staff registration failed:",
                    error
                );

                let errorMessage =
                    error.message ||
                    "Staff registration failed. Please try again.";

                if (
                    error.context &&
                    typeof error.context.json === "function"
                ) {
                    try {
                        const responseBody =
                            await error.context.json();

                        errorMessage =
                            responseBody.error ||
                            responseBody.message ||
                            errorMessage;
                    } catch (parseError) {
                        console.warn(
                            "Could not read registration error:",
                            parseError
                        );
                    }
                }

                message.textContent = errorMessage;
                message.className = "message error";

            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Register Staff";
            }
        }
    );
}
// END HEALTHOS AI: CONNECT STAFF REGISTRATION FORM
// HEALTHOS AI: OPEN AND CLOSE STAFF REGISTRATION

const openStaffRegistrationButton =
    document.getElementById("openStaffRegistrationButton");

const staffRegistrationPanel =
    document.getElementById("staffRegistrationPanel");

if (openStaffRegistrationButton) {
    openStaffRegistrationButton.addEventListener("click", async function () {
        if (
            !currentUser ||
            !currentClinic ||
            !managementVerified
        ) {
            showDashboardMessage(
                "Please verify administrator access before registering staff.",
                "error"
            );
            return;
        }

        showOnly("staffRegistration");

        try {
            await loadStaffDepartmentOptions(currentClinic);
        } catch (error) {
            console.error("Department catalogue loading failed:", error);
        }

        const staffEmail = document.getElementById("staffEmail");

        if (staffEmail) {
            staffEmail.focus();
        }
    });
}

if (staffRegistrationPanel) {
    const backToDashboardButton = document.createElement("button");

    backToDashboardButton.type = "button";
    backToDashboardButton.className = "text-button";
    backToDashboardButton.textContent = "← Back to Dashboard";
    backToDashboardButton.id = "backToDashboardFromStaffRegistration";

    staffRegistrationPanel.insertBefore(
        backToDashboardButton,
        staffRegistrationPanel.firstChild
    );

    backToDashboardButton.addEventListener("click", function () {
        showOnly("dashboard");
        showHealthOSView("dashboard");
    });
}

// END HEALTHOS AI: OPEN AND CLOSE STAFF REGISTRATION
// Connect to Supabase.
async function checkConnection() {
            const recoveryUrl = new URL(window.location.href);

    const isPasswordRecoveryRedirect =
        recoveryUrl.searchParams.get("type") === "recovery" ||
        recoveryUrl.hash.includes("type=recovery");
    try {
        if (
            !window.supabase ||
            typeof window.supabase.createClient !== "function"
        ) {
            throw new Error(
                "The Supabase library did not load. Refresh the page."
            );
        }

        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );
            // HEALTHOS AI: HANDLE PASSWORD RECOVERY
        supabaseClient.auth.onAuthStateChange(function (event, session) {
            if (event === "PASSWORD_RECOVERY") {
                window.healthOSPasswordRecoveryActive = true;

                showOnly("passwordRecovery");

                const recoveryMessage =
                    document.getElementById("passwordRecoveryMessage");

                if (recoveryMessage) {
                    recoveryMessage.textContent =
                        "Choose a new password for your account.";
                    recoveryMessage.className = "message";
                }

                return;
            }

            if (
                window.healthOSPasswordRecoveryActive &&
                session
            ) {
                showOnly("passwordRecovery");
            }
        });
                connectionStatus.textContent =
            "Connected to account service";

        connectionStatus.classList.remove("error");
        connectionStatus.classList.add("success");

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }
        // Keep password recovery separate from normal workspace login.
        if (isPasswordRecoveryRedirect && data.session && data.session.user) {
            showOnly("passwordRecovery");

            const recoveryMessage =
                document.getElementById("passwordRecoveryMessage");

            if (recoveryMessage) {
                recoveryMessage.textContent =
                    "Choose a new password for your account.";
                recoveryMessage.className = "message";
            }

            return;
        }
        if (data.session && data.session.user) {
            // Activate pending invitations after an email-link
            // redirect restores the user's session.
            try {
                const {
                    error: activationError
                } = await supabaseClient.functions.invoke(
                    "activate-staff-invitation",
                    {
                        body: {}
                    }
                );

                if (activationError) {
                    console.error(
                        "Staff invitation activation after session restore failed:",
                        activationError
                    );
                }
            } catch (activationError) {
                console.error(
                    "Staff invitation activation after session restore failed:",
                    activationError
                );
            }

            // Continue with normal membership and staff-profile checks.
            await openWorkspace(data.session.user);
        } else {
            currentUser = null;
            showOnly("auth");
        }
    } catch (error) {
        console.error(
            "HealthOS connection check failed:",
            error
        );

        connectionStatus.textContent =
            "Connection check failed. Refresh the page or check your internet connection.";
        connectionStatus.classList.remove("success");
        connectionStatus.classList.add("error");

        showOnly("auth");
        showAuthMessage(friendlyError(error), "error");
    }
}

// Switch between sign-in and account creation.
// HEALTHOS AI: PASSWORD VISIBILITY TOGGLES
document.querySelectorAll(".password-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
        const targetId = button.dataset.passwordTarget;
        const input = document.getElementById(targetId);

        if (!input) return;

        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";
        button.textContent = showPassword ? "Hide" : "Show";
        button.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
        button.setAttribute("aria-pressed", String(showPassword));
    });
});
authModeToggle.addEventListener("click", function () {
    setMode(!isSignUpMode);
});
// HEALTHOS AI: SEND PASSWORD RESET EMAIL
const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", async function () {
        const email = emailInput.value.trim();

        if (!email) {
            showAuthMessage(
                "Enter your email address first, then select Forgot password again.",
                "error"
            );
            emailInput.focus();
            return;
        }

        if (!supabaseClient) {
            showAuthMessage(
                "The account service is not ready. Refresh the page and try again.",
                "error"
            );
            return;
        }

        forgotPasswordButton.disabled = true;
        forgotPasswordButton.textContent = "Sending reset email...";

        try {
                        const { error } =
                await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + "/?type=recovery"
                });


            if (error) {
                throw error;
            }

            showAuthMessage(
                "If an account exists for this email, a password-reset email has been requested. Check your inbox and spam folder.",
                "success"
            );
        } catch (error) {
            console.error("Password reset request failed:", error);

            showAuthMessage(
                friendlyError(error),
                "error"
            );
        } finally {
            forgotPasswordButton.disabled = false;
            forgotPasswordButton.textContent = "Forgot password?";
        }
    });
}
// HEALTHOS AI: SAVE RECOVERED PASSWORD
const passwordRecoveryForm =
    document.getElementById("passwordRecoveryForm");

const passwordRecoveryMessage =
    document.getElementById("passwordRecoveryMessage");

const passwordRecoveryCancel =
    document.getElementById("passwordRecoveryCancel");

if (passwordRecoveryForm) {
    passwordRecoveryForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmNewPassword =
            document.getElementById("confirmNewPassword").value;

        if (newPassword.length < 8) {
            passwordRecoveryMessage.textContent =
                "Your password must contain at least 8 characters.";
            passwordRecoveryMessage.className = "message error";
            return;
        }

        if (newPassword !== confirmNewPassword) {
            passwordRecoveryMessage.textContent =
                "The passwords do not match. Please try again.";
            passwordRecoveryMessage.className = "message error";
            return;
        }

        if (!supabaseClient) {
            passwordRecoveryMessage.textContent =
                "The account service is unavailable. Refresh and try again.";
            passwordRecoveryMessage.className = "message error";
            return;
        }

        const submitButton =
            document.getElementById("passwordRecoverySubmit");

        submitButton.disabled = true;
        submitButton.textContent = "Saving password...";

        try {
            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            passwordRecoveryMessage.textContent =
                "Your password has been changed successfully. You can now sign in with your new password.";
            passwordRecoveryMessage.className = "message success";

            passwordRecoveryForm.reset();
            await supabaseClient.auth.signOut();
            currentUser = null;
            showOnly("auth");

            showAuthMessage(
                "Password changed successfully. Please sign in with your new password.",
                "success"
            );
        } catch (error) {
            console.error("Password update failed:", error);

            passwordRecoveryMessage.textContent =
                friendlyError(error);
            passwordRecoveryMessage.className = "message error";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Save new password";
        }
    });
}

if (passwordRecoveryCancel) {
    passwordRecoveryCancel.addEventListener("click", function () {
        passwordRecoveryForm.reset();
        showOnly("auth");
    });
}
// Handle account creation and sign-in.
authForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!supabaseClient) {
        showAuthMessage(
            "The account service is not ready. Refresh the page.",
            "error"
        );
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    authSubmit.disabled = true;

    authSubmit.textContent = isSignUpMode
        ? "Creating account..."
        : "Signing in...";

    try {
        if (isSignUpMode) {
            const fullName = fullNameInput.value.trim();

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName
                        },
                        emailRedirectTo: window.location.origin
                    }
                });

            if (error) {
                throw error;
            }

            if (data.session && data.user) {
                showAuthMessage(
                    "Account created successfully. Opening your clinic setup...",
                    "success"
                );

                await openWorkspace(data.user);
            } else {
                showAuthMessage(
                    "Account request received. Check your email to confirm your account, then return here and sign in.",
                    "success"
                );
            }
        } else {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                throw error;
            }

                        // Attempt to activate a pending staff invitation.
            // A temporary function failure must not block existing users.
            // Workspace access checks must still run before access is granted.
            try {
                const {
                    data: activationData,
                    error: activationError
                } = await supabaseClient.functions.invoke(
                    "activate-staff-invitation",
                    {
                        body: {}
                    }
                );

                if (activationError) {
                    console.error(
                        "Staff invitation activation failed:",
                        activationError
                    );
                } else if (
                    activationData &&
                    activationData.activated === 0 &&
                    activationData.error
                ) {
                    console.warn(
                        "Staff invitation was not activated:",
                        activationData.error
                    );
                }
            } catch (activationError) {
                console.error(
                    "Staff invitation activation request failed:",
                    activationError
                );
            }

            // Continue to the normal workspace access checks.
            await openWorkspace(data.user);
        }
    } catch (error) {
        showOnly("auth");
        showAuthMessage(friendlyError(error), "error");
    } finally {
        authSubmit.disabled = false;

        authSubmit.textContent = isSignUpMode
            ? "Create account"
            : "Sign in";
    }
});

// Create a clinic workspace.
clinicForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!supabaseClient || !currentUser) {
        showClinicMessage(
            "Please sign in before creating a clinic workspace.",
            "error"
        );

        showOnly("auth");
        return;
    }

    const clinicName = clinicNameInput.value.trim();

    if (!clinicName) {
        showClinicMessage(
            "Please enter your clinic name.",
            "error"
        );
        return;
    }

    const submitButton = clinicForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "Creating workspace...";

    showClinicMessage("Creating your clinic workspace...");

    try {
        // Create the clinic.
        const { data: clinic, error: clinicError } =
            await supabaseClient
                .from("clinics")
                .insert({
                    name: clinicName,
                    owner_user_id: currentUser.id
                })
                .select("id, name")
                .single();

        if (clinicError) {
            throw clinicError;
        }

        // Add the signed-in user as the clinic owner.
        const { error: membershipError } =
            await supabaseClient
                .from("clinic_memberships")
                .insert({
                    clinic_id: clinic.id,
                    user_id: currentUser.id,
                    role: "owner",
                    status: "active"
                });

        if (membershipError) {
            throw new Error(
                "The clinic was created, but its owner membership could not be saved. " +
                friendlyError(membershipError)
            );
        }

        showDashboard(clinic);
    } catch (error) {
        showOnly("clinic");
        showClinicMessage(friendlyError(error), "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Create clinic workspace";
    }
});

// Sign out.
logoutButton.addEventListener("click", async function () {
    if (!supabaseClient) {
        return;
    }

    logoutButton.disabled = true;

    try {
        
// HEALTHOS AI: RECORD STAFF SIGN-OUT
const activeStaffPresence =
    window.healthOSActiveStaffPresence;


if (window.healthOSPresenceHeartbeat) {
    clearInterval(window.healthOSPresenceHeartbeat);
    window.healthOSPresenceHeartbeat = null;
}

if (activeStaffPresence && currentUser) {
    const signOutTime = new Date().toISOString();

    const { error: presenceSignOutError } =
        await supabaseClient
            .from("staff_presence")
            .update({
                presence_status: "offline",
                last_sign_out_at: signOutTime,
                last_seen_at: signOutTime,
                updated_at: signOutTime
            })
            .eq(
                "staff_profile_id",
                activeStaffPresence.staffProfileId
            )
            .eq(
                "clinic_id",
                activeStaffPresence.clinicId
            );

    if (presenceSignOutError) {
        console.error(
            "Staff sign-out time could not be recorded:",
            presenceSignOutError
        );
    }

    window.healthOSActiveStaffPresence = null;
}
        // END HEALTHOS AI: RECORD STAFF SIGN-OUT

const { error } =
    await supabaseClient.auth.signOut();

if (error) {
    throw error;
}
// END HEALTHOS AI: RECORD STAFF SIGN-OUT
        if (error) {
            throw error;
        }

        currentUser = null;
        managementVerified = false;
       
        currentUserLabel.textContent =
            "Secure healthcare workspace";

        showOnly("auth");
        setMode(false);

        showAuthMessage(
            "You have signed out successfully.",
            "success"
        );
    } catch (error) {
        showDashboardMessage(friendlyError(error), "error");
    } finally {
        logoutButton.disabled = false;
    }
});

// Start HealthOS.
setMode(false);
showOnly("auth");
checkConnection();
// ============================================================
// HEALTHOS AI: SERVICE CAPTURE AND REVENUE PROTECTION
// ============================================================

function serviceCaptureMessage(elementId, message, type = "") {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;
    element.className = "message" + (type ? " " + type : "");
}

function serviceCaptureMoney(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

function serviceCaptureReady() {
    if (!supabaseClient || !currentUser || !currentClinic) {
        throw new Error(
            "Your clinic session is not ready. Please sign in again."
        );
    }
}

// ============================================================
// HEALTHOS AI: PATIENT REGISTRATION
// ============================================================

const patientForm = document.getElementById("patientForm");

if (patientForm) {
    patientForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const button = document.getElementById(
            "registerPatientButton"
        );

        const message = document.getElementById(
            "patientFormMessage"
        );

        const firstName = document.getElementById(
            "patientFirstName"
        ).value.trim();

        const lastName = document.getElementById(
            "patientLastName"
        ).value.trim();

        const dateOfBirth = document.getElementById(
            "patientDateOfBirth"
        ).value;

        const sex = document.getElementById(
            "patientSex"
        ).value;

        const phone = document.getElementById(
            "patientPhone"
        ).value.trim();

        const email = document.getElementById(
            "patientEmail"
        ).value.trim();

        message.textContent = "";
        message.className = "message";

        try {
            serviceCaptureReady();

            if (!firstName || !lastName) {
                throw new Error(
                    "Enter the patient's first and last names."
                );
            }

            if (firstName.length > 100 || lastName.length > 100) {
                throw new Error(
                    "Names must not exceed 100 characters."
                );
            }

            if (dateOfBirth) {
                const birthDate = new Date(
                    dateOfBirth + "T00:00:00"
                );

                if (
                    Number.isNaN(birthDate.getTime()) ||
                    birthDate > new Date()
                ) {
                    throw new Error(
                        "Enter a valid date of birth that is not in the future."
                    );
                }
            }

            button.disabled = true;
            button.textContent = "Registering...";

            const patientRecord = {
    clinic_id: currentClinic.id,
    patient_number: "PAT-" + crypto.randomUUID(),
    first_name: firstName,
    last_name: lastName,
    date_of_birth: dateOfBirth || null,
    sex: sex || null,
    phone: phone || null,
    email: email || null,
    created_by: currentUser.id
};

            const { data, error } = await supabaseClient
                .from("patients")
                .insert(patientRecord)
                .select("id, first_name, last_name")
                .single();

            if (error) {
                throw error;
            }

            patientForm.reset();

            message.textContent =
                "Patient registered successfully. Record ID: " +
                data.id;

            message.className = "message success";

        } catch (error) {
            console.error(
                "Patient registration error:",
                error
            );

            message.textContent = friendlyError(error);
            message.className = "message error";

        } finally {
            button.disabled = false;
            button.textContent = "Register Patient";
        }
    });
}
// LOAD REGISTERED SERVICES
// ------------------------------------------------------------

async function loadServiceCatalogue() {
    const select = document.getElementById("performedService");

    if (!select) return;

    try {
        serviceCaptureReady();

        const { data, error } = await supabaseClient
            .from("service_catalogue")
            .select("id, service_code, service_name, default_price")
            .eq("clinic_id", currentClinic.id)
            .eq("is_active", true)
            .order("service_name");

        if (error) throw error;

        select.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a service";
        select.appendChild(placeholder);

        (data || []).forEach(service => {
            const option = document.createElement("option");

            option.value = service.id;
            option.textContent =
                service.service_name + " — " +
                serviceCaptureMoney(service.default_price);

            select.appendChild(option);
        });

        if (!data || data.length === 0) {
            placeholder.textContent = "Register a service first";
        }

    } catch (error) {
        console.error("Service catalogue error:", error);

        serviceCaptureMessage(
            "serviceCatalogueMessage",
            friendlyError(error),
            "error"
        );
    }
}

// ------------------------------------------------------------
// REGISTER A SERVICE
// ------------------------------------------------------------

const serviceCatalogueForm =
    document.getElementById("serviceCatalogueForm");

if (serviceCatalogueForm) {
    serviceCatalogueForm.addEventListener("submit", async event => {
        event.preventDefault();

        const button = document.getElementById("saveServiceButton");

        const code = document.getElementById("serviceCode")
            .value.trim();

        const name = document.getElementById("serviceName")
            .value.trim();

        const price = Number(
            document.getElementById("servicePrice").value
        );

        serviceCaptureMessage("serviceCatalogueMessage", "");

        try {
            serviceCaptureReady();

            if (!code || !name || !Number.isFinite(price) || price < 0) {
                throw new Error(
                    "Enter a valid service code, name and price."
                );
            }

            button.disabled = true;
            button.textContent = "Saving...";

            const { data: existing, error: lookupError } =
                await supabaseClient
                    .from("service_catalogue")
                    .select("id")
                    .eq("clinic_id", currentClinic.id)
                    .eq("service_code", code)
                    .limit(1);

            if (lookupError) throw lookupError;

            if (existing && existing.length > 0) {
                throw new Error(
                    "This service code already exists."
                );
            }

            const { error } = await supabaseClient
                .from("service_catalogue")
                .insert({
                    clinic_id: currentClinic.id,
                    service_code: code,
                    service_name: name,
                    default_price: price,
                    currency: "NGN",
                    is_active: true,
                    created_by: currentUser.id
                });

            if (error) throw error;

            serviceCatalogueForm.reset();

            serviceCaptureMessage(
                "serviceCatalogueMessage",
                "Service registered successfully.",
                "success"
            );

            await loadServiceCatalogue();

        } catch (error) {
            console.error("Register service error:", error);

            serviceCaptureMessage(
                "serviceCatalogueMessage",
                friendlyError(error),
                "error"
            );

        } finally {
            button.disabled = false;
            button.textContent = "Save Service";
        }
    });
}

// ------------------------------------------------------------
// RECORD A PERFORMED SERVICE
// ------------------------------------------------------------

const serviceEventForm =
    document.getElementById("serviceEventForm");

if (serviceEventForm) {
    serviceEventForm.addEventListener("submit", async event => {
        event.preventDefault();

        const button = document.getElementById("recordServiceButton");

        const serviceId =
            document.getElementById("performedService").value;

        const quantity = Number(
            document.getElementById("performedQuantity").value
        );

        const notes = document.getElementById("performedNotes")
            .value.trim();

        serviceCaptureMessage("serviceEventMessage", "");

        try {
            serviceCaptureReady();

            if (
                !serviceId ||
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > 1000
            ) {
                throw new Error(
                    "Select a service and enter a valid quantity."
                );
            }

            button.disabled = true;
            button.textContent = "Recording...";

            const { data: service, error: serviceError } =
                await supabaseClient
                    .from("service_catalogue")
                    .select(
                        "id, service_code, service_name, default_price"
                    )
                    .eq("id", serviceId)
                    .eq("clinic_id", currentClinic.id)
                    .eq("is_active", true)
                    .single();

            if (serviceError) throw serviceError;

            const { error } = await supabaseClient
                .from("service_events")
                .insert({
                    clinic_id: currentClinic.id,
                    service_catalogue_id: service.id,
                    service_code_snapshot: service.service_code,
                    service_name_snapshot: service.service_name,
                    unit_price: Number(service.default_price),
                    quantity: quantity,
                    currency: "NGN",
                    event_status: "performed",
                    performed_at: new Date().toISOString(),
                    recorded_by: currentUser.id,
                    notes: notes || null
                });

            if (error) throw error;

            serviceEventForm.reset();

            document.getElementById("performedQuantity").value = "1";

            serviceCaptureMessage(
                "serviceEventMessage",
                "Service recorded. Billing review will now check for a linked transaction.",
                "success"
            );

            await loadServiceAudit();

        } catch (error) {
            console.error("Record service error:", error);

            serviceCaptureMessage(
                "serviceEventMessage",
                friendlyError(error),
                "error"
            );

        } finally {
            button.disabled = false;
            button.textContent = "Record Service";
        }
    });
}

// ------------------------------------------------------------
// REVIEW SERVICES WITHOUT LINKED BILLING TRANSACTIONS
// ------------------------------------------------------------

async function loadServiceAudit() {
    const table = document.getElementById("serviceAuditBody");

    if (!table) return;

    table.replaceChildren();

    try {
        serviceCaptureReady();

        const { data: services, error: serviceError } =
            await supabaseClient
                .from("service_events")
                .select(
                    "id, service_name_snapshot, quantity, unit_price, event_status, billing_transaction_id, performed_at, created_at"
                )
                .eq("clinic_id", currentClinic.id)
                .in("event_status", ["performed", "verified"])
                .order("created_at", { ascending: false })
                .limit(500);

        if (serviceError) throw serviceError;

        const candidates = (services || []).filter(
            record => !record.billing_transaction_id
        );

        if (candidates.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.textContent = "No unlinked services found.";

            row.appendChild(cell);
            table.appendChild(row);

            serviceCaptureMessage(
                "serviceAuditMessage",
                "Review complete.",
                "success"
            );

            return;
        }

        const { data: findings, error: findingsError } =
            await supabaseClient
                .from("revenue_audit_findings")
                .select(
                    "id, service_event_id, finding_type, status, reviewed_by, reviewed_at, resolved_at, detected_at"
                )
                .eq("clinic_id", currentClinic.id)
                .eq("finding_type", "missing_charge")
                .order("detected_at", { ascending: false });

        if (findingsError) throw findingsError;

        const findingsByService = new Map();

        // A service may have older closed findings from before duplicate
        // prevention was added. Display only its most recently reviewed
        // finding, so one service never appears with conflicting statuses.
        const orderedFindings = [...(findings || [])].sort((a, b) => {
            const aTime = new Date(a.reviewed_at || a.detected_at || 0).getTime();
            const bTime = new Date(b.reviewed_at || b.detected_at || 0).getTime();
            return bTime - aTime;
        });

        orderedFindings.forEach(finding => {
            if (finding.service_event_id &&
                !findingsByService.has(finding.service_event_id)) {
                findingsByService.set(finding.service_event_id, finding);
            }
        });

        const statusLabels = {
            open: "Open - Needs review",
            investigating: "Under investigation",
            resolved: "Resolved",
            dismissed: "Dismissed"
        };

        const { data: userResult, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        const reviewerId = userResult?.user?.id;

        if (!reviewerId) {
            throw new Error(
                "Unable to identify the signed-in reviewer."
            );
        }

        async function updateFinding(findingId, action) {
    const allowedActions = [
        "investigating",
        "resolved",
        "dismissed"
    ];

    if (!allowedActions.includes(action)) {
        throw new Error("Invalid review action.");
    }

    const { data, error } = await supabaseClient.rpc(
        "review_revenue_audit_finding",
        {
            p_finding_id: findingId,
            p_new_status: action,
            p_notes: null
        }
    );

    if (error) throw error;

    if (!data || data.success !== true) {
        throw new Error(
            "The database did not confirm the review action."
        );
    }

    await loadServiceAudit();

    serviceCaptureMessage(
        "serviceAuditMessage",
        "Audit finding successfully updated and history recorded.",
        "success"
    );
}

        candidates.forEach(record => {
            const row = document.createElement("tr");

            const finding = findingsByService.get(record.id);

            const displayedStatus = finding
                ? (
                    statusLabels[finding.status] ||
                    finding.status
                )
                : "Finding not recorded";

            const values = [
                record.service_name_snapshot || "Unknown service",
                String(record.quantity),
                serviceCaptureMoney(
                    Number(record.unit_price) *
                    Number(record.quantity)
                ),
                record.performed_at
                    ? new Date(record.performed_at).toLocaleString("en-NG")
                    : new Date(record.created_at).toLocaleString("en-NG"),
                displayedStatus
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            if (
                finding &&
                ["open", "investigating"].includes(finding.status)
            ) {
                const actions = [
                    {
                        label: "Investigate",
                        status: "investigating"
                    },
                    {
                        label: "Resolve",
                        status: "resolved"
                    },
                    {
                        label: "Dismiss",
                        status: "dismissed"
                    }
                ];

                actions.forEach(action => {
                    const button =
                        document.createElement("button");

                    button.type = "button";
                    button.textContent = action.label;

                    button.addEventListener("click", async () => {
                        if (
                            !window.confirm(
                                "Confirm action: " +
                                action.label + "?"
                            )
                        ) {
                            return;
                        }

                        const buttons =
                            actionCell.querySelectorAll("button");

                        buttons.forEach(item => {
                            item.disabled = true;
                        });

                        try {
                            await updateFinding(
                                finding.id,
                                action.status
                            );
                        } catch (error) {
                            console.error(
                                "Audit review action failed:",
                                error
                            );

                            serviceCaptureMessage(
                                "serviceAuditMessage",
                                friendlyError(error),
                                "error"
                            );

                            buttons.forEach(item => {
                                item.disabled = false;
                            });
                        }
                    });

                    actionCell.appendChild(button);
                });
            } else {
                actionCell.textContent = finding
                    ? "Review completed"
                    : "No finding available";
            }

            row.appendChild(actionCell);
            table.appendChild(row);
        });

        serviceCaptureMessage(
            "serviceAuditMessage",
            candidates.length +
                " unlinked service(s) checked against saved audit findings.",
            "success"
        );

    } catch (error) {
        console.error("Service billing review error:", error);

        serviceCaptureMessage(
            "serviceAuditMessage",
            friendlyError(error),
            "error"
        );
    }
            }
// ------------------------------------------------------------
// REFRESH REVIEW
// ------------------------------------------------------------

const refreshServiceAuditButton =
    document.getElementById("refreshServiceAudit")

if (refreshServiceAuditButton) {
    refreshServiceAuditButton.addEventListener("click", async () => {
        refreshServiceAuditButton.disabled = true;
        refreshServiceAuditButton.textContent = "Checking billing links...";

        try {
            serviceCaptureReady();

            const { data: auditResult, error: auditError } =
                await supabaseClient.rpc(
                    "detect_unlinked_performed_services",
                    { p_clinic_id: currentClinic.id }
                );

            if (auditError) {
                throw auditError;
            }

            await loadServiceAudit();
            await loadBillingData(currentClinic);

            const candidateCount =
                Number(auditResult?.unlinked_service_candidates || 0);

            const createdCount =
                Number(auditResult?.new_findings_created || 0);

            serviceCaptureMessage(
                "serviceAuditMessage",
                candidateCount +
                    " unlinked service candidate(s) checked; " +
                    createdCount +
                    " new finding(s) created. Review each candidate before taking action.",
                "success"
            );
        } catch (error) {
            console.error(
                "Revenue discrepancy detector failed:",
                error
            );

            serviceCaptureMessage(
                "serviceAuditMessage",
                friendlyError(error),
                "error"
            );
        } finally {
            refreshServiceAuditButton.disabled = false;
            refreshServiceAuditButton.textContent =
                "Refresh Billing Review";
        }
    });
}

// ------------------------------------------------------------
// LOAD SERVICE MODULE WHEN THE DASHBOARD OPENS
// ------------------------------------------------------------
async function loadServiceCaptureModule() {
    if (!currentUser || !currentClinic || !supabaseClient) return;

    await Promise.all([
        loadServiceCatalogue(),
        loadServiceAudit(),
        loadAppointmentPatients()
    ]);

    await loadAppointments();
}
// ============================================================
// HEALTHOS AI: APPOINTMENTS MODULE
// ============================================================

const appointmentForm = document.getElementById("appointmentForm");
const appointmentPatientSelect = document.getElementById("appointmentPatient");
const appointmentDateTime = document.getElementById("appointmentDateTime");
const appointmentReason = document.getElementById("appointmentReason");
const appointmentNotes = document.getElementById("appointmentNotes");
const appointmentMessage = document.getElementById("appointmentMessage");
const appointmentsBody = document.getElementById("appointmentsBody");
const saveAppointmentButton = document.getElementById("saveAppointmentButton");
const refreshAppointmentsButton = document.getElementById("refreshAppointmentsButton");

const appointmentPatientNames = new Map();

function showAppointmentMessage(message, type = "") {
    if (!appointmentMessage) return;

    appointmentMessage.textContent = message;
    appointmentMessage.className =
        "message" + (type ? " " + type : "");
}

async function loadAppointmentPatients() {
    if (!appointmentPatientSelect) return;

    try {
        serviceCaptureReady();

        const { data, error } = await supabaseClient
            .from("patients")
            .select("id, first_name, last_name")
            .eq("clinic_id", currentClinic.id)
            .order("first_name");

        if (error) throw error;

        appointmentPatientNames.clear();
        appointmentPatientSelect.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a registered patient";
        appointmentPatientSelect.appendChild(placeholder);

        (data || []).forEach(patient => {
            const fullName =
                patient.first_name + " " + patient.last_name;

            appointmentPatientNames.set(patient.id, fullName);

            const option = document.createElement("option");
            option.value = patient.id;
            option.textContent = fullName;

            appointmentPatientSelect.appendChild(option);
        });

        if (!data || data.length === 0) {
            showAppointmentMessage(
                "No registered patients were found for this clinic. Register a patient first.",
                "error"
            );
        }
    } catch (error) {
        console.error("Appointment patient loading error:", error);

        appointmentPatientNames.clear();
        appointmentPatientSelect.replaceChildren();

        const errorOption = document.createElement("option");
        errorOption.value = "";
        errorOption.textContent =
            "Could not load patients — try Refresh";

        appointmentPatientSelect.appendChild(errorOption);

        showAppointmentMessage(
            "Patient loading failed: " + friendlyError(error),
            "error"
        );
    }
}

async function loadAppointments() {
    if (!appointmentsBody) return;

    try {
        serviceCaptureReady();

        appointmentsBody.replaceChildren();

        const loadingRow = document.createElement("tr");
        const loadingCell = document.createElement("td");

        loadingCell.colSpan = 4;
        loadingCell.textContent = "Loading appointments...";

        loadingRow.appendChild(loadingCell);
        appointmentsBody.appendChild(loadingRow);

        const { data, error } = await supabaseClient
            .from("appointments")
            .select("id, patient_id, scheduled_at, reason, status")
            .eq("clinic_id", currentClinic.id)
            .order("scheduled_at", { ascending: true })
            .limit(200);

        if (error) throw error;

        appointmentsBody.replaceChildren();

        if (!data || data.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 4;
            cell.textContent = "No appointments have been scheduled yet.";

            row.appendChild(cell);
            appointmentsBody.appendChild(row);
            return;
        }

        data.forEach(appointment => {
            const row = document.createElement("tr");

            const patientCell = document.createElement("td");
            patientCell.textContent =
                appointmentPatientNames.get(appointment.patient_id) ||
                "Registered patient";

            const dateCell = document.createElement("td");
            const date = new Date(appointment.scheduled_at);

            dateCell.textContent = Number.isNaN(date.getTime())
                ? "Invalid date"
                : date.toLocaleString();

            const reasonCell = document.createElement("td");
            reasonCell.textContent = appointment.reason || "Not specified";

            const statusCell = document.createElement("td");
            statusCell.textContent = appointment.status;

            row.append(
                patientCell,
                dateCell,
                reasonCell,
                statusCell
            );

            appointmentsBody.appendChild(row);
        });
    } catch (error) {
        console.error("Appointment loading error:", error);

        appointmentsBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent =
            "Could not load appointments. Please refresh and try again.";

        row.appendChild(cell);
        appointmentsBody.appendChild(row);

        showAppointmentMessage(
            friendlyError(error),
            "error"
        );
    }
}

if (appointmentForm) {
    appointmentForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        try {
            serviceCaptureReady();

            const patientId = appointmentPatientSelect.value;
            const scheduledValue = appointmentDateTime.value;
            const reason = appointmentReason.value.trim();
            const notes = appointmentNotes.value.trim();

            if (!patientId) {
                throw new Error("Select a registered patient.");
            }

            if (!scheduledValue) {
                throw new Error("Choose an appointment date and time.");
            }

            const scheduledDate = new Date(scheduledValue);

            if (Number.isNaN(scheduledDate.getTime())) {
                throw new Error("Enter a valid appointment date and time.");
            }

            if (!reason) {
                throw new Error("Enter the reason for the visit.");
            }

            if (!appointmentPatientNames.has(patientId)) {
                throw new Error(
                    "Select a valid patient from this clinic."
                );
            }

            saveAppointmentButton.disabled = true;
            saveAppointmentButton.textContent = "Saving appointment...";

            showAppointmentMessage("Saving appointment...");

            const appointmentRecord = {
                clinic_id: currentClinic.id,
                patient_id: patientId,
                scheduled_at: scheduledDate.toISOString(),
                reason: reason,
                notes: notes || null,
                status: "scheduled",
                created_by: currentUser.id
            };

            const { error } = await supabaseClient
                .from("appointments")
                .insert(appointmentRecord);

            if (error) throw error;

            appointmentForm.reset();

            showAppointmentMessage(
                "Appointment saved successfully.",
                "success"
            );

            await loadAppointments();

        } catch (error) {
            console.error("Appointment saving error:", error);

            showAppointmentMessage(
                friendlyError(error),
                "error"
            );
        } finally {
            if (saveAppointmentButton) {
                saveAppointmentButton.disabled = false;
                saveAppointmentButton.textContent =
                    "Schedule Appointment";
            }
        }
    });
}

if (refreshAppointmentsButton) {
    refreshAppointmentsButton.addEventListener("click", async function() {
        refreshAppointmentsButton.disabled = true;

        try {
            await loadAppointmentPatients();
            await loadAppointments();
        } finally {
            refreshAppointmentsButton.disabled = false;
        }
    });
}

// END HEALTHOS AI APPOINTMENTS MODULE

// ============================================================
// END SERVICE CAPTURE MODULE
// ============================================================
// ============================================================
// HEALTHOS AI STAFF ASSISTANT
// Department-aware knowledge guide and workspace navigator.
(function initializeHealthOSStaffAssistant() {
 const $=id=>document.getElementById(id),form=$("staffAssistantForm"),input=$("staffAssistantInput"),response=$("staffAssistantResponse"),title=$("staffAssistantResponseTitle"),body=$("staffAssistantResponseText"),action=$("staffAssistantActionButton"),panel=$("staffAssistant"),launcher=$("staffAssistantLauncher");
 if(!form||!input||!response||!title||!body||!action)return;
 let pendingSection=null,staffContext=null,lastConversation={topic:"",answer:"",article:null,turns:0};
 const routes=[
 {owner:"Reception / Patient Access",aliases:["reception","front desk","patient access","admissions","medical records"],section:"patients",terms:["register patient","new patient","patient registration","patient demographics","patient file","patient details"],guide:"Open Patient Management and complete the required patient registration fields. Check for an existing patient before creating a duplicate record. Save only after confirming the details."},
 {owner:"Reception / Appointment Desk",aliases:["reception","front desk","appointment","patient access"],section:"appointments",terms:["appointment","schedule","booking","reschedule","appointment list","cancel appointment"],guide:"Open Appointments. Select the correct patient, date and time, enter the reason, then save. Confirm the appointment appears in the appointment list. Follow hospital policy before cancelling or changing an existing booking."},
 {owner:"Patient Flow / Admissions",aliases:["reception","admissions","nursing","patient flow"],section:"patientFlow",terms:["queue","waiting patient","triage queue","admission","bed allocation","patient flow"],guide:"Open Patient Flow to review the queue and admission workflow. Verify the patient's identity and the authorised clinical/admission decision before changing queue or bed status. Emergency triage must follow the hospital's clinical escalation protocol."},
 {owner:"Clinical / Nursing",aliases:["clinical","nursing","doctor","medical","emergency","outpatient","inpatient"],section:"clinicalRecords",terms:["clinical record","clinical note","encounter","vitals","patient assessment","medical history","consultation note","observations"],guide:"Open Clinical Records. Select the correct patient and encounter, document findings and observations, and save the note for the required review. Confirm entries against the source record; do not enter another patient's information."},
 {owner:"Clinical / Medical Scribe",aliases:["clinical","nursing","doctor","medical"],section:"clinicalScribe",terms:["medical scribe","scribe","transcribe","voice note","clinical dictation"],guide:"Open the Medical Scribe workspace. Obtain required patient consent, select the correct encounter, capture or enter the clinician's dictation, review the generated draft, correct errors and obtain clinician confirmation before it becomes part of the record."},
 {owner:"Clinical / Decision Support",aliases:["clinical","nursing","doctor","medical","emergency"],section:"clinicalDecisionSupportWorkspace",terms:["clinical decision support","risk review","clinical risk","allergy safety","medication allergy","vital trend","clinical alert"],guide:"Open Clinical Decision Support and record the clinical context, findings and risk factors. Treat prompts as decision-support information only. A licensed clinician must independently assess the patient and document the clinical decision. Activate emergency pathways immediately when needed."},
 {owner:"Pharmacy",aliases:["pharmacy","pharmacist","dispensary"],section:"pharmacy",terms:["main responsibilities of pharmacy department","responsibilities of pharmacy department","pharmacy department responsibilities","pharmacy responsibilities","what does the pharmacy department do","medicine stock","drug inventory","pharmacy inventory","medicine batch","expiry","low stock","barcode","dispensing","prescription stock"],guide:"The Pharmacy Department is responsible for: (1) procuring medicines and approved medical supplies from authorised suppliers; (2) receiving, checking, storing and safeguarding stock under required temperature and security conditions; (3) maintaining accurate inventory, batch, expiry and recall records; (4) reviewing prescriptions for completeness and escalating clinical concerns to the prescriber; (5) dispensing the correct medicine, strength, dose, quantity and instructions to the correct patient; (6) counselling patients on safe use, side effects, interactions and adherence; (7) monitoring adverse drug reactions and medication errors; (8) preventing stock-outs, wastage, diversion and unauthorised adjustments; (9) managing controlled medicines in line with applicable laws and hospital policy; (10) reconciling medicine issues, returns, charges and payments with the authorised records; and (11) supporting antimicrobial stewardship, medication safety audits and staff education. Licensed pharmacy professionals must make clinical dispensing decisions and follow Nigerian law and the hospital's approved policies. For HealthOS workflows, open Pharmacy Inventory to register and monitor batches, Pharmacy Dispensing to document authorised dispensing, and Pharmacy Procurement to manage approved orders and receipts. Stock adjustments, substitutions and dispensing require the appropriate authorised review."},
 {owner:"Pharmacy / Dispensing",aliases:["pharmacy","pharmacist","dispensary"],section:"pharmacyDispensingWorkspace",terms:["dispense","dispensing","dispensing history"],guide:"Open Pharmacy Dispensing. Verify the authorised prescription, patient, medicine, strength, batch and quantity. Record the dispensing event and review the confirmation. Do not dispense on the basis of an assistant response."},
 {owner:"Pharmacy / Procurement",aliases:["pharmacy","procurement","purchasing"],section:"pharmacyProcurementWorkspace",terms:["pharmacy supplier","purchase order","receive medicine","goods receipt","supplier payment"],guide:"Open Pharmacy Procurement. Select the approved supplier, create or review the purchase order, and match received goods to the order, delivery note, batch and expiry details. Record discrepancies for authorised review."},
 {owner:"Finance / Billing",aliases:["finance","accounts","billing","cashier","revenue","audit"],section:"billing",terms:["billing","invoice","payment","outstanding","revenue","refund","pos reconciliation","cashier","reconcile"],guide:"Open Billing / Finance. Match each charge to an authorised service or approved fee, verify the invoice and payment reference, and reconcile against the approved payment evidence. Refunds, write-offs and adjustments require the appropriate approval and audit trail."},
 {owner:"Service Operations",aliases:["clinical","nursing","laboratory","radiology","theatre","service operations"],section:"serviceCapture",terms:["record service","performed service","procedure","laboratory test","scan performed","service capture"],guide:"Open Service Capture. Record only a service that was actually performed and supported by the required evidence. Confirm the request, authorisation, performing staff member and completion details so Finance can reconcile the charge."},
 {owner:"Human Resources / Staff Management",aliases:["human resources","hr","admin","management"],section:"adminStaffDashboard",terms:["staff attendance","staff shift","staff roster","staff online","staff credential","staff license","staff competency","staff management"],guide:"Open Staff Management. Review the staff member, department, assigned shift and attendance records. Online presence is not the same as being on duty. Credential verification and changes to staff access must be completed by authorised officers."},
 {owner:"Compliance / Risk",aliases:["compliance","quality","admin","management","risk"],section:"hospitalComplianceWorkspace",terms:["compliance","inspection","regulatory","audit register","corrective action","evidence vault","accreditation"],guide:"Open the Compliance Register to record the obligation or finding, accountable officer, due date and evidence reference. Upload supporting documents through the private Evidence Vault. A submitted record is not proof of regulatory compliance until reviewed by an authorised officer."},
 {owner:"Quality Assurance",aliases:["quality","compliance","admin","management"],section:"hospitalQualityWorkspace",terms:["quality indicator","quality improvement","accreditation","patient feedback","performance indicator"],guide:"Open Quality Assurance. Select the record type, define the indicator or improvement objective, enter the measurement period and accountable owner, and submit supporting evidence for review."},
 {owner:"Clinical Governance",aliases:["clinical","nursing","doctor","medical","quality","management"],section:"clinicalGovernanceWorkspace",terms:["mortality review","morbidity","adverse event","near miss","root cause","clinical governance","patient safety review"],guide:"Open Clinical Governance. Record the event and review type, immediate safety actions, contributing factors, findings, recommendations and action owner. Protect patient confidentiality and follow the hospital's formal governance and escalation process."},
 {owner:"Hospital Incident / Safety",aliases:["all departments","security","clinical","nursing","management","risk"],section:"hospitalIncidentReporting",terms:["report incident","incident report","safety incident","security incident","hazard","data breach","near miss report"],guide:"Open Incident Reporting. Record what happened, where and when, the severity and immediate actions taken. Escalate urgent patient-safety, security or privacy events through the hospital's emergency process without waiting for this form."},
 {owner:"Department Task Workspace",aliases:["all departments"],section:"offlineDepartmentTaskWorkspace",terms:["department task","handover","blocker","task progress","completion report","offline task"],guide:"Open Department Tasks to record progress, a completion claim, a blocker or a handover. Include a task reference and concise evidence. Submissions are review requests and do not automatically approve or close the underlying task."}
 ];
 const normalize=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 function show(t,m,section=null,label="Open workspace"){title.textContent=t;body.textContent=m;response.hidden=false;pendingSection=section;action.hidden=!section;if(section)action.textContent=label;response.scrollIntoView({behavior:"smooth",block:"nearest"});}
 function openSection(id){const el=$(id);if(!el){show("Workspace unavailable","This workspace is not available in the current app version. Contact your administrator.");return;}const parent=el.closest(".panel");if(parent&&typeof window.showHealthOSView==="function")window.showHealthOSView(parent.id);if(panel)panel.hidden=true;if(launcher)launcher.setAttribute("aria-expanded","false");requestAnimationFrame(()=>el.scrollIntoView({behavior:"smooth",block:"start"}));}
 async function loadStaffContext(){
  if(typeof supabaseClient==="undefined"||typeof currentUser==="undefined"||!currentUser||typeof currentClinic==="undefined"||!currentClinic||!currentClinic.id)return null;
  // A successful management verification already re-authenticated this user and confirmed an active owner/admin membership.
  // Reuse that verified authorization so the assistant does not incorrectly block clinic administrators on a second profile lookup.
  if(typeof managementVerified!=="undefined"&&managementVerified){
   return {profileId:null,departments:[],role:"owner",isClinicOwner:true};
  }
  const {data:membership,error:membershipError}=await supabaseClient.from("clinic_memberships").select("role").eq("clinic_id",currentClinic.id).eq("user_id",currentUser.id).eq("status","active").maybeSingle();
  if(membershipError||!membership)return null;
  const membershipRole=String(membership.role||"").toLowerCase();
  const isClinicOwner=["owner","admin","clinic_owner","super_admin"].includes(membershipRole);
  if(isClinicOwner){
   // Owner access is established by the active clinic_memberships row.
   // Do not make assistant access depend on a separate departments-table read.
   return {profileId:null,departments:[],role:membershipRole,isClinicOwner:true};
  }
  const {data:profile,error}=await supabaseClient.from("staff_profiles").select("id,department,professional_role,employment_status").eq("clinic_id",currentClinic.id).eq("user_id",currentUser.id).limit(1).maybeSingle();
  if(error)return null;
  if(!profile){
   // Active clinic members without a completed staff profile may still use general HealthOS help.
   // Department-specific instructions and workspaces remain unavailable until an assignment exists.
   return {profileId:null,departments:[],role:membershipRole,isClinicOwner:false,unassigned:true};
  }
  if(profile.employment_status&&profile.employment_status!=="active")return null;
  const departments=new Set(profile.department?[profile.department]:[]);
  const {data:assignments}=await supabaseClient.from("staff_department_assignments").select("department_id").eq("clinic_id",currentClinic.id).eq("staff_profile_id",profile.id).eq("assignment_status","active");
  const ids=[...new Set((assignments||[]).map(a=>a.department_id).filter(Boolean))];
  if(ids.length){const {data:deptRows}=await supabaseClient.from("clinic_departments").select("department_name").eq("clinic_id",currentClinic.id).eq("is_active",true).in("id",ids);(deptRows||[]).forEach(d=>departments.add(d.department_name));}
  return {profileId:profile.id,departments:[...departments],role:profile.professional_role||"",isClinicOwner:false};
 }
 function routeMatch(q){const words=normalize(q);return routes.map(r=>({...r,score:r.terms.reduce((n,t)=>{const term=normalize(t);return n+(words.includes(term)?term.split(" ").length:0);},0)})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score)[0]||null;}
 function departmentOwns(departments,route){if(route.aliases.includes("all departments"))return true;return departments.some(dep=>{const d=normalize(dep);return route.aliases.some(a=>d===normalize(a)||d.includes(normalize(a))||normalize(a).includes(d)&&d.length>3);});}
 async function handleRequest(q){
  if(!String(q||"").trim()){show("What do you need help with?","Type a task, a question about how to use HealthOS, or the name of a workspace.");return;}
  const rawQuestion=String(q).trim();
  const followup=/^(explain (it|that)( more simply| simply)?|make (it|that) simpler|simplify|what next|next step|continue|tell me more|why\??|how so\??|give me an example|repeat that|summari[sz]e( it| that)?|what does that mean)\??$/i.test(rawQuestion);
  if(followup&&lastConversation.topic){
   if(/^(what next|next step|continue)$/i.test(rawQuestion))q=lastConversation.topic+" next step";
   else if(/^(why\??|how so\??)$/i.test(rawQuestion))q=lastConversation.topic+" explain the reason";
   else q=lastConversation.topic+" explain the previous instructions more simply";
  }
  if(!staffContext)staffContext=await loadStaffContext();
  if(!staffContext){show("HealthOS access not verified","I could not verify an active membership in this hospital. Please sign in with your hospital account or contact your administrator.");return;}
  const match=routeMatch(q);
  if(match&&!staffContext.isClinicOwner&&!departmentOwns(staffContext.departments,match)){show("Department assignment required","Your general HealthOS Help Assistant is available. This request needs an active assignment to "+match.owner+". Ask your administrator to complete or update your department assignment. I will not expose another department’s restricted instructions or workspace.");return;}
  // Use the authenticated conversational knowledge function first. Its database
  // client forwards the signed-in user's JWT, so departmental article access remains
  // governed by Supabase Row-Level Security.
  if(supabaseClient&&supabaseClient.functions){
   try{
    const {data:aiData,error:aiError}=await supabaseClient.functions.invoke("healthos-conversational-knowledge",{
     body:{question:String(q).trim(),clinic_id:currentClinic.id}
    });
    if(!aiError&&aiData&&aiData.answer){
     lastConversation={topic:rawQuestion,answer:aiData.answer,article:null,turns:lastConversation.turns+1};
     const citations=(aiData.sources||[]).map(s=>s.title+" · Version "+s.version).join("\\n");
     show("Ask HealthOS · Verified knowledge",aiData.answer+(citations?"\\n\\nSOURCES:\\n"+citations:""));
     return;
    }
    if(aiError)console.warn("Ask HealthOS conversational function unavailable; using approved local guidance.",aiError.message);
    else if(aiData&&aiData.error)console.warn("Ask HealthOS knowledge response:",aiData.error);
   }catch(aiErr){console.warn("Ask HealthOS conversational request failed; using approved local guidance.",aiErr);}
  }
  if(typeof window.healthOSDepartmentKnowledgeSearch==="function"){
   const knowledge=await window.healthOSDepartmentKnowledgeSearch(q);
   if(knowledge&&knowledge.length){
    const article=knowledge[0];
    const departmentName=article._departmentName||"Assigned department";
    const answer=(article.summary?article.summary+"\\n\\n":"")+article.content+"\\n\\nSOURCE: "+article.title+" · "+departmentName+" · Version "+article.version+".";
    lastConversation={topic:rawQuestion,answer,article,turns:lastConversation.turns+1};
    show("Approved departmental guidance · "+article.title,answer,article.workspace_section_id||null,"Open linked workspace");
    return;
   }
  }
  if(!match){show("HealthOS general help","I can help you navigate HealthOS, understand available features, find the right workspace, and troubleshoot common workflow difficulties. Tell me the screen, button, task or problem you are facing. For department-specific procedures, your hospital administrator must first assign your staff profile to the correct department.");return;}
  lastConversation={topic:rawQuestion,answer:match.guide,article:null,turns:lastConversation.turns+1};
  show("Your departmental guide · "+match.owner,match.guide,match.section,"Open relevant workspace");
 }
 function setOpen(open){if(!panel||!launcher)return;panel.hidden=!open;launcher.setAttribute("aria-expanded",String(open));if(open)input.focus();}
 launcher?.addEventListener("click",()=>setOpen(true));$("staffAssistantClose")?.addEventListener("click",()=>setOpen(false));
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&panel&&!panel.hidden)setOpen(false);});
 form.addEventListener("submit",async e=>{e.preventDefault();const b=$("staffAssistantSend");if(b)b.disabled=true;try{await handleRequest(input.value);}catch(err){console.error("HealthOS guide error",err);show("Guide temporarily unavailable","I could not verify your department assignments. Please try again or contact your administrator.");}finally{if(b)b.disabled=false;}});
 document.querySelectorAll("[data-assistant-action]").forEach(b=>b.addEventListener("click",()=>{const q={patient:"register patient",appointment:"manage appointments",service:"record performed service",billing:"review billing"}[b.dataset.assistantAction]||"help";handleRequest(q);}));
 action.addEventListener("click",()=>{if(pendingSection)openSection(pendingSection);});
 console.log("HealthOS departmental knowledge guide initialized.");
})();
// END HEALTHOS AI STAFF ASSISTANT
// ============================================================
// ============================================================
// HEALTHOS AI: PHARMACY INVENTORY DATABASE CONNECTION
// ============================================================

(function () {
    "use strict";

    const pharmacyForm = document.getElementById(
        "pharmacyInventoryForm"
    );

    const pharmacyMessage = document.getElementById(
        "pharmacyFormMessage"
    );

    const pharmacyTableBody = document.getElementById(
        "pharmacyInventoryBody"
    );
    // HEALTHOS AI: PHARMACY INVENTORY SEARCH
    const pharmacySearchInput = document.getElementById(
        "pharmacyInventorySearch"
    );

    if (pharmacySearchInput && pharmacyTableBody) {
        pharmacySearchInput.addEventListener("input", function () {
            const searchTerm = this.value
                .trim()
                .toLowerCase();

            const inventoryRows = pharmacyTableBody.querySelectorAll("tr");

            inventoryRows.forEach(function (row) {
                const rowText = row.textContent.toLowerCase();

                row.hidden = !rowText.includes(searchTerm);
            });
        });
    }
    // END PHARMACY INVENTORY SEARCH
    function pharmacyToday() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function showPharmacyMessage(message, isError) {
        if (!pharmacyMessage) return;

        pharmacyMessage.textContent = message;
        pharmacyMessage.style.color = isError
            ? "#b42318"
            : "#16794b";
    }

    function getPharmacyContext() {
        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {
            throw new Error(
                "Database connection is not ready. Please sign in again."
            );
        }

        if (
            typeof currentUser === "undefined" ||
            !currentUser ||
            !currentUser.id
        ) {
            throw new Error(
                "Please sign in before managing pharmacy inventory."
            );
        }

        if (
            typeof currentClinic === "undefined" ||
            !currentClinic ||
            !currentClinic.id
        ) {
            throw new Error(
                "Select a clinic before managing pharmacy inventory."
            );
        }

        return {
            userId: currentUser.id,
            clinicId: currentClinic.id
        };
    }

    function formatNaira(value) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    }

    function addPharmacyCell(row, value) {
        const cell = document.createElement("td");

        // Use textContent to prevent database text being
        // interpreted as executable HTML.
        cell.textContent = String(value ?? "");

        row.appendChild(cell);

        return cell;
    }

    function getMedicineStatus(item) {
        const today = pharmacyToday();

        const expiry = item.expiry_date;

        const futureDate = new Date(
            today + "T00:00:00"
        );

        futureDate.setDate(futureDate.getDate() + 30);

        const date30Days = [
            futureDate.getFullYear(),
            String(futureDate.getMonth() + 1).padStart(2, "0"),
            String(futureDate.getDate()).padStart(2, "0")
        ].join("-");

        if (expiry < today) {
            return "EXPIRED — DO NOT DISPENSE";
        }

        if (expiry <= date30Days) {
            return "Expiring within 30 days";
        }

        if (
            Number(item.quantity) <=
            Number(item.reorder_level)
        ) {
            return "Low stock";
        }

        return "In stock";
    }

    async function loadPharmacyInventory() {
        if (!pharmacyTableBody) return;

        try {
            const context = getPharmacyContext();

            pharmacyTableBody.replaceChildren();

            const loadingRow = document.createElement("tr");
            const loadingCell = document.createElement("td");

            loadingCell.colSpan = 6;
            loadingCell.textContent = "Loading inventory...";

            loadingRow.appendChild(loadingCell);
            pharmacyTableBody.appendChild(loadingRow);

            const { data, error } = await supabaseClient
                .from("pharmacy_inventory")
                .select(
                "id, medicine_name, medicine_code, batch_number, quantity, reorder_level, expiry_date, purchase_cost, supplier_name"
                )
                .eq("clinic_id", context.clinicId)
                .order("expiry_date", { ascending: true });

            if (error) throw error;

            pharmacyTableBody.replaceChildren();

            const inventory = data || [];

            if (inventory.length === 0) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 7;
                cell.textContent =
                    "No medicine batches registered for this clinic.";

                row.appendChild(cell);
                pharmacyTableBody.appendChild(row);
            }

            let lowStockCount = 0;
            let expiringCount = 0;
            let expiredCount = 0;

            const today = pharmacyToday();

            const dateLimit = new Date(
                today + "T00:00:00"
            );

            dateLimit.setDate(dateLimit.getDate() + 30);

            const dateLimitString = [
                dateLimit.getFullYear(),
                String(dateLimit.getMonth() + 1).padStart(2, "0"),
                String(dateLimit.getDate()).padStart(2, "0")
            ].join("-");

            inventory.forEach(function (item) {
                const expiry = item.expiry_date;
                const quantity = Number(item.quantity);
                const reorderLevel = Number(item.reorder_level);

                if (expiry < today) {
                    expiredCount++;
                } else {
                    if (expiry <= dateLimitString) {
                        expiringCount++;
                    }

                    if (quantity <= reorderLevel) {
                        lowStockCount++;
                    }
                }

                const row = document.createElement("tr");

                addPharmacyCell(row, item.medicine_name);
                addPharmacyCell(row, item.medicine_code || "—");
                addPharmacyCell(row, item.batch_number);
                addPharmacyCell(row, quantity);
                addPharmacyCell(row, expiry);

                const statusCell = addPharmacyCell(
                    row,
                    getMedicineStatus(item)
                );

                if (expiry < today) {
                    statusCell.style.color = "#b42318";
                    statusCell.style.fontWeight = "bold";
                } else if (
                    expiry <= dateLimitString ||
                    quantity <= reorderLevel
                ) {
                    statusCell.style.fontWeight = "bold";
                }

                const actionCell = addPharmacyCell(row, "");
                const dispenseButton = document.createElement("button");
                dispenseButton.type = "button"; dispenseButton.textContent = "Dispense";
                dispenseButton.disabled = quantity < 1 || expiry < today;
                dispenseButton.addEventListener("click", function () {
                    if (dispensingBatch) {
                        dispensingBatch.value = item.id;
                        document.getElementById("pharmacyDispensingWorkspace").scrollIntoView({behavior:"smooth",block:"start"});
                    }
                });
                actionCell.replaceChildren(dispenseButton);
                pharmacyTableBody.appendChild(row);
            });

            // Update existing pharmacy summary cards if present.
            const pharmacyPanel = document.getElementById("pharmacy");

            if (pharmacyPanel) {
                const cards = pharmacyPanel.querySelectorAll(
                    ".stats-grid .stat-card"
                );

                if (cards[0]) {
                    const heading = cards[0].querySelector("h3");
                    if (heading) {
                        heading.textContent = String(inventory.length);
                    }
                }

                if (cards[1]) {
                    const heading = cards[1].querySelector("h3");
                    if (heading) {
                        heading.textContent = String(lowStockCount);
                    }
                }

                if (cards[2]) {
                    const heading = cards[2].querySelector("h3");
                    if (heading) {
                        heading.textContent = String(
                            expiringCount + expiredCount
                        );
                    }
                }
            }

            showPharmacyMessage(
                "Inventory loaded successfully. " +
                inventory.length + " batch(es), " +
                lowStockCount + " low-stock batch(es), " +
                expiringCount + " expiring batch(es), and " +
                expiredCount + " expired batch(es).",
                false
            );

        } catch (error) {
            console.error(
                "HealthOS Pharmacy inventory error:",
                error
            );

            if (pharmacyTableBody) {
                pharmacyTableBody.replaceChildren();

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 7;
                cell.textContent =
                    "Inventory could not be loaded. Check your sign-in, clinic access, and database connection.";

                row.appendChild(cell);
                pharmacyTableBody.appendChild(row);
            }

            showPharmacyMessage(
                error.message ||
                "Unable to load pharmacy inventory.",
                true
            );
        }
    }

    // PHARMACY DISPENSING WORKSPACE
    const dispensingForm = document.getElementById("pharmacyDispensingForm");
    const dispensingPatient = document.getElementById("pharmacyDispensingPatient");
    const dispensingBatch = document.getElementById("pharmacyDispensingBatch");
    const dispensingMessage = document.getElementById("pharmacyDispensingMessage");
    const dispensingHistory = document.getElementById("pharmacyDispensingHistory");
    function showDispensingMessage(message, isError) {
        if (!dispensingMessage) return;
        dispensingMessage.textContent = message;
        dispensingMessage.style.color = isError ? "#b42318" : "#16794b";
    }
    async function loadPharmacyDispensingWorkspace() {
        if (!dispensingForm) return;
        try {
            const context = getPharmacyContext();
            const results = await Promise.all([
                supabaseClient.from("patients").select("id, patient_number, first_name, last_name").eq("clinic_id", context.clinicId).order("first_name"),
                supabaseClient.from("pharmacy_inventory").select("id, medicine_name, batch_number, quantity, expiry_date").eq("clinic_id", context.clinicId).order("expiry_date")
            ]);
            if (results[0].error) throw results[0].error;
            if (results[1].error) throw results[1].error;
            dispensingPatient.replaceChildren();
            const p0 = document.createElement("option"); p0.value = ""; p0.textContent = "Select patient"; dispensingPatient.appendChild(p0);
            (results[0].data || []).forEach(function (p) {
                const o = document.createElement("option"); o.value = p.id;
                o.textContent = (p.patient_number || "Patient") + " — " + [p.first_name,p.last_name].filter(Boolean).join(" ");
                dispensingPatient.appendChild(o);
            });
            dispensingBatch.replaceChildren();
            const b0 = document.createElement("option"); b0.value = ""; b0.textContent = "Select available, unexpired batch"; dispensingBatch.appendChild(b0);
            (results[1].data || []).forEach(function (b) {
                const o = document.createElement("option"); o.value = b.id;
                o.textContent = b.medicine_name + " | Batch " + b.batch_number + " | Stock " + b.quantity + " | Expiry " + b.expiry_date;
                o.disabled = Number(b.quantity) < 1 || b.expiry_date < pharmacyToday(); dispensingBatch.appendChild(o);
            });
            if (dispensingHistory) {
                const h = await supabaseClient.from("pharmacy_dispensing_records").select("patient_id, medicine_name_snapshot, batch_number_snapshot, quantity_dispensed, dispensed_by, dispensed_at").eq("clinic_id", context.clinicId).eq("status", "dispensed").order("dispensed_at", {ascending:false}).limit(30);
                if (h.error) throw h.error;
                dispensingHistory.replaceChildren();
                if (!h.data || !h.data.length) {
                    const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 6; td.textContent = "No dispensing records yet."; tr.appendChild(td); dispensingHistory.appendChild(tr);
                } else {
                    h.data.forEach(function (r) {
                        const tr = document.createElement("tr");
                        [new Date(r.dispensed_at).toLocaleString(),r.patient_id,r.medicine_name_snapshot,r.batch_number_snapshot,r.quantity_dispensed,r.dispensed_by].forEach(function (v) { addPharmacyCell(tr,v); });
                        dispensingHistory.appendChild(tr);
                    });
                }
            }
        } catch (e) { console.error("Pharmacy dispensing load error:",e); showDispensingMessage(e.message || "Unable to load dispensing data.",true); }
    }
    if (dispensingForm) {
        dispensingForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const button = document.getElementById("pharmacyDispensingSubmit");
            if (button) { button.disabled = true; button.textContent = "Recording..."; }
            try {
                const context = getPharmacyContext();
                const patientId = dispensingPatient.value; const inventoryId = dispensingBatch.value;
                const quantity = Number(document.getElementById("pharmacyDispensingQuantity").value);
                const notes = document.getElementById("pharmacyDispensingNotes").value.trim();
                if (!patientId || !inventoryId) throw new Error("Select a patient and medicine batch.");
                if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Enter a whole-number quantity greater than zero.");
                const result = await supabaseClient.rpc("dispense_pharmacy_medicine", {p_clinic_id:context.clinicId,p_inventory_id:inventoryId,p_patient_id:patientId,p_quantity:quantity,p_appointment_id:null,p_notes:notes || null});
                if (result.error) throw result.error;
                dispensingForm.reset(); showDispensingMessage("Dispensing recorded. Stock and movement history updated.",false);
                await loadPharmacyInventory(); await loadPharmacyDispensingWorkspace();
            } catch (e) { console.error("Pharmacy dispensing error:",e); showDispensingMessage(e.message || "Dispensing could not be recorded.",true); }
            finally { if (button) { button.disabled = false; button.textContent = "Record Dispensing"; } }
        });
    }

    // HEALTHOS AI: PHARMACY CAMERA BARCODE SCANNER AND BULK STOCK REGISTRATION
    (function initPharmacyBarcodeAndBulk(){
        const video=document.getElementById("pharmacyBarcodeVideo");
        const start=document.getElementById("pharmacyStartBarcodeScan");
        const stop=document.getElementById("pharmacyStopBarcodeScan");
        const status=document.getElementById("pharmacyBarcodeStatus");
        const bulkInput=document.getElementById("pharmacyBulkRows");
        const bulkButton=document.getElementById("pharmacyBulkRegisterButton");
        const bulkMessage=document.getElementById("pharmacyBulkMessage");
        let stream=null,detector=null,scanTimer=null,scanning=false;
        const say=(el,msg,error=false)=>{if(el){el.textContent=msg;el.className="message"+(error?" error":" success");}};
        function stopScanner(){
            scanning=false;if(scanTimer)clearInterval(scanTimer);scanTimer=null;
            if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
            if(video){video.pause();video.srcObject=null;video.hidden=true;}
            if(start)start.disabled=false;if(stop)stop.disabled=true;
        }
        async function scanFrame(){
            if(!scanning||!detector||!video||video.readyState<2)return;
            try{
                const codes=await detector.detect(video);
                if(codes&&codes.length){
                    const value=codes[0].rawValue||"";
                    const field=document.getElementById("pharmacyMedicineCode");
                    if(field){field.value=value;field.dispatchEvent(new Event("input",{bubbles:true}));}
                    say(status,"Barcode captured: "+value+". Confirm it matches the medicine pack.");
                    stopScanner();
                }
            }catch(error){console.warn("Barcode frame scan issue:",error);}
        }
        if(start)start.addEventListener("click",async()=>{
            try{
                if(!("BarcodeDetector" in window))throw new Error("This browser does not support native barcode scanning. Use a USB/Bluetooth scanner or type the barcode.");
                if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("Camera access is unavailable. Open HealthOS over HTTPS and allow camera permission.");
                detector=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","itf","qr_code"]});
                stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
                video.srcObject=stream;video.hidden=false;await video.play();scanning=true;
                start.disabled=true;stop.disabled=false;say(status,"Scanner active. Hold the medicine barcode steady inside the camera view.");
                scanTimer=setInterval(scanFrame,350);
            }catch(error){stopScanner();say(status,error.message||"Could not start camera scanner.",true);}
        });
        if(stop)stop.addEventListener("click",()=>{stopScanner();say(status,"Camera scanner stopped.");});
        document.addEventListener("visibilitychange",()=>{if(document.hidden&&scanning){stopScanner();say(status,"Scanner paused because the page is no longer active.");}});
        window.addEventListener("beforeunload",stopScanner);
        if(bulkButton)bulkButton.addEventListener("click",async()=>{
            bulkButton.disabled=true;
            try{
                if(!supabaseClient||!currentClinic||!currentUser)throw new Error("Sign in to an authorised clinic workspace first.");
                const lines=(bulkInput.value||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
                if(!lines.length)throw new Error("Paste at least one batch row.");
                if(lines.length>100)throw new Error("Register a maximum of 100 batches per upload.");
                const parsed=lines.map((line,index)=>{
                    const p=line.split("|").map(x=>x.trim());
                    if(p.length!==8)throw new Error("Line "+(index+1)+" must contain exactly 8 fields separated by |.");
                    const [medicine_name,medicine_code,batch_number,qty,reorder,expiry,cost,supplier]=p;
                    const quantity=Number(qty),reorder_level=Number(reorder),purchase_cost=Number(cost);
                    if(!medicine_name||!batch_number)throw new Error("Line "+(index+1)+": medicine name and batch number are required.");
                    if(!Number.isInteger(quantity)||quantity<0||!Number.isInteger(reorder_level)||reorder_level<0||!Number.isFinite(purchase_cost)||purchase_cost<0)throw new Error("Line "+(index+1)+": quantity, reorder level or cost is invalid.");
                    if(!/^\d{4}-\d{2}-\d{2}$/.test(expiry)||Number.isNaN(Date.parse(expiry+"T00:00:00")))throw new Error("Line "+(index+1)+": expiry must use YYYY-MM-DD.");
                    return {clinic_id:currentClinic.id,location_id:null,medicine_name,medicine_code:medicine_code||null,batch_number,quantity,reorder_level,expiry_date:expiry,purchase_cost,supplier_name:supplier||null,created_by:currentUser.id};
                });
                const location=await supabaseClient.from("pharmacy_stock_locations").select("id").eq("clinic_id",currentClinic.id).eq("is_default",true).eq("is_active",true).limit(1).maybeSingle();
                if(location.error)throw location.error;if(!location.data)throw new Error("Main Pharmacy Store is not configured.");
                parsed.forEach(row=>row.location_id=location.data.id);
                const {error}=await supabaseClient.from("pharmacy_inventory").insert(parsed);
                if(error)throw error;
                bulkInput.value="";
                say(bulkMessage,parsed.length+" medicine batches registered successfully. Refreshing inventory.");
                if(typeof loadPharmacyInventory==="function")await loadPharmacyInventory();
            }catch(error){console.error("Pharmacy bulk registration failed:",error);say(bulkMessage,error.message||"Bulk registration failed. No rows were confirmed.",true);}
            finally{bulkButton.disabled=false;}
        });
    })();
    // END PHARMACY CAMERA BARCODE SCANNER AND BULK STOCK REGISTRATION

    if (pharmacyForm) {
        pharmacyForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const saveButton = document.getElementById(
                "pharmacySaveButton"
            );

            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = "Saving...";
            }

            try {
                const context = getPharmacyContext();

                        const medicineName = document.getElementById(
                    "pharmacyMedicineName"
                ).value.trim();

                const medicineCode = document.getElementById(
                    "pharmacyMedicineCode"
                ).value.trim();

                const batchNumber = document.getElementById(
                    "pharmacyBatchNumber"
                ).value.trim();

                const quantity = Number(
                    document.getElementById(
                        "pharmacyQuantity"
                    ).value
                );

                const reorderLevel = Number(
                    document.getElementById(
                        "pharmacyReorderLevel"
                    ).value
                );

                const expiryDate = document.getElementById(
                    "pharmacyExpiryDate"
                ).value;

                const purchaseCost = Number(
                    document.getElementById(
                        "pharmacyPurchaseCost"
                    ).value
                );

                const supplierName = document.getElementById(
                    "pharmacySupplier"
                ).value.trim();

                if (!medicineName || !batchNumber || !expiryDate) {
                    throw new Error(
                        "Enter the medicine name, batch number, and expiry date."
                    );
                }

                if (
                    !Number.isInteger(quantity) ||
                    quantity < 0
                ) {
                    throw new Error(
                        "Quantity must be a whole number of zero or more."
                    );
                }

                if (
                    !Number.isInteger(reorderLevel) ||
                    reorderLevel < 0
                ) {
                    throw new Error(
                        "The low-stock threshold must be a whole number of zero or more."
                    );
                }

                if (
                    !Number.isFinite(purchaseCost) ||
                    purchaseCost < 0
                ) {
                    throw new Error(
                        "Enter a valid purchase cost of zero or more."
                    );
                }

                                const locationResult = await supabaseClient.from("pharmacy_stock_locations")
                    .select("id").eq("clinic_id", context.clinicId).eq("is_default", true).eq("is_active", true).limit(1).maybeSingle();
                if (locationResult.error) throw locationResult.error;
                if (!locationResult.data) throw new Error("The main pharmacy stock location is not configured. Register it before adding stock.");
                const payload = {
                    clinic_id: context.clinicId,
                    location_id: locationResult.data.id,
                    medicine_name: medicineName,
                    medicine_code: medicineCode || null,
                    batch_number: batchNumber,
                    quantity: quantity,
                    reorder_level: reorderLevel,
                    expiry_date: expiryDate,
                    purchase_cost: purchaseCost,
                    supplier_name: supplierName || null,
                    created_by: context.userId
                };

                const { error } = await supabaseClient
                    .from("pharmacy_inventory")
                    .insert(payload);

                if (error) {
                    if (error.code === "23505") {
                        throw new Error(
                            "This medicine name and batch number are already registered for this clinic."
                        );
                    }

                    throw error;
                }

                pharmacyForm.reset();

                document.getElementById(
                    "pharmacyQuantity"
                ).value = "0";

                document.getElementById(
                    "pharmacyReorderLevel"
                ).value = "10";

                document.getElementById(
                    "pharmacyPurchaseCost"
                ).value = "0";

                showPharmacyMessage(
                    "Medicine batch saved successfully.",
                    false
                );

                await loadPharmacyInventory();

            } catch (error) {
                console.error(
                    "HealthOS Pharmacy save error:",
                    error
                );

                showPharmacyMessage(
                    error.message ||
                    "Unable to save the medicine batch. Check your clinic permissions.",
                    true
                );

            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = "Save Medicine Batch";
                }
            }
        });
    }

    // Reload inventory when the Pharmacy navigation item is selected.
    document.querySelectorAll(".sidebar .nav-item").forEach(
        function (link) {
            link.addEventListener("click", function () {
                const target = (
                    link.getAttribute("href") || ""
                ).replace(/^#/, "");

                if (target === "pharmacy") {
                    void loadPharmacyInventory();
                    void loadPharmacyDispensingWorkspace();
                }
            });
        }
    );

    // Make the loader available for controlled internal use.
    window.loadHealthOSPharmacyInventory =
        loadPharmacyInventory;
    window.loadHealthOSPharmacyDispensing = loadPharmacyDispensingWorkspace;

    console.log(
        "HealthOS Pharmacy inventory module initialized."
    );

    // PHARMACY PROCUREMENT: SUPPLIERS, PURCHASE ORDERS AND GOODS RECEIVING
    const procurementSupplierForm = document.getElementById("pharmacySupplierForm");
    const procurementOrderForm = document.getElementById("pharmacyPurchaseOrderForm");
    const procurementReceiveForm = document.getElementById("pharmacyReceiveGoodsForm");
    const procurementMessage = document.getElementById("pharmacyProcurementMessage");
    const procurementSupplierSelect = document.getElementById("pharmacyPurchaseSupplier");
    const procurementOrderSelect = document.getElementById("pharmacyReceiveOrder");
    const procurementItemSelect = document.getElementById("pharmacyReceiveOrderItem");
    const procurementOrdersBody = document.getElementById("pharmacyPurchaseOrdersBody");
    const procurementPaymentForm = document.getElementById("pharmacySupplierPaymentForm");
    const procurementPaymentOrderSelect = document.getElementById("pharmacyPaymentOrder");
    const procurementPaymentsBody = document.getElementById("pharmacySupplierPaymentsBody");
    const procurementOrderItems = document.getElementById("pharmacyOrderItems");
    const addProcurementOrderItemButton = document.getElementById("pharmacyAddOrderItemButton");

    function showProcurementMessage(message, isError) {
        if (!procurementMessage) return;
        procurementMessage.textContent = message;
        procurementMessage.style.color = isError ? "#b42318" : "#16794b";
    }

    async function loadPharmacyProcurementWorkspace() {
        if (!procurementSupplierForm) return;
        try {
            const context = getPharmacyContext();
            const supplierResult = await supabaseClient.from("pharmacy_suppliers")
                .select("id,supplier_name,contact_person,phone,email,is_active,verification_status,registration_number,regulatory_license_reference,verification_evidence_reference,verification_review_notes,created_by")
                .eq("clinic_id", context.clinicId)
                .order("supplier_name");
            if (supplierResult.error) throw supplierResult.error;
            const suppliers = supplierResult.data || [];
            procurementSupplierSelect.replaceChildren();
            const supplierPlaceholder = document.createElement("option");
            supplierPlaceholder.value = "";
            supplierPlaceholder.textContent = "Select an active supplier";
            procurementSupplierSelect.appendChild(supplierPlaceholder);
            suppliers.filter(s => s.is_active && s.verification_status === "verified").forEach(s => {
                const option = document.createElement("option");
                option.value = s.id;
                option.textContent = s.supplier_name;
                procurementSupplierSelect.appendChild(option);
            });

            const supplierBody = document.getElementById("pharmacySuppliersBody");
            if (supplierBody) {
                supplierBody.replaceChildren();
                if (!suppliers.length) {
                    const row = document.createElement("tr");
                    const cell = document.createElement("td");
                    cell.colSpan = 6;
                    cell.textContent = "No suppliers registered yet.";
                    row.appendChild(cell);
                    supplierBody.appendChild(row);
                } else {
                    suppliers.forEach(s => {
                        const row = document.createElement("tr");
                        [s.supplier_name, s.contact_person || "—", s.phone || "—",
                         (s.verification_status || "legacy_unverified").replace(/_/g," "),
                         [s.registration_number || "No registration no.", s.regulatory_license_reference || "No licence ref."].join(" · ")]
                            .forEach(v => addPharmacyCell(row, v));
                        const actionCell = document.createElement("td");
                        const status = s.verification_status || "legacy_unverified";
                        if (s.is_active && status !== "verified") {
                            ["verified","rejected","suspended"].forEach(decision => {
                                const button = document.createElement("button");
                                button.type = "button";
                                button.textContent = decision === "verified" ? "Verify" : decision === "rejected" ? "Reject" : "Suspend";
                                button.dataset.supplierDecision = decision;
                                button.dataset.supplierId = s.id;
                                button.style.margin = "2px";
                                actionCell.appendChild(button);
                            });
                        } else {
                            actionCell.textContent = s.is_active ? "Verified" : "Inactive";
                        }
                        row.appendChild(actionCell);
                        supplierBody.appendChild(row);
                    });
                }
            }

            const orderResult = await supabaseClient.from("pharmacy_purchase_orders")
                .select("id,po_number,supplier_id,status,total_amount,expected_delivery_date,ordered_at")
                .eq("clinic_id", context.clinicId)
                .order("ordered_at", {ascending:false})
                .limit(100);
            if (orderResult.error) throw orderResult.error;
            const orders = orderResult.data || [];
            const supplierMap = new Map(suppliers.map(s => [s.id, s.supplier_name]));
            const itemResult = orders.length
                ? await supabaseClient.from("pharmacy_purchase_order_items")
                    .select("id,purchase_order_id,medicine_name,quantity_ordered,quantity_received,unit_cost")
                    .eq("clinic_id", context.clinicId)
                    .in("purchase_order_id", orders.map(o => o.id))
                : {data:[],error:null};
            if (itemResult.error) throw itemResult.error;
            const itemsByOrder = new Map();
            (itemResult.data || []).forEach(item => {
                if (!itemsByOrder.has(item.purchase_order_id)) itemsByOrder.set(item.purchase_order_id, []);
                itemsByOrder.get(item.purchase_order_id).push(item);
            });

            procurementOrdersBody.replaceChildren();
            if (!orders.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 6;
                cell.textContent = "No purchase orders have been created.";
                row.appendChild(cell);
                procurementOrdersBody.appendChild(row);
            } else {
                orders.forEach(order => {
                    const row = document.createElement("tr");
                    const orderItems = itemsByOrder.get(order.id) || [];
                    const itemSummary = orderItems.map(i =>
                        i.medicine_name + " (" + i.quantity_received + "/" + i.quantity_ordered + ")"
                    ).join(", ") || "No items";
                    [
                        order.po_number,
                        supplierMap.get(order.supplier_id) || "Supplier",
                        itemSummary,
                        formatNaira(order.total_amount),
                        order.status.replace(/_/g, " "),
                        order.expected_delivery_date || "Not specified"
                    ].forEach(v => addPharmacyCell(row, v));
                    const actionCell = document.createElement("td");
                    if (order.status === "submitted") {
                        const approve = document.createElement("button");
                        approve.type = "button";
                        approve.textContent = "Approve";
                        approve.dataset.procurementAction = "approve";
                        approve.dataset.orderId = order.id;
                        actionCell.appendChild(approve);
                    } else if (order.status === "approved" || order.status === "partially_received") {
                        const receive = document.createElement("button");
                        receive.type = "button";
                        receive.textContent = "Receive goods";
                        receive.dataset.procurementAction = "receive";
                        receive.dataset.orderId = order.id;
                        actionCell.appendChild(receive);
                    } else {
                        actionCell.textContent = "—";
                    }
                    row.appendChild(actionCell);
                    procurementOrdersBody.appendChild(row);
                });
            }

            procurementOrderSelect.replaceChildren();
            const orderPlaceholder = document.createElement("option");
            orderPlaceholder.value = "";
            orderPlaceholder.textContent = "Select approved purchase order";
            procurementOrderSelect.appendChild(orderPlaceholder);
            orders.filter(o => ["approved","partially_received"].includes(o.status)).forEach(o => {
                const option = document.createElement("option");
                option.value = o.id;
                option.textContent = o.po_number + " — " + (supplierMap.get(o.supplier_id) || "Supplier");
                procurementOrderSelect.appendChild(option);
            });
            if (procurementPaymentOrderSelect) {
                procurementPaymentOrderSelect.replaceChildren();
                const paymentPlaceholder = document.createElement("option");
                paymentPlaceholder.value = "";
                paymentPlaceholder.textContent = "Select approved purchase order";
                procurementPaymentOrderSelect.appendChild(paymentPlaceholder);
                orders.filter(o => ["approved","partially_received","received"].includes(o.status)).forEach(o => {
                    const option = document.createElement("option");
                    option.value = o.id;
                    option.textContent = o.po_number + " — " + formatNaira(o.total_amount);
                    procurementPaymentOrderSelect.appendChild(option);
                });
            }
            await loadPharmacySupplierPayments(orders);
            await loadPharmacyProcurementControlTrail(orders);
            await loadPharmacySupplierVerificationTrail(suppliers);
            window.healthOSPharmacySuppliers = suppliers;
            await loadPharmacyQuoteWorkspace(suppliers);
            await loadPharmacyReceiveOrderItems();
            showProcurementMessage("Procurement workspace loaded.", false);
        } catch (error) {
            console.error("Pharmacy procurement load error:", error);
            showProcurementMessage(error.message || "Unable to load procurement workspace.", true);
        }
    }


    async function loadPharmacySupplierVerificationTrail(suppliers) {
        const body = document.getElementById("pharmacySupplierVerificationEventsBody");
        if (!body) return;
        const context = getPharmacyContext();
        const result = await supabaseClient.from("pharmacy_supplier_verification_events")
            .select("id,supplier_id,event_type,actor_id,details,occurred_at")
            .eq("clinic_id", context.clinicId)
            .order("occurred_at", {ascending:false})
            .limit(100);
        if (result.error) throw result.error;
        const supplierMap = new Map((suppliers || []).map(s => [s.id,s.supplier_name]));
        body.replaceChildren();
        if (!result.data || !result.data.length) {
            const row=document.createElement("tr"), cell=document.createElement("td");
            cell.colSpan=5; cell.textContent="No supplier verification events recorded.";
            row.appendChild(cell); body.appendChild(row); return;
        }
        result.data.forEach(item => {
            const row=document.createElement("tr"), d=item.details || {};
            [new Date(item.occurred_at).toLocaleString(),
             supplierMap.get(item.supplier_id) || d.supplier_name || "Supplier",
             item.event_type.replace(/_/g," "), item.actor_id,
             [d.evidence_reference || "",d.review_notes || ""].filter(Boolean).join(" · ") || "—"
            ].forEach(value => addPharmacyCell(row,value));
            body.appendChild(row);
        });
    }

    const supplierBodyForReview = document.getElementById("pharmacySuppliersBody");
    if (supplierBodyForReview) {
        supplierBodyForReview.addEventListener("click", async event => {
            const button=event.target.closest("button[data-supplier-decision]");
            if (!button) return;
            button.disabled=true;
            const reviewMessage=document.getElementById("pharmacySupplierReviewMessage");
            try {
                const context=getPharmacyContext();
                const decision=button.dataset.supplierDecision;
                const evidence=document.getElementById("pharmacySupplierReviewEvidence").value.trim();
                const notes=document.getElementById("pharmacySupplierReviewNotes").value.trim();
                if (decision==="verified" && !evidence) throw new Error("Enter the evidence reference before verifying this supplier.");
                if (decision!=="verified" && !notes) throw new Error("Enter a reason before rejecting or suspending this supplier.");
                const result=await supabaseClient.rpc("review_pharmacy_supplier_verification",{
                    p_clinic_id:context.clinicId,
                    p_supplier_id:button.dataset.supplierId,
                    p_decision:decision,
                    p_evidence_reference:evidence || null,
                    p_review_notes:notes || null
                });
                if (result.error) throw result.error;
                if(reviewMessage) reviewMessage.textContent="Supplier "+decision+" decision recorded in the audit trail.";
                document.getElementById("pharmacySupplierReviewNotes").value="";
                await loadPharmacyProcurementWorkspace();
            } catch(error) {
                if(reviewMessage) reviewMessage.textContent=error.message || "Supplier review failed.";
                else showProcurementMessage(error.message || "Supplier review failed.",true);
            } finally { button.disabled=false; }
        });
    }

    async function loadPharmacyProcurementControlTrail(orders) {
        const body = document.getElementById("pharmacyProcurementControlTrailBody");
        if (!body) return;
        const context = getPharmacyContext();
        const result = await supabaseClient.from("pharmacy_procurement_control_events")
            .select("id,purchase_order_id,event_type,actor_id,details,occurred_at")
            .eq("clinic_id", context.clinicId)
            .order("occurred_at", {ascending:false})
            .limit(100);
        if (result.error) throw result.error;
        const orderMap = new Map((orders || []).map(order => [order.id, order.po_number]));
        body.replaceChildren();
        if (!result.data || !result.data.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No procurement control events recorded yet.";
            row.appendChild(cell);
            body.appendChild(row);
            return;
        }
        result.data.forEach(event => {
            const row = document.createElement("tr");
            const details = event.details || {};
            const summary = [
                details.medicine_name || "",
                details.quantity_received ? "Qty: " + details.quantity_received : "",
                details.batch_number ? "Batch: " + details.batch_number : "",
                details.amount ? "Amount: " + formatNaira(details.amount) : "",
                details.delivery_note_reference ? "Delivery note: " + details.delivery_note_reference : "",
                details.supplier_invoice_reference ? "Invoice: " + details.supplier_invoice_reference : "",
                details.invoice_variance !== undefined ? "Invoice variance: " + formatNaira(details.invoice_variance) : "",
                details.verification_status ? "Verification: " + details.verification_status : "",
                details.review_notes || ""
            ].filter(Boolean).join(" · ") || "See event evidence";
            [
                new Date(event.occurred_at).toLocaleString(),
                event.event_type.replace(/_/g, " "),
                orderMap.get(event.purchase_order_id) || "Purchase order",
                event.actor_id,
                summary,
                event.id
            ].forEach(value => addPharmacyCell(row, value));
            body.appendChild(row);
        });
    }

    async function loadPharmacyReceiveOrderItems() {
        if (!procurementItemSelect || !procurementOrderSelect) return;
        procurementItemSelect.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select medicine line";
        procurementItemSelect.appendChild(placeholder);
        if (!procurementOrderSelect.value) return;
        const context = getPharmacyContext();
        const result = await supabaseClient.from("pharmacy_purchase_order_items")
            .select("id,medicine_name,quantity_ordered,quantity_received")
            .eq("clinic_id", context.clinicId)
            .eq("purchase_order_id", procurementOrderSelect.value);
        if (result.error) throw result.error;
        (result.data || []).filter(i => i.quantity_received < i.quantity_ordered).forEach(i => {
            const option = document.createElement("option");
            option.value = i.id;
            option.textContent = i.medicine_name + " — outstanding " + (i.quantity_ordered - i.quantity_received);
            procurementItemSelect.appendChild(option);
        });
    }

    if (procurementSupplierForm) {
        procurementSupplierForm.addEventListener("submit", async event => {
            event.preventDefault();
            const button = document.getElementById("pharmacySupplierSaveButton");
            if (button) button.disabled = true;
            try {
                const context = getPharmacyContext();
                const payload = {
                    clinic_id: context.clinicId,
                    supplier_name: document.getElementById("pharmacySupplierName").value.trim(),
                    contact_person: document.getElementById("pharmacySupplierContact").value.trim() || null,
                    phone: document.getElementById("pharmacySupplierPhone").value.trim() || null,
                    email: document.getElementById("pharmacySupplierEmail").value.trim() || null,
                    address: document.getElementById("pharmacySupplierAddress").value.trim() || null,
                    registration_number: document.getElementById("pharmacySupplierRegistration").value.trim() || null,
                    regulatory_license_reference: document.getElementById("pharmacySupplierLicense").value.trim() || null,
                    verification_evidence_reference: document.getElementById("pharmacySupplierEvidence").value.trim() || null,
                    verification_submitted_at: new Date().toISOString(),
                    created_by: context.userId
                };
                if (payload.supplier_name.length < 2) throw new Error("Enter a valid supplier name.");
                const result = await supabaseClient.from("pharmacy_suppliers").insert(payload);
                if (result.error) throw result.error;
                procurementSupplierForm.reset();
                showProcurementMessage("Supplier registered as pending verification. It cannot be selected for new purchase orders until independently verified.", false);
                await loadPharmacyProcurementWorkspace();
            } catch (error) {
                console.error("Supplier registration error:", error);
                showProcurementMessage(error.message || "Unable to register supplier.", true);
            } finally {
                if (button) button.disabled = false;
            }
        });
    }

    if (procurementOrderForm) {
        procurementOrderForm.addEventListener("submit", async event => {
            event.preventDefault();
            const button = document.getElementById("pharmacyPurchaseOrderSaveButton");
            if (button) button.disabled = true;
            try {
                const context = getPharmacyContext();
                const itemRows = Array.from(procurementOrderItems.querySelectorAll(".pharmacy-po-line"));
                const items = itemRows.map(row => ({
                    medicine_name: row.querySelector(".pharmacy-po-medicine").value.trim(),
                    medicine_code: row.querySelector(".pharmacy-po-code").value.trim() || null,
                    quantity: Number(row.querySelector(".pharmacy-po-quantity").value),
                    unit_cost: Number(row.querySelector(".pharmacy-po-cost").value)
                }));
                if (!items.length) throw new Error("Add at least one medicine line.");
                items.forEach((item, index) => {
                    if (!item.medicine_name || !Number.isInteger(item.quantity) || item.quantity < 1 ||
                        !Number.isFinite(item.unit_cost) || item.unit_cost < 0) {
                        throw new Error("Check medicine line " + (index + 1) + ": enter a name, whole quantity above zero and valid unit cost.");
                    }
                });
                const result = await supabaseClient.rpc("create_pharmacy_purchase_order_with_items", {
                    p_clinic_id: context.clinicId,
                    p_supplier_id: procurementSupplierSelect.value,
                    p_po_number: document.getElementById("pharmacyOrderNumber").value.trim(),
                    p_items: items,
                    p_expected_delivery_date: document.getElementById("pharmacyOrderDeliveryDate").value || null,
                    p_notes: document.getElementById("pharmacyOrderNotes").value.trim() || null
                });
                if (result.error) throw result.error;
                procurementOrderForm.reset();
                showProcurementMessage("Multi-medicine purchase order submitted for owner/admin approval.", false);
                await loadPharmacyProcurementWorkspace();
            } catch (error) {
                console.error("Purchase order creation error:", error);
                showProcurementMessage(error.message || "Unable to create purchase order.", true);
            } finally {
                if (button) button.disabled = false;
            }
        });
    }

    if (addProcurementOrderItemButton && procurementOrderItems) {
        addProcurementOrderItemButton.addEventListener("click", () => {
            const row = document.createElement("div");
            row.className = "pharmacy-po-line";
            row.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0;padding:12px;border:1px solid #dbe3ee;border-radius:8px;";
            row.innerHTML = '<label>Medicine Name<input class="pharmacy-po-medicine" type="text" maxlength="200" required></label>' +
                '<label>Barcode / Product Code<input class="pharmacy-po-code" type="text" maxlength="100"></label>' +
                '<label>Quantity<input class="pharmacy-po-quantity" type="number" min="1" step="1" required></label>' +
                '<label>Unit Cost (NGN)<input class="pharmacy-po-cost" type="number" min="0" step="0.01" required></label>' +
                '<button type="button" class="pharmacy-po-remove">Remove line</button>';
            procurementOrderItems.appendChild(row);
        });
        procurementOrderItems.addEventListener("click", event => {
            const remove = event.target.closest(".pharmacy-po-remove");
            if (!remove) return;
            const rows = procurementOrderItems.querySelectorAll(".pharmacy-po-line");
            if (rows.length <= 1) {
                showProcurementMessage("A purchase order must contain at least one medicine line.", true);
                return;
            }
            remove.closest(".pharmacy-po-line").remove();
        });
    }

    // SUPPLIER QUOTATION COMPARISON
    const quoteRequestForm=document.getElementById("pharmacyQuoteRequestForm");
    const supplierQuoteForm=document.getElementById("pharmacySupplierQuoteForm");
    const quoteRequestSelect=document.getElementById("pharmacyQuoteRequestSelect");
    const quoteCompareSelect=document.getElementById("pharmacyQuoteCompareSelect");
    const quoteSupplierSelect=document.getElementById("pharmacyQuoteSupplierSelect");
    const quoteCompareBody=document.getElementById("pharmacyQuoteComparisonBody");
    const quoteCompareMessage=document.getElementById("pharmacyQuoteComparisonMessage");

    async function loadPharmacyQuoteWorkspace(suppliers){
        const context=getPharmacyContext();
        const result=await supabaseClient.from("pharmacy_procurement_quote_requests")
            .select("id,request_number,department_name,currency,status,created_at")
            .eq("clinic_id",context.clinicId).order("created_at",{ascending:false}).limit(100);
        if(result.error)throw result.error;
        const requests=result.data||[];
        [[quoteRequestSelect,requests.filter(x=>x.status==="open")],[quoteCompareSelect,requests]].forEach(([select,items])=>{
            if(!select)return;const keep=select.value;select.replaceChildren();
            const first=document.createElement("option");first.value="";first.textContent="Select quotation request";select.appendChild(first);
            items.forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=x.request_number+" · "+x.department_name+" · "+x.currency;select.appendChild(o);});
            if(Array.from(select.options).some(o=>o.value===keep))select.value=keep;
        });
        if(quoteSupplierSelect){quoteSupplierSelect.replaceChildren();const first=document.createElement("option");first.value="";first.textContent="Select verified supplier";quoteSupplierSelect.appendChild(first);
            (suppliers||[]).filter(s=>s.is_active&&s.verification_status==="verified").forEach(s=>{const o=document.createElement("option");o.value=s.id;o.textContent=s.supplier_name;quoteSupplierSelect.appendChild(o);});}
    }
    if(quoteRequestForm)quoteRequestForm.addEventListener("submit",async ev=>{
        ev.preventDefault();const button=document.getElementById("pharmacyQuoteRequestSave");button.disabled=true;
        try{const c=getPharmacyContext();const {data,error}=await supabaseClient.rpc("healthos_create_pharmacy_quote_request",{
            p_clinic_id:c.clinicId,p_request_number:document.getElementById("pharmacyQuoteRequestNumber").value.trim(),
            p_department_name:document.getElementById("pharmacyQuoteDepartment").value.trim(),
            p_currency:document.getElementById("pharmacyQuoteCurrency").value,
            p_required_by:document.getElementById("pharmacyQuoteRequiredBy").value||null,
            p_notes:document.getElementById("pharmacyQuoteRequestNotes").value.trim()||null});
            if(error)throw error;quoteRequestForm.reset();document.getElementById("pharmacyQuoteDepartment").value="Pharmacy";
            await loadPharmacyQuoteWorkspace(window.healthOSPharmacySuppliers||[]);
            quoteRequestSelect.value=data;quoteCompareMessage.textContent="Quotation request created.";
        }catch(e){quoteCompareMessage.textContent=e.message||"Could not create request.";}finally{button.disabled=false;}
    });
    if(supplierQuoteForm)supplierQuoteForm.addEventListener("submit",async ev=>{
        ev.preventDefault();const button=document.getElementById("pharmacySupplierQuoteSave");button.disabled=true;
        try{const c=getPharmacyContext();let items;try{items=JSON.parse(document.getElementById("pharmacyQuoteItemsJson").value);}catch(_){throw new Error("Quoted items must be valid JSON.");}
            if(!Array.isArray(items)||!items.length)throw new Error("Enter at least one quoted item.");
            const req=await supabaseClient.from("pharmacy_procurement_quote_requests").select("currency").eq("clinic_id",c.clinicId).eq("id",quoteRequestSelect.value).single();
            if(req.error)throw req.error;
            const {error}=await supabaseClient.rpc("healthos_record_pharmacy_supplier_quote",{
                p_clinic_id:c.clinicId,p_quote_request_id:quoteRequestSelect.value,p_supplier_id:quoteSupplierSelect.value,
                p_quote_reference:document.getElementById("pharmacyQuoteReference").value.trim(),
                p_supplier_invoice_reference:document.getElementById("pharmacyQuoteInvoiceReference").value.trim(),
                p_currency:req.data.currency,p_valid_until:document.getElementById("pharmacyQuoteValidUntil").value||null,p_items:items});
            if(error)throw error;supplierQuoteForm.reset();quoteCompareMessage.textContent="Supplier quotation recorded.";
            quoteCompareSelect.value=quoteRequestSelect.value;
        }catch(e){quoteCompareMessage.textContent=e.message||"Could not record quotation.";}finally{button.disabled=false;}
    });
    document.getElementById("pharmacyQuoteCompareButton")?.addEventListener("click",async()=>{
        const id=quoteCompareSelect?.value;if(!id){quoteCompareMessage.textContent="Select a request first.";return;}
        const button=document.getElementById("pharmacyQuoteCompareButton");button.disabled=true;
        try{const c=getPharmacyContext();const {data,error}=await supabaseClient.rpc("healthos_compare_pharmacy_supplier_quotes",{p_clinic_id:c.clinicId,p_quote_request_id:id});if(error)throw error;
            quoteCompareBody.replaceChildren();const rows=data?.items||[];
            if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No quotation lines found.";tr.appendChild(td);quoteCompareBody.appendChild(tr);}
            rows.forEach(x=>{const tr=document.createElement("tr");[x.item_description+" ("+x.quantity+")",x.supplier_name,Number(x.unit_price).toLocaleString()+" "+x.currency,Number(x.median_unit_price).toLocaleString()+" "+x.currency,x.flag||"No variance flag",x.quote_reference].forEach(v=>addPharmacyCell(tr,v));quoteCompareBody.appendChild(tr);});
            const list=document.getElementById("pharmacyQuoteDuplicateInvoiceAlerts");list.replaceChildren();const duplicates=data?.duplicate_invoice_references||[];
            if(!duplicates.length){const li=document.createElement("li");li.textContent="No duplicate invoice references detected in this request.";list.appendChild(li);}
            duplicates.forEach(x=>{const li=document.createElement("li");li.textContent="Repeated invoice reference: "+x.invoice_reference;list.appendChild(li);});
            quoteCompareMessage.textContent="Compared "+(data.quote_count||0)+" quotations. Review all flags before procurement approval.";
        }catch(e){quoteCompareMessage.textContent=e.message||"Comparison failed.";}finally{button.disabled=false;}
    });

    async function loadPharmacySupplierPayments(orders) {
        if (!procurementPaymentsBody) return;
        const context = getPharmacyContext();
        const result = await supabaseClient.from("pharmacy_supplier_payments")
            .select("id,purchase_order_id,payment_reference,amount,payment_method,payment_date,status")
            .eq("clinic_id", context.clinicId)
            .order("created_at", {ascending:false})
            .limit(100);
        if (result.error) throw result.error;
        const orderMap = new Map((orders || []).map(order => [order.id, order.po_number]));
        procurementPaymentsBody.replaceChildren();
        if (!result.data || !result.data.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 7;
            cell.textContent = "No supplier payments recorded.";
            row.appendChild(cell);
            procurementPaymentsBody.appendChild(row);
            return;
        }
        result.data.forEach(payment => {
            const row = document.createElement("tr");
            [
                payment.payment_reference,
                orderMap.get(payment.purchase_order_id) || "Purchase order",
                formatNaira(payment.amount),
                payment.payment_method.replace(/_/g, " "),
                payment.payment_date,
                payment.status
            ].forEach(value => addPharmacyCell(row, value));
            const actionCell = document.createElement("td");
            if (payment.status === "pending") {
                ["approved","rejected"].forEach(decision => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.textContent = decision === "approved" ? "Approve" : "Reject";
                    button.dataset.paymentDecision = decision;
                    button.dataset.paymentId = payment.id;
                    button.style.marginRight = "5px";
                    actionCell.appendChild(button);
                });
            } else {
                actionCell.textContent = payment.status === "approved" ? "Reviewed" : "Closed";
            }
            row.appendChild(actionCell);
            procurementPaymentsBody.appendChild(row);
        });
    }

    if (procurementPaymentForm) {
        procurementPaymentForm.addEventListener("submit", async event => {
            event.preventDefault();
            const button = document.getElementById("pharmacySupplierPaymentButton");
            if (button) button.disabled = true;
            try {
                const context = getPharmacyContext();
                const result = await supabaseClient.rpc("record_pharmacy_supplier_payment", {
                    p_clinic_id: context.clinicId,
                    p_purchase_order_id: procurementPaymentOrderSelect.value,
                    p_payment_reference: document.getElementById("pharmacyPaymentReference").value.trim(),
                    p_amount: Number(document.getElementById("pharmacyPaymentAmount").value),
                    p_payment_method: document.getElementById("pharmacyPaymentMethod").value,
                    p_payment_date: document.getElementById("pharmacyPaymentDate").value,
                    p_notes: document.getElementById("pharmacyPaymentNotes").value.trim() || null
                });
                if (result.error) throw result.error;
                procurementPaymentForm.reset();
                showProcurementMessage("Supplier payment recorded and sent for authorised review.", false);
                await loadPharmacyProcurementWorkspace();
            } catch (error) {
                console.error("Supplier payment recording error:", error);
                showProcurementMessage(error.message || "Unable to record supplier payment.", true);
            } finally {
                if (button) button.disabled = false;
            }
        });
    }

    if (procurementPaymentsBody) {
        procurementPaymentsBody.addEventListener("click", async event => {
            const button = event.target.closest("button[data-payment-decision]");
            if (!button) return;
            button.disabled = true;
            try {
                const context = getPharmacyContext();
                const result = await supabaseClient.rpc("review_pharmacy_supplier_payment", {
                    p_clinic_id: context.clinicId,
                    p_payment_id: button.dataset.paymentId,
                    p_decision: button.dataset.paymentDecision,
                    p_review_notes: null
                });
                if (result.error) throw result.error;
                showProcurementMessage("Supplier payment " + button.dataset.paymentDecision + ".", false);
                await loadPharmacyProcurementWorkspace();
            } catch (error) {
                console.error("Supplier payment review error:", error);
                showProcurementMessage(error.message || "Unable to review supplier payment.", true);
            } finally {
                button.disabled = false;
            }
        });
    }

    if (procurementOrdersBody) {
        procurementOrdersBody.addEventListener("click", async event => {
            const button = event.target.closest("button[data-procurement-action]");
            if (!button) return;
            const context = getPharmacyContext();
            const orderId = button.dataset.orderId;
            button.disabled = true;
            try {
                if (button.dataset.procurementAction === "approve") {
                    const result = await supabaseClient.rpc("approve_pharmacy_purchase_order", {
                        p_clinic_id: context.clinicId,
                        p_purchase_order_id: orderId
                    });
                    if (result.error) throw result.error;
                    showProcurementMessage("Purchase order approved. Goods can now be received.", false);
                } else if (button.dataset.procurementAction === "receive") {
                    procurementOrderSelect.value = orderId;
                    await loadPharmacyReceiveOrderItems();
                    document.getElementById("pharmacyReceiveGoodsForm").scrollIntoView({behavior:"smooth",block:"center"});
                    showProcurementMessage("Select the medicine line and enter the delivered batch details below.", false);
                }
                await loadPharmacyProcurementWorkspace();
            } catch (error) {
                console.error("Purchase order action error:", error);
                showProcurementMessage(error.message || "Unable to complete purchase order action.", true);
            } finally {
                button.disabled = false;
            }
        });
    }

    if (procurementOrderSelect) {
        procurementOrderSelect.addEventListener("change", () => {
            loadPharmacyReceiveOrderItems().catch(error => showProcurementMessage(error.message, true));
        });
    }

    if (procurementReceiveForm) {
        procurementReceiveForm.addEventListener("submit", async event => {
            event.preventDefault();
            const button = document.getElementById("pharmacyReceiveGoodsButton");
            if (button) button.disabled = true;
            try {
                const context = getPharmacyContext();
                const quantity = Number(document.getElementById("pharmacyReceiveQuantity").value);
                if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Received quantity must be a whole number above zero.");
                const result = await supabaseClient.rpc("receive_pharmacy_purchase_order_item_v2", {
                    p_clinic_id: context.clinicId,
                    p_purchase_order_item_id: procurementItemSelect.value,
                    p_receipt_number: document.getElementById("pharmacyGoodsReceiptNumber").value.trim(),
                    p_batch_number: document.getElementById("pharmacyGoodsBatchNumber").value.trim(),
                    p_expiry_date: document.getElementById("pharmacyGoodsExpiryDate").value,
                    p_quantity: quantity,
                    p_supplier_invoice_reference: document.getElementById("pharmacySupplierInvoiceReference").value.trim(),
                    p_supplier_invoice_line_amount: Number(document.getElementById("pharmacySupplierInvoiceLineAmount").value),
                    p_delivery_note_reference: document.getElementById("pharmacyDeliveryNote").value.trim() || null,
                    p_notes: document.getElementById("pharmacyGoodsReceiptNotes").value.trim() || null
                });
                if (result.error) throw result.error;
                procurementReceiveForm.reset();
                showProcurementMessage("Goods receipt saved. Invoice value was checked against the approved PO line; any variance is flagged for review.", false);
                await loadPharmacyInventory();
                await loadPharmacyProcurementWorkspace();
            } catch (error) {
                console.error("Goods receiving error:", error);
                showProcurementMessage(error.message || "Unable to record goods receipt.", true);
            } finally {
                if (button) button.disabled = false;
            }
        });
    }

    document.querySelectorAll(".sidebar .nav-item").forEach(link => {
        link.addEventListener("click", () => {
            if ((link.getAttribute("href") || "") === "#pharmacy") {
                void loadPharmacyProcurementWorkspace();
            }
        });
    });
    window.loadHealthOSPharmacyProcurement = loadPharmacyProcurementWorkspace;
    // ENCRYPTED OFFLINE PHARMACY PURCHASE ORDER DRAFT QUEUE
    (function initOfflinePharmacyPurchaseQueue() {
        const DB_NAME = "healthos_offline_pharmacy_v1";
        const STORE = "secure_queue";
        const KEY_ID = "pharmacy_po_queue_key";
        const QUEUE_ID = "pharmacy_po_queue";
        const status = document.getElementById("pharmacyOfflineQueueStatus");
        const body = document.getElementById("pharmacyOfflineQueueBody");
        const saveButton = document.getElementById("pharmacyOfflineSaveButton");
        const syncButton = document.getElementById("pharmacyOfflineSyncButton");
        const eraseButton = document.getElementById("pharmacyOfflineEraseButton");
        let dbPromise;

        function openDb() {
            if (dbPromise) return dbPromise;
            dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            return dbPromise;
        }
        async function getValue(key) {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, "readonly");
                const req = tx.objectStore(STORE).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }
        async function setValue(key, value) {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, "readwrite");
                tx.objectStore(STORE).put(value, key);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        }
        async function getKey() {
            let key = await getValue(KEY_ID);
            if (!key) {
                key = await crypto.subtle.generateKey({name:"AES-GCM",length:256}, false, ["encrypt","decrypt"]);
                await setValue(KEY_ID, key);
            }
            return key;
        }
        async function encryptQueue(queue, context) {
            const key = await getKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const payload = new TextEncoder().encode(JSON.stringify({
                userId:context.userId, clinicId:context.clinicId,
                expiresAt:Date.now()+8*60*60*1000, items:queue
            }));
            const cipher = await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, payload);
            await setValue(QUEUE_ID,{iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))});
        }
        async function decryptQueue(context) {
            const stored = await getValue(QUEUE_ID);
            if (!stored) return [];
            const key = await getKey();
            const plain = await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(stored.iv)},key,new Uint8Array(stored.cipher));
            const data = JSON.parse(new TextDecoder().decode(plain));
            if (data.userId !== context.userId || data.clinicId !== context.clinicId || data.expiresAt < Date.now()) {
                await setValue(QUEUE_ID,null);
                throw new Error("Offline pharmacy queue expired or belongs to another signed-in user/clinic. It has been cleared.");
            }
            return Array.isArray(data.items) ? data.items : [];
        }
        function say(message,error=false) {
            if (!status) return;
            status.textContent=message;
            status.style.color=error?"#b42318":"#16794b";
        }
        function render(items) {
            if (!body) return;
            body.replaceChildren();
            if (!items.length) {
                const tr=document.createElement("tr"),td=document.createElement("td");
                td.colSpan=5;td.textContent="No queued purchase orders.";tr.appendChild(td);body.appendChild(tr);return;
            }
            items.forEach(item=>{
                const tr=document.createElement("tr");
                [item.poNumber,item.supplierLabel,String(item.lines.length),new Date(item.capturedAt).toLocaleString(),item.status||"Draft — not submitted"]
                    .forEach(value=>addPharmacyCell(tr,value));
                body.appendChild(tr);
            });
        }
        async function readQueue(context) {
            const items=await decryptQueue(context);render(items);return items;
        }
        if(saveButton) saveButton.addEventListener("click",async()=>{
            saveButton.disabled=true;
            try {
                const context=getPharmacyContext();
                if (!window.crypto || !crypto.subtle || !window.indexedDB) throw new Error("This browser does not support encrypted offline storage.");
                const supplier=document.getElementById("pharmacyPurchaseSupplier");
                const supplierId=supplier && supplier.value;
                const supplierLabel=supplier && supplier.selectedOptions[0] ? supplier.selectedOptions[0].textContent : "";
                const poNumber=document.getElementById("pharmacyOrderNumber").value.trim();
                const rows=Array.from(document.querySelectorAll("#pharmacyOrderItems .pharmacy-po-line"));
                const lines=rows.map(row=>({
                    medicine_name:row.querySelector(".pharmacy-po-medicine").value.trim(),
                    medicine_code:row.querySelector(".pharmacy-po-code").value.trim()||null,
                    quantity:Number(row.querySelector(".pharmacy-po-quantity").value),
                    unit_cost:Number(row.querySelector(".pharmacy-po-cost").value)
                }));
                if(!supplierId || !poNumber) throw new Error("Load and select a supplier, then enter a purchase order number before going offline.");
                if(!lines.length || lines.some(line=>!line.medicine_name||!Number.isInteger(line.quantity)||line.quantity<1||!Number.isFinite(line.unit_cost)||line.unit_cost<0)) throw new Error("Complete every medicine line with a name, whole quantity above zero and valid unit cost.");
                const queue=await readQueue(context);
                if(queue.length>=20) throw new Error("Offline queue limit is 20 purchase orders.");
                if(queue.some(item=>item.poNumber===poNumber)) throw new Error("That purchase order number is already in the offline queue.");
                queue.push({
                    id:crypto.randomUUID(),poNumber,supplierId,supplierLabel,lines,
                    expectedDeliveryDate:document.getElementById("pharmacyOrderDeliveryDate").value||null,
                    notes:document.getElementById("pharmacyOrderNotes").value.trim()||null,
                    capturedAt:new Date().toISOString(),status:"Draft — not submitted"
                });
                await encryptQueue(queue,context);
                render(queue);
                say("Encrypted offline purchase order saved. No stock has changed and no order has been submitted.");
            } catch(error) { console.error("Offline pharmacy queue save:",error);say(error.message||"Could not save offline pharmacy draft.",true); }
            finally { saveButton.disabled=false; }
        });
        if(syncButton) syncButton.addEventListener("click",async()=>{
            syncButton.disabled=true;
            try {
                if(!navigator.onLine) throw new Error("Reconnect to the internet before syncing pharmacy purchase orders.");
                const context=getPharmacyContext();
                const queue=await readQueue(context);
                if(!queue.length) {say("There are no pharmacy purchase orders waiting to sync.");return;}
                const review=queue.map((item,index)=>(index+1)+". "+item.poNumber+" — "+item.supplierLabel+" — "+item.lines.length+" medicine line(s)").join("\n");
                if(!window.confirm("Review these orders before submission:\n\n"+review+"\n\nEach order will be submitted for normal owner/admin approval. Continue?")) return;
                const remaining=[];
                let submitted=0;
                for(const item of queue) {
                    try {
                        const result=await supabaseClient.rpc("create_pharmacy_purchase_order_with_items",{
                            p_clinic_id:context.clinicId,p_supplier_id:item.supplierId,p_po_number:item.poNumber,
                            p_items:item.lines,p_expected_delivery_date:item.expectedDeliveryDate,p_notes:item.notes
                        });
                        if(result.error) throw result.error;
                        submitted++;
                    } catch(error) {
                        item.status="Sync failed: "+(error.message||"Review required");
                        remaining.push(item);
                    }
                }
                await encryptQueue(remaining,context);
                render(remaining);
                say(submitted+" purchase order(s) submitted for owner/admin approval. "+remaining.length+" remain queued for review.",remaining.length>0);
                if(submitted) await loadPharmacyProcurementWorkspace();
            } catch(error) { console.error("Offline pharmacy queue sync:",error);say(error.message||"Pharmacy sync failed.",true); }
            finally { syncButton.disabled=false; }
        });
        if(eraseButton) eraseButton.addEventListener("click",async()=>{
            if(!window.confirm("Erase all offline pharmacy purchase order drafts from this device?")) return;
            try { await setValue(QUEUE_ID,null);render([]);say("Offline pharmacy queue erased from this device."); }
            catch(error) {say(error.message||"Could not erase offline queue.",true);}
        });
        window.addEventListener("online",()=>{say("Connection restored. Review queued pharmacy purchase orders and choose sync when ready.");});
        if(body) {
            try { if(typeof currentUser!=="undefined"&&currentUser&&typeof currentClinic!=="undefined"&&currentClinic) void readQueue(getPharmacyContext()); }
            catch(error) { console.warn("Offline pharmacy queue awaits clinic sign-in.",error); }
        }
    })();
    // END ENCRYPTED OFFLINE PHARMACY PURCHASE ORDER DRAFT QUEUE

    // END PHARMACY PROCUREMENT WORKSPACE

})();
// ============================================================
// HEALTHOS AI: LIVE OPERATIONAL REPORTS
// ============================================================

(function () {
    "use strict";

    function setReportValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(value);
        }
    }

    function addReportRow(body, label, value) {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        const valueCell = document.createElement("td");

        labelCell.textContent = label;
        valueCell.textContent = String(value);

        row.appendChild(labelCell);
        row.appendChild(valueCell);

        body.appendChild(row);
    }

    function localDateString(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function formatNaira(amount) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2
        }).format(amount);
    }

    async function loadOperationalReports() {
        const status = document.getElementById("reportsStatus");
        const body = document.getElementById("reportsDetailsBody");

        if (!body) return;

        try {
            if (!supabaseClient || !currentUser) {
                throw new Error(
                    "Please sign in before loading operational reports."
                );
            }

            if (!currentClinic || !currentClinic.id) {
                throw new Error(
                    "Select a clinic before loading operational reports."
                );
            }

            if (status) {
                status.textContent = "Loading live clinic data...";
            }

            body.replaceChildren();

            const clinicId = currentClinic.id;

            const results = await Promise.all([
                supabaseClient
                    .from("appointments")
                    .select("id,status,scheduled_at")
                    .eq("clinic_id", clinicId),

                supabaseClient
                    .from("billing_transactions")
                    .select(
                        "invoice_amount,amount_paid,payment_status"
                    )
                    .eq("clinic_id", clinicId),

                supabaseClient
                    .from("pharmacy_inventory")
                    .select(
                        "id,quantity,reorder_level,expiry_date"
                    )
                    .eq("clinic_id", clinicId)
            ]);

            const failedResult = results.find(
                result => result.error
            );

            if (failedResult) {
                throw failedResult.error;
            }

            const appointments = results[0].data || [];
            const invoices = results[1].data || [];
            const inventory = results[2].data || [];

            const today = localDateString(new Date());

            const dateLimit = new Date();
            dateLimit.setHours(0, 0, 0, 0);
            dateLimit.setDate(dateLimit.getDate() + 30);

            const expiryLimit = localDateString(dateLimit);

            const todayAppointments = appointments.filter(item =>
                item.scheduled_at &&
                String(item.scheduled_at).slice(0, 10) === today
            ).length;

            const outstandingInvoices = invoices.filter(item =>
                !["void", "refunded"].includes(item.payment_status) &&
                Number(item.invoice_amount || 0) >
                Number(item.amount_paid || 0)
            );

            const outstandingAmount = outstandingInvoices.reduce(
                (total, item) => {
                    if (
                        ["void", "refunded"].includes(
                            item.payment_status
                        )
                    ) {
                        return total;
                    }

                    return total + Math.max(
                        0,
                        Number(item.invoice_amount || 0) -
                        Number(item.amount_paid || 0)
                    );
                },
                0
            );

            const expiredItems = inventory.filter(item =>
                item.expiry_date < today
            );

            const expiringItems = inventory.filter(item =>
                item.expiry_date >= today &&
                item.expiry_date <= expiryLimit
            );

            const lowStockItems = inventory.filter(item =>
                item.expiry_date >= today &&
                Number(item.quantity) <=
                Number(item.reorder_level)
            );

            setReportValue(
                "reportAppointmentCount",
                appointments.length
            );

            setReportValue(
                "reportOutstandingAmount",
                formatNaira(outstandingAmount)
            );

            setReportValue(
                "reportInventoryCount",
                inventory.length
            );

            addReportRow(
                body,
                "Appointments scheduled today",
                todayAppointments
            );

            addReportRow(
                body,
                "Total recorded appointments",
                appointments.length
            );

            addReportRow(
                body,
                "Invoices with outstanding balances",
                outstandingInvoices.length
            );

            addReportRow(
                body,
                "Total outstanding billing",
                formatNaira(outstandingAmount)
            );

            addReportRow(
                body,
                "Registered pharmacy batches",
                inventory.length
            );

            addReportRow(
                body,
                "Low-stock medicine batches",
                lowStockItems.length
            );

            addReportRow(
                body,
                "Batches expiring within 30 days",
                expiringItems.length
            );

            addReportRow(
                body,
                "Expired medicine batches — do not dispense",
                expiredItems.length
            );

            if (status) {
                status.textContent =
                    "Reports loaded successfully for the selected clinic.";
            }

        } catch (error) {
            console.error(
                "HealthOS operational reports error:",
                error
            );

            body.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 2;
            cell.textContent =
                "Reports could not load. Check your sign-in, clinic access, and database permissions.";

                    row.appendChild(cell);
            body.appendChild(row);
        }
    }

    // Make the report loader available for internal use.
    window.loadHealthOSOperationalReports = loadOperationalReports;

    // Load reports when the Reports navigation item is selected.
    document.querySelectorAll(".sidebar .nav-item").forEach(
        function (link) {
            link.addEventListener("click", function () {
                const target = (
                    link.getAttribute("href") || ""
                ).replace(/^#/, "");

                if (target === "reports") {
                    void loadOperationalReports();
                }
            });
        }
    );

    console.log(
        "HealthOS operational reports module initialized."
    );
})();

 
// HEALTHOS AI: DEPARTMENT TRANSACTION CAPTURE
(function () {
    "use strict";
    const form = document.getElementById("posReceiptUploadForm");
    if (!form) return;
    const fileInput = document.getElementById("posReceiptFile");
    const message = document.getElementById("posReceiptUploadMessage");
    const button = document.getElementById("posReceiptUploadButton");
    const rows = document.getElementById("posReceiptRows");
    const storageProvider = "backblaze_b2";
    // Reuse capabilities when the staff workspace already loaded them.
    // Admin sidebar navigation can call loadReceipts() without passing capabilities,
    // so resolve them here as well instead of silently treating the user as non-admin.
    let activeCapabilities = window.healthOSTransactionCapabilities || null;
    let capabilitiesResolved = Boolean(activeCapabilities);
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    function setMessage(text, type) {
        message.textContent = text;
        message.className = "message" + (type ? " " + type : "");
    }

    async function hashFile(file) {
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        return Array.from(new Uint8Array(digest))
            .map(byte => byte.toString(16).padStart(2, "0")).join("");
    }

    async function loadReceipts(capabilities) {
        if (!supabaseClient || !currentClinic || !currentUser) return;
        if (capabilities) {
            activeCapabilities = capabilities;
            capabilitiesResolved = true;
            window.healthOSTransactionCapabilities = capabilities;
        }
        if (!capabilitiesResolved) {
            const { data: resolved, error: capabilityError } = await supabaseClient.rpc(
                "get_my_transaction_capabilities",
                { p_clinic_id: currentClinic.id }
            );
            if (capabilityError) throw capabilityError;
            activeCapabilities = resolved || {};
            capabilitiesResolved = true;
            window.healthOSTransactionCapabilities = activeCapabilities;
        }
        capabilities = activeCapabilities || {};
        rows.replaceChildren();
        const { data, error } = await supabaseClient.from("pos_receipts")
            .select("id,created_at,payment_provider,transaction_reference,amount,ocr_status,ocr_raw,source_file_path,payment_method,invoice_reference,capture_channel,acceptance_status,captured_department,uploaded_by,accepted_by,accepted_at,reconciliation_status")
            .eq("clinic_id", currentClinic.id)
            .order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        const adminAuditView = capabilities && capabilities.scope === "hospital";
        const headerRow = document.querySelector("#posReconciliation thead tr");
        const auditHeaders = ["Captured department", "Captured by", "Accepted by", "Accepted at", "Reconciliation"];
        if (headerRow) {
            headerRow.querySelectorAll("[data-admin-audit-column]").forEach(node => node.remove());
            if (adminAuditView) {
                auditHeaders.forEach(label => {
                    const th = document.createElement("th");
                    th.textContent = label;
                    th.setAttribute("data-admin-audit-column", "true");
                    headerRow.appendChild(th);
                });
            }
        }
        if (!data || !data.length) {
            rows.innerHTML = '<tr><td colspan="' + (adminAuditView ? "12" : "7") + '">No transactions recorded yet.</td></tr>';
            return;
        }

        // Admin audit view should show staff names and departments, not raw auth UUIDs.
        const staffByUserId = new Map();
        if (adminAuditView) {
            const userIds = [...new Set(data.flatMap(record =>
                [record.uploaded_by, record.accepted_by].filter(Boolean)
            ))];
            if (userIds.length) {
                const { data: staffProfiles, error: staffProfilesError } = await supabaseClient
                    .from("staff_profiles")
                    .select("user_id,full_name,department,professional_role")
                    .eq("clinic_id", currentClinic.id)
                    .in("user_id", userIds);
                if (staffProfilesError) throw staffProfilesError;
                (staffProfiles || []).forEach(profile => {
                    staffByUserId.set(profile.user_id, profile);
                });
            }
        }

        function formatAuditStaff(userId) {
            if (!userId) return "—";
            const profile = staffByUserId.get(userId);
            if (!profile) return "Staff profile unavailable";
            const name = profile.full_name || "Unnamed staff";
            const department = profile.department ? " — " + profile.department : "";
            return name + department;
        }

        data.forEach(record => {
            const tr = document.createElement("tr");
            [
                new Date(record.created_at).toLocaleString(),
                record.payment_provider || "—",
                record.transaction_reference || record.invoice_reference || "—",
                record.amount == null ? "—" : "₦" + Number(record.amount).toLocaleString(),
                record.payment_method || "—"
            ].forEach(value => {
                const td = document.createElement("td");
                td.textContent = String(value);
                tr.appendChild(td);
            });
            const td = document.createElement("td");
            if (record.source_file_path) {
                const openButton = document.createElement("button");
                openButton.type = "button";
                openButton.className = "secondary-button";
                openButton.textContent = "View evidence";
                openButton.addEventListener("click", async () => {
                    try {
                        if (record.ocr_raw && record.ocr_raw.storage_provider === storageProvider) {
                            const { data: link, error: linkError } = await supabaseClient.functions.invoke(
                                "healthos-b2-storage",
                                { body: { action: "create-download", receiptId: record.id, clinicId: currentClinic.id, purpose: "pos_receipt" } }
                            );
                            if (linkError) throw linkError;
                            if (!link || !link.downloadUrl) throw new Error("Secure B2 download link was not returned.");
                            const evidenceLink = document.createElement("a");
                            evidenceLink.href = link.downloadUrl;
                            evidenceLink.target = "_blank";
                            evidenceLink.rel = "noopener noreferrer";
                            evidenceLink.style.display = "none";
                            document.body.appendChild(evidenceLink);
                            evidenceLink.click();
                            evidenceLink.remove();
                        } else {
                            // Backward compatibility: older receipts remain in the legacy Supabase bucket.
                            const { data: signed, error: signedError } =
                                await supabaseClient.storage.from("pos-receipt-evidence").createSignedUrl(record.source_file_path, 60);
                            if (signedError) throw signedError;
                            window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
                        }
                    } catch (e) {
                        setMessage("Could not open evidence: " + (e.message || "Storage error"), "error");
                    }
                });
                td.appendChild(openButton);
                const status = document.createElement("small");
                status.textContent = " OCR review: " + (record.ocr_status || "pending");
                td.appendChild(status);
                if (capabilities && (capabilities.can_review || capabilities.can_accept) &&
                    ["pending", "processing", "extracted", "needs_review"].includes(record.ocr_status || "pending")) {
                    const reviewButton = document.createElement("button");
                    reviewButton.type = "button";
                    reviewButton.className = "secondary-button";
                    reviewButton.textContent = "Review receipt fields";
                    reviewButton.addEventListener("click", async () => {
                        const providerValue = prompt("Provider / bank read from receipt:", record.payment_provider || "");
                        if (providerValue === null) return;
                        const referenceValue = prompt("Transaction reference read from receipt:", record.transaction_reference || "");
                        if (referenceValue === null) return;
                        const amountValue = prompt("Amount read from receipt (NGN):", record.amount == null ? "" : String(record.amount));
                        if (amountValue === null) return;
                        const dateValue = prompt("Transaction date/time read from receipt (ISO or leave blank):", "");
                        if (dateValue === null) return;
                        const noteValue = prompt("Review note: explain what you checked (required):", "");
                        if (noteValue === null || noteValue.trim().length < 3) {
                            setMessage("A review note of at least 3 characters is required.", "error");
                            return;
                        }
                        const extractedAmount = amountValue.trim() === "" ? null : Number(amountValue);
                        if (extractedAmount !== null && (!Number.isFinite(extractedAmount) || extractedAmount < 0)) {
                            setMessage("Enter a valid non-negative amount read from the receipt.", "error");
                            return;
                        }
                        const matches = extractedAmount !== null && Number(record.amount) === extractedAmount &&
                            (referenceValue.trim() || "") === (record.transaction_reference || "") &&
                            (providerValue.trim() || "") === (record.payment_provider || "");
                        const decision = matches ? "verified" : "needs_review";
                        if (!confirm(matches
                            ? "The manually read amount, reference and provider match the submitted transaction. Mark receipt fields verified? This does not confirm bank settlement."
                            : "One or more receipt fields differ from the submitted transaction. Flag this receipt for further review?")) return;
                        reviewButton.disabled = true;
                        try {
                            const { error: reviewError } = await supabaseClient.rpc("review_pos_receipt_ocr", {
                                p_clinic_id: currentClinic.id,
                                p_receipt_id: record.id,
                                p_decision: decision,
                                p_extracted_fields: {
                                    payment_provider: providerValue.trim() || null,
                                    transaction_reference: referenceValue.trim() || null,
                                    amount: extractedAmount,
                                    transaction_at_text: dateValue.trim() || null
                                },
                                p_review_note: noteValue.trim()
                            });
                            if (reviewError) throw reviewError;
                            setMessage(decision === "verified"
                                ? "Receipt fields manually verified. Bank settlement still requires reconciliation."
                                : "Receipt flagged for further review because the manually read fields differ.", "success");
                            await loadReceipts(capabilities);
                        } catch (error) {
                            setMessage("Receipt review failed: " + error.message, "error");
                            reviewButton.disabled = false;
                        }
                    });
                    td.appendChild(document.createElement("br"));
                    td.appendChild(reviewButton);
                }
            } else {
                td.textContent = "Evidence missing";
            }
            tr.appendChild(td);

            const acceptanceCell = document.createElement("td");
            const statusText = document.createElement("span");
            statusText.textContent = record.acceptance_status || "awaiting_acceptance";
            acceptanceCell.appendChild(statusText);
            if (capabilities && capabilities.can_accept &&
                (record.acceptance_status || "awaiting_acceptance") === "awaiting_acceptance") {
                const acceptButton = document.createElement("button");
                acceptButton.type = "button";
                acceptButton.className = "secondary-button";
                acceptButton.textContent = "Accept transaction";
                acceptButton.addEventListener("click", async () => {
                    acceptButton.disabled = true;
                    const { error: acceptError } = await supabaseClient.rpc(
                        "accept_department_transaction",
                        {
                            p_clinic_id: currentClinic.id,
                            p_transaction_id: record.id,
                            p_notes: null
                        }
                    );
                    if (acceptError) {
                        setMessage("Transaction acceptance failed: " + acceptError.message, "error");
                        acceptButton.disabled = false;
                        return;
                    }
                    setMessage("Transaction accepted. Bank settlement still requires reconciliation.", "success");
                    await loadReceipts(capabilities);
                });
                acceptanceCell.appendChild(document.createElement("br"));
                acceptanceCell.appendChild(acceptButton);
            }
            tr.appendChild(acceptanceCell);
            if (adminAuditView) {
                const auditValues = [
                    record.captured_department || "—",
                    formatAuditStaff(record.uploaded_by),
                    formatAuditStaff(record.accepted_by),
                    record.accepted_at ? new Date(record.accepted_at).toLocaleString() : "—",
                    record.reconciliation_status || "unmatched"
                ];
                auditValues.forEach(value => {
                    const auditCell = document.createElement("td");
                    auditCell.textContent = value;
                    auditCell.setAttribute("data-admin-audit-column", "true");
                    tr.appendChild(auditCell);
                });
            }
            rows.appendChild(tr);
        });
    }

    window.loadDepartmentTransactionCapture = loadReceipts;

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!supabaseClient || !currentClinic || !currentUser) {
            setMessage("Sign in and open your clinic workspace first.", "error");
            return;
        }
        const file = fileInput.files && fileInput.files[0];
        if (file && (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024)) {
            setMessage("Evidence must be JPG, PNG, WebP or PDF and no larger than 10 MB.", "error");
            return;
        }
        const method = document.getElementById("posPaymentMethod").value;
        const amountText = document.getElementById("posReceiptAmount").value.trim();
        const amount = amountText === "" ? null : Number(amountText);
        if (!method || amount === null || !Number.isFinite(amount) || amount <= 0) {
            setMessage("Select the payment method and enter the transaction amount.", "error");
            return;
        }
        button.disabled = true;
        setMessage("Recording transaction securely…");
        try {
            const { data: session, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError || !session.session) throw new Error("Session expired. Sign in again.");
            let path = null;
            let digest = null;
            if (file) {
                const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[file.type];
                digest = await hashFile(file);
                const { data: ticket, error: ticketError } = await supabaseClient.functions.invoke(
                    "healthos-b2-storage",
                    {
                        body: {
                            action: "create-upload",
                            fileName: file.name,
                            contentType: file.type,
                            sizeBytes: file.size,
                            clinicId: currentClinic.id,
                            purpose: "pos_receipt"
                        }
                    }
                );
                if (ticketError) throw ticketError;
                if (!ticket || !ticket.uploadUrl || !ticket.objectKey) {
                    throw new Error("Backblaze did not return secure upload details.");
                }
                const uploaded = await fetch(ticket.uploadUrl, {
                    method: "PUT",
                    headers: ticket.requiredHeaders || { "Content-Type": file.type },
                    body: file
                });
                if (!uploaded.ok) {
                    throw new Error("Backblaze receipt upload failed (HTTP " + uploaded.status + ").");
                }
                path = ticket.objectKey;
            }
            const dateText = document.getElementById("posReceiptDate").value;
            const provider = document.getElementById("posReceiptProvider").value.trim() || null;
            const record = {
                clinic_id: currentClinic.id,
                uploaded_by: currentUser.id,
                source_file_path: path,
                file_sha256: digest,
                payment_provider: provider,
                transaction_reference: document.getElementById("posReceiptReference").value.trim() || null,
                amount,
                currency: "NGN",
                transaction_at: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
                transaction_status: "reported_by_staff",
                payment_method: method,
                invoice_reference: document.getElementById("posInvoiceReference").value.trim() || null,
                patient_reference: document.getElementById("posPatientReference").value.trim() || null,
                capture_channel: file ? "receipt_upload" : "manual_entry",
                ocr_status: file ? "pending" : "not_applicable",
                ocr_raw: {
                    capture_method: file ? "staff_receipt_upload" : "staff_manual_entry",
                    original_file_name: file ? file.name : null,
                    mime_type: file ? file.type : null,
                    size_bytes: file ? file.size : null,
                    storage_provider: file ? storageProvider : null
                }
            };
            const { error: insertError } = await supabaseClient.from("pos_receipts").insert(record);
            if (insertError) throw insertError;
            form.reset();
            setMessage("Transaction recorded. It is awaiting Accounts verification; settlement is not confirmed.", "success");
            await loadReceipts(activeCapabilities);
        } catch (error) {
            console.error("Department transaction capture failed:", error);
            setMessage("Could not record transaction: " + (error.message || "Check your department permission."), "error");
        } finally {
            button.disabled = false;
        }
    });

    document.querySelectorAll(".sidebar .nav-item").forEach(link => {
        link.addEventListener("click", () => {
            if (link.getAttribute("href") === "#posReconciliation") {
                loadReceipts().catch(error => {
                    console.error("Department transaction list failed:", error);
                    setMessage("Transactions could not load. Check your access.", "error");
                });
            }
        });
    });
    // ENCRYPTED OFFLINE DEPARTMENT PAYMENT REPORT QUEUE
    (function initOfflineDepartmentTransactionQueue() {
        const DB_NAME="healthos_offline_department_tx_v1", STORE="secure_queue";
        const KEY_ID="department_tx_key", QUEUE_ID="department_tx_queue";
        const status=document.getElementById("offlinePosStatus");
        const body=document.getElementById("offlinePosRows");
        const save=document.getElementById("offlinePosSaveButton");
        const sync=document.getElementById("offlinePosSyncButton");
        const erase=document.getElementById("offlinePosEraseButton");
        let dbPromise;
        function openDb(){
            if(dbPromise)return dbPromise;
            dbPromise=new Promise((resolve,reject)=>{
                const req=indexedDB.open(DB_NAME,1);
                req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
                req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
            });return dbPromise;
        }
        async function get(key){
            const db=await openDb();return new Promise((resolve,reject)=>{
                const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).get(key);
                req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
            });
        }
        async function put(key,value){
            const db=await openDb();return new Promise((resolve,reject)=>{
                const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(value,key);
                tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
            });
        }
        async function key(){
            let k=await get(KEY_ID);
            if(!k){k=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);await put(KEY_ID,k);}
            return k;
        }
        function say(message,error=false){
            if(!status)return;status.textContent=message;status.className="message "+(error?"error":"success");
        }
        async function saveEncrypted(items,ctx){
            const iv=crypto.getRandomValues(new Uint8Array(12));
            const bytes=new TextEncoder().encode(JSON.stringify({userId:ctx.userId,clinicId:ctx.clinicId,expiresAt:Date.now()+8*60*60*1000,items}));
            const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(),bytes);
            await put(QUEUE_ID,{iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))});
        }
        async function readQueue(ctx){
            const stored=await get(QUEUE_ID);if(!stored)return [];
            const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(stored.iv)},await key(),new Uint8Array(stored.cipher));
            const data=JSON.parse(new TextDecoder().decode(plain));
            if(data.userId!==ctx.userId||data.clinicId!==ctx.clinicId||data.expiresAt<Date.now()){
                await put(QUEUE_ID,null);throw new Error("Queue expired or belongs to another user/clinic. It has been cleared.");
            }
            return Array.isArray(data.items)?data.items:[];
        }
        function render(items){
            if(!body)return;body.replaceChildren();
            if(!items.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="No queued transactions.";tr.appendChild(td);body.appendChild(tr);return;}
            items.forEach(item=>{
                const tr=document.createElement("tr");
                [new Date(item.capturedAt).toLocaleString(),item.paymentMethod,item.transactionReference||item.invoiceReference||"—","₦"+Number(item.amount).toLocaleString(),item.syncStatus||"Draft — not submitted"]
                    .forEach(value=>{const td=document.createElement("td");td.textContent=String(value);tr.appendChild(td);});
                body.appendChild(tr);
            });
        }
        async function refresh(){
            const ctx={userId:currentUser.id,clinicId:currentClinic.id};
            const items=await readQueue({userId:ctx.userId,clinicId:ctx.clinicId});render(items);return items;
        }
        if(save)save.addEventListener("click",async()=>{
            save.disabled=true;
            try{
                if(!window.crypto||!crypto.subtle||!window.indexedDB)throw new Error("Encrypted offline storage is unavailable in this browser.");
                const ctx={userId:currentUser.id,clinicId:currentClinic.id};
                const method=document.getElementById("posPaymentMethod").value;
                const amount=Number(document.getElementById("posReceiptAmount").value);
                if(!method||!Number.isFinite(amount)||amount<=0)throw new Error("Select a payment method and enter a valid amount above zero.");
                if(fileInput&&fileInput.files&&fileInput.files.length)throw new Error("Remove the receipt file before saving offline. Evidence upload requires an internet connection.");
                const dateText=document.getElementById("posReceiptDate").value;
                const items=await refresh();
                if(items.length>=50)throw new Error("Offline queue limit is 50 transaction reports.");
                const record={
                    id:crypto.randomUUID(),clinic_id:ctx.clinicId,uploaded_by:ctx.userId,
                    payment_provider:document.getElementById("posReceiptProvider").value.trim()||null,
                    transaction_reference:document.getElementById("posReceiptReference").value.trim()||null,
                    amount,currency:"NGN",transaction_at:dateText?new Date(dateText).toISOString():new Date().toISOString(),
                    transaction_status:"reported_by_staff",payment_method:method,
                    invoice_reference:document.getElementById("posInvoiceReference").value.trim()||null,
                    patient_reference:document.getElementById("posPatientReference").value.trim()||null,
                    capture_channel:"manual_entry",ocr_status:"not_applicable",
                    ocr_raw:{capture_method:"offline_staff_manual_entry",offline_captured:true},
                    capturedAt:new Date().toISOString(),syncStatus:"Draft — not submitted"
                };
                items.push(record);await saveEncrypted(items,ctx);render(items);
                form.reset();say("Transaction report encrypted on this device. It has NOT been submitted, accepted or reconciled.");
            }catch(error){console.error("Offline department transaction save:",error);say(error.message||"Could not save offline transaction.",true);}
            finally{save.disabled=false;}
        });
        if(sync)sync.addEventListener("click",async()=>{
            sync.disabled=true;
            try{
                if(!navigator.onLine)throw new Error("Reconnect to the internet before syncing transaction reports.");
                const ctx={userId:currentUser.id,clinicId:currentClinic.id},items=await refresh();
                if(!items.length){say("No queued transaction reports to sync.");return;}
                const summary=items.map((item,i)=>(i+1)+". ₦"+Number(item.amount).toLocaleString()+" — "+item.paymentMethod+" — "+(item.transactionReference||item.invoiceReference||"No reference")).join("\n");
                if(!window.confirm("Review the transaction reports below. They will be submitted as staff-reported transactions and remain awaiting acceptance/reconciliation.\n\n"+summary+"\n\nContinue?"))return;
                const remaining=[];let sent=0;
                for(const item of items){
                    const payload={...item};delete payload.capturedAt;delete payload.syncStatus;
                    try{
                        const result=await supabaseClient.from("pos_receipts").insert(payload);
                        if(result.error)throw result.error;sent++;
                    }catch(error){item.syncStatus="Sync failed: "+(error.message||"Review required");remaining.push(item);}
                }
                await saveEncrypted(remaining,ctx);render(remaining);
                say(sent+" transaction report(s) submitted. They still require department acceptance and Accounts reconciliation. "+remaining.length+" remain queued.",remaining.length>0);
                if(sent)await loadReceipts(activeCapabilities);
            }catch(error){console.error("Offline department transaction sync:",error);say(error.message||"Sync failed.",true);}
            finally{sync.disabled=false;}
        });
        if(erase)erase.addEventListener("click",async()=>{
            if(!window.confirm("Permanently erase the offline transaction queue from this device?"))return;
            try{await put(QUEUE_ID,null);render([]);say("Offline transaction queue erased from this device.");}
            catch(error){say(error.message||"Could not erase queue.",true);}
        });
        window.addEventListener("online",()=>say("Connection restored. Review and sync queued transaction reports when ready."));
        try{if(typeof currentUser!=="undefined"&&currentUser&&typeof currentClinic!=="undefined"&&currentClinic)void refresh().catch(()=>{});}
        catch(error){console.warn("Offline transaction queue waits for clinic sign-in.",error);}
    })();
    // END ENCRYPTED OFFLINE DEPARTMENT PAYMENT REPORT QUEUE

    console.log("HealthOS department transaction capture initialized.");
})();

 
// HEALTHOS AI: ACCOUNTS BANK STATEMENT IMPORT
(function () {
    "use strict";
    const panel = document.getElementById("bankStatementImportPanel");
    const form = document.getElementById("bankStatementImportForm");
    if (!panel || !form) return;

    const fileInput = document.getElementById("bankStatementFile");
    const message = document.getElementById("bankStatementImportMessage");
    const button = document.getElementById("bankStatementImportButton");
    const historyRows = document.getElementById("bankStatementImportRows");
    const transactionRows = document.getElementById("bankStatementTransactionRows");
    const bucket = "bank-statement-evidence";
    const allowedTypes = ["text/csv", "application/vnd.ms-excel", "application/csv"];

    function setImportMessage(text, type) {
        message.textContent = text;
        message.className = "message" + (type ? " " + type : "");
    }

    function addCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = value == null || value === "" ? "—" : String(value);
        row.appendChild(cell);
    }

    async function loadBankStatementData() {
        if (!supabaseClient || !currentClinic || !currentUser) return;
        const { data: imports, error: importError } = await supabaseClient
            .from("bank_statement_imports")
            .select("id,created_at,bank_or_provider,account_label,period_start,period_end,import_status,row_count,storage_provider")
            .eq("clinic_id", currentClinic.id)
            .order("created_at", { ascending: false })
            .limit(20);
        if (importError) throw importError;

        historyRows.replaceChildren();
        if (!imports || imports.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No bank statements imported yet.";
            row.appendChild(cell);
            historyRows.appendChild(row);
            transactionRows.replaceChildren();
            const empty = document.createElement("tr");
            const emptyCell = document.createElement("td");
            emptyCell.colSpan = 6;
            emptyCell.textContent = "No imported bank transactions yet.";
            empty.appendChild(emptyCell);
            transactionRows.appendChild(empty);
            await loadReconciliationWorkspace();
            return;
        }

        imports.forEach(item => {
            const row = document.createElement("tr");
            addCell(row, new Date(item.created_at).toLocaleString());
            addCell(row, item.bank_or_provider);
            addCell(row, item.account_label);
            addCell(row, [item.period_start || "", item.period_end || ""].filter(Boolean).join(" to ") || "—");
            addCell(row, item.row_count == null ? "—" : item.row_count);
            addCell(row, item.import_status);
            const actionCell = document.createElement("td");
            if (item.storage_provider === "backblaze_b2") {
                const downloadButton = document.createElement("button");
                downloadButton.type = "button";
                downloadButton.className = "secondary-button";
                downloadButton.textContent = "Download evidence";
                downloadButton.addEventListener("click", async () => {
                    downloadButton.disabled = true;
                    try {
                        const { data: ticket, error } = await supabaseClient.functions.invoke(
                            "healthos-b2-storage",
                            { body: { action: "create-download", importId: item.id, clinicId: currentClinic.id, purpose: "bank_statement" } }
                        );
                        if (error) throw error;
                        if (!ticket || !ticket.downloadUrl) throw new Error("Secure download link was not returned.");
                        window.open(ticket.downloadUrl, "_blank", "noopener,noreferrer");
                    } catch (downloadError) {
                        setImportMessage("Evidence download failed: " + (downloadError.message || "Please retry."), "error");
                    } finally {
                        downloadButton.disabled = false;
                    }
                });
                actionCell.appendChild(downloadButton);
            } else {
                actionCell.textContent = "Legacy evidence";
            }
            row.appendChild(actionCell);
            historyRows.appendChild(row);
        });

        const importIds = imports.map(item => item.id);
        const { data: transactions, error: transactionError } = await supabaseClient
            .from("bank_statement_transactions")
            .select("import_id,bank_reference,description,amount,currency,booked_at,transaction_type")
            .eq("clinic_id", currentClinic.id)
            .in("import_id", importIds)
            .order("booked_at", { ascending: false })
            .limit(100);
        if (transactionError) throw transactionError;

        transactionRows.replaceChildren();
        if (!transactions || transactions.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No transaction rows were returned for these imports.";
            row.appendChild(cell);
            transactionRows.appendChild(row);
            return;
        }
        transactions.forEach(item => {
            const row = document.createElement("tr");
            addCell(row, item.booked_at ? new Date(item.booked_at).toLocaleString() : "—");
            addCell(row, item.bank_reference);
            addCell(row, item.description);
            addCell(row, item.transaction_type);
            addCell(row, item.amount == null ? "—" : Number(item.amount).toLocaleString());
            addCell(row, item.currency || "NGN");
            transactionRows.appendChild(row);
        });

        await loadReconciliationWorkspace();
    }

    const reconciliationPanel = document.getElementById("posBankReconciliationWorkspace");
    const reconciliationRows = document.getElementById("posReconciliationMatchRows");
    const reconciliationMessage = document.getElementById("reconciliationMessage");
    const generateMatchesButton = document.getElementById("generateReconciliationMatches");
    const closingDateInput = document.getElementById("financialClosingDate");
    const closingButton = document.getElementById("generateDailyFinancialClosing");
    const closingMessage = document.getElementById("financialClosingMessage");
    const closingRows = document.getElementById("dailyFinancialClosingRows");

    function setClosingMessage(message, type) {
        if (!closingMessage) return;
        closingMessage.textContent = message;
        closingMessage.className = "message" + (type ? " " + type : "");
    }

    function closingMoney(value, currency) {
        const amount = Number(value || 0);
        try {
            return new Intl.NumberFormat("en-NG", { style: "currency", currency: currency || "NGN", maximumFractionDigits: 2 }).format(amount);
        } catch (_) {
            return (currency || "") + " " + amount.toLocaleString("en-NG", { maximumFractionDigits: 2 });
        }
    }

    function renderDailyClosingRows(items) {
        if (!closingRows) return;
        closingRows.replaceChildren();
        if (!items || !items.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 9;
            td.textContent = "No closing snapshots are available.";
            tr.appendChild(td);
            closingRows.appendChild(tr);
            return;
        }
        items.forEach(item => {
            const s = item.summary || {};
            const billing = s.billing || {};
            const pos = s.accepted_pos_receipts || {};
            const bank = s.bank_statement || {};
            const cash = s.department_cash || {};
            const refunds = s.refunds || {};
            const tr = document.createElement("tr");
            const values = [
                item.business_date + " / " + item.currency,
                closingMoney(billing.invoiced_amount, item.currency),
                closingMoney(billing.amount_paid_recorded, item.currency),
                closingMoney(pos.amount, item.currency),
                closingMoney(bank.credits, item.currency),
                closingMoney(bank.debits, item.currency),
                closingMoney(cash.declared_amount, item.currency),
                closingMoney(cash.bank_verified_deposit_amount, item.currency),
                closingMoney(refunds.pending_amount, item.currency) + " / " +
                    closingMoney(refunds.approved_amount, item.currency) + " / " +
                    closingMoney(refunds.processed_amount, item.currency)
            ];
            values.forEach(value => {
                const td = document.createElement("td");
                td.textContent = value;
                tr.appendChild(td);
            });
            closingRows.appendChild(tr);
        });
    }

    async function loadDailyClosingHistory() {
        if (!closingRows || !supabaseClient || !currentClinic) return;
        const { data, error } = await supabaseClient
            .from("healthos_daily_financial_closings")
            .select("id,business_date,currency,summary,generated_at")
            .eq("clinic_id", currentClinic.id)
            .order("generated_at", { ascending: false })
            .limit(30);
        if (error) throw error;
        renderDailyClosingRows(data || []);
    }

    if (closingDateInput) closingDateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
    if (closingButton) {
        closingButton.addEventListener("click", async () => {
            if (!currentClinic || !supabaseClient) return;
            const businessDate = closingDateInput && closingDateInput.value;
            if (!businessDate) {
                setClosingMessage("Select the hospital business date first.", "error");
                return;
            }
            closingButton.disabled = true;
            setClosingMessage("Generating the daily financial snapshot…");
            try {
                const { data, error } = await supabaseClient.rpc("healthos_generate_daily_financial_closing", {
                    p_clinic_id: currentClinic.id,
                    p_business_date: businessDate
                });
                if (error) throw error;
                renderDailyClosingRows(data || []);
                setClosingMessage("Daily closing snapshot generated and locked. Corrections require a new snapshot; previous snapshots remain unchanged.", "success");
                await loadDailyClosingHistory();
            } catch (error) {
                setClosingMessage("Could not generate the daily closing: " + (error.message || "Check Finance reconciliation permission."), "error");
            } finally {
                closingButton.disabled = false;
            }
        });
    }

    function setReconciliationMessage(text, type) {
        if (!reconciliationMessage) return;
        reconciliationMessage.textContent = text;
        reconciliationMessage.className = "message" + (type ? " " + type : "");
    }

    async function loadReconciliationWorkspace() {
        if (!reconciliationPanel || !supabaseClient || !currentClinic || !currentUser) return;
        const { data: capabilities, error: capabilityError } = await supabaseClient.rpc(
            "get_my_transaction_capabilities", { p_clinic_id: currentClinic.id }
        );
        if (capabilityError) throw capabilityError;
        if (!capabilities || capabilities.can_reconcile !== true) {
            reconciliationPanel.hidden = true;
            return;
        }
        reconciliationPanel.hidden = false;
        const { data: matches, error: matchesError } = await supabaseClient
            .from("pos_bank_reconciliation_matches")
            .select("id,pos_receipt_id,bank_transaction_id,match_method,confidence,review_status,proposed_at")
            .eq("clinic_id", currentClinic.id)
            .eq("review_status", "proposed")
            .order("proposed_at", { ascending: false })
            .limit(100);
        if (matchesError) throw matchesError;

        reconciliationRows.replaceChildren();
        if (!matches || matches.length === 0) {
            const empty = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 7;
            cell.textContent = "No proposed matches. Import a bank statement, then select Find potential matches.";
            empty.appendChild(cell);
            reconciliationRows.appendChild(empty);
            return;
        }

        const receiptIds = [...new Set(matches.map(match => match.pos_receipt_id))];
        const bankIds = [...new Set(matches.map(match => match.bank_transaction_id))];
        const [{ data: receipts, error: receiptError }, { data: bankItems, error: bankError }] = await Promise.all([
            supabaseClient.from("pos_receipts")
                .select("id,captured_department,transaction_reference,invoice_reference,amount,currency,payment_provider,transaction_at,created_at")
                .eq("clinic_id", currentClinic.id).in("id", receiptIds),
            supabaseClient.from("bank_statement_transactions")
                .select("id,bank_reference,external_transaction_id,description,amount,currency,booked_at")
                .eq("clinic_id", currentClinic.id).in("id", bankIds)
        ]);
        if (receiptError) throw receiptError;
        if (bankError) throw bankError;
        const receiptMap = new Map((receipts || []).map(item => [item.id, item]));
        const bankMap = new Map((bankItems || []).map(item => [item.id, item]));

        matches.forEach(match => {
            const receipt = receiptMap.get(match.pos_receipt_id);
            const bankItem = bankMap.get(match.bank_transaction_id);
            if (!receipt || !bankItem) return;
            const row = document.createElement("tr");
            const receiptDate = receipt.transaction_at || receipt.created_at;
            addCell(row, (receipt.captured_department || "Department") + " · " +
                (receiptDate ? new Date(receiptDate).toLocaleDateString() : "—"));
            addCell(row, receipt.transaction_reference || receipt.invoice_reference || "—");
            addCell(row, "₦" + Number(receipt.amount).toLocaleString() + " " + (receipt.currency || "NGN"));
            addCell(row, (bankItem.booked_at ? new Date(bankItem.booked_at).toLocaleString() : "—") +
                " · " + (bankItem.bank_reference || bankItem.external_transaction_id || bankItem.description || "—"));
            addCell(row, "₦" + Number(Math.abs(Number(bankItem.amount))).toLocaleString() + " " + (bankItem.currency || "NGN"));
            addCell(row, match.match_method.replace(/_/g, " ") + " · " +
                (match.confidence == null ? "—" : Number(match.confidence) + "%"));
            const decisionCell = document.createElement("td");
            const confirm = document.createElement("button");
            confirm.type = "button";
            confirm.className = "primary-button";
            confirm.textContent = "Confirm";
            const reject = document.createElement("button");
            reject.type = "button";
            reject.className = "secondary-button";
            reject.textContent = "Reject";
            async function review(decision, button) {
                button.disabled = true;
                try {
                    const { error } = await supabaseClient.rpc("review_pos_bank_reconciliation_match", {
                        p_match_id: match.id, p_decision: decision,
                        p_notes: decision === "confirm" ? "Finance manually confirmed against imported bank statement." : "Finance rejected proposed match."
                    });
                    if (error) throw error;
                    setReconciliationMessage(
                        decision === "confirm" ? "Match confirmed. The receipt is now marked reconciled." : "Proposed match rejected.",
                        "success"
                    );
                    await loadReconciliationWorkspace();
                    await loadBankStatementData();
                } catch (error) {
                    setReconciliationMessage("Review failed: " + (error.message || "Please retry."), "error");
                    button.disabled = false;
                }
            }
            confirm.addEventListener("click", () => review("confirm", confirm));
            reject.addEventListener("click", () => review("reject", reject));
            decisionCell.append(confirm, document.createTextNode(" "), reject);
            row.appendChild(decisionCell);
            reconciliationRows.appendChild(row);
        });
    }

    if (generateMatchesButton) {
        generateMatchesButton.addEventListener("click", async () => {
            generateMatchesButton.disabled = true;
            setReconciliationMessage("Checking accepted receipts against imported bank transactions…");
            try {
                const { data: count, error } = await supabaseClient.rpc(
                    "propose_pos_bank_reconciliation_matches", { p_clinic_id: currentClinic.id }
                );
                if (error) throw error;
                setReconciliationMessage(Number(count || 0) +
                    " new unambiguous suggestion(s) created. Finance must review each suggestion.", "success");
                await loadReconciliationWorkspace();
            } catch (error) {
                setReconciliationMessage("Could not generate suggestions: " + (error.message || "Check Finance permissions."), "error");
            } finally {
                generateMatchesButton.disabled = false;
            }
        });
    }


    // PAYMENT GATEWAY SETTLEMENT & FEE AUDITOR
    const settlementForm = document.getElementById("providerSettlementForm");
    const settlementRows = document.getElementById("providerSettlementRows");
    const settlementMessage = document.getElementById("providerSettlementMessage");
    const settlementRefresh = document.getElementById("refreshProviderSettlements");
    const settlementPropose = document.getElementById("proposeProviderBankMatches");
    function setSettlementMessage(text, type) {
        if (!settlementMessage) return;
        settlementMessage.textContent = text;
        settlementMessage.className = "message" + (type ? " " + type : "");
    }
    function settlementMoney(value, currency) {
        try { return new Intl.NumberFormat("en-NG", {style:"currency",currency:currency||"NGN"}).format(Number(value)||0); }
        catch (_) { return (currency||"") + " " + Number(value||0).toLocaleString("en-NG"); }
    }
    async function loadProviderSettlementRecords() {
        if (!settlementRows || !supabaseClient || !currentClinic || !currentUser) return;
        const {data,error} = await supabaseClient.from("healthos_provider_settlement_records")
            .select("id,provider_key,settlement_batch_reference,provider_transaction_reference,payment_reference,gross_amount,provider_fee,net_amount,currency,review_status,reconciliation_status,recorded_by,reviewed_by,bank_transaction_id,created_at")
            .eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(200);
        if(error) throw error;
        settlementRows.replaceChildren();
        if(!data?.length) {
            const tr=document.createElement("tr"),td=document.createElement("td");
            td.colSpan=9;td.textContent="No provider settlement lines have been recorded.";
            tr.appendChild(td);settlementRows.appendChild(tr);return;
        }
        data.forEach(item=>{
            const tr=document.createElement("tr");
            const vals=[
                item.provider_key+" / "+item.settlement_batch_reference,
                item.provider_transaction_reference+(item.payment_reference?" / "+item.payment_reference:""),
                settlementMoney(item.gross_amount,item.currency),settlementMoney(item.provider_fee,item.currency),
                settlementMoney(item.net_amount,item.currency),item.currency,
                item.review_status,item.reconciliation_status
            ];
            vals.forEach(v=>{const td=document.createElement("td");td.textContent=String(v??"—");tr.appendChild(td);});
            const actions=document.createElement("td");
            if(item.review_status==="pending" && item.recorded_by!==currentUser.id) {
                ["verify","reject"].forEach(decision=>{
                    const btn=document.createElement("button");btn.type="button";btn.className=decision==="verify"?"primary-button":"logout-button";
                    btn.textContent=decision==="verify"?"Verify evidence":"Reject evidence";
                    btn.addEventListener("click",async()=>{
                        btn.disabled=true;
                        try {
                            const {error}=await supabaseClient.rpc("healthos_review_provider_settlement",{p_settlement_id:item.id,p_decision:decision,p_notes:"Reviewed against official provider settlement evidence."});
                            if(error)throw error;setSettlementMessage("Provider settlement evidence "+decision+"d. Bank matching remains a separate approval.","success");
                            await loadProviderSettlementRecords();
                        } catch(e){setSettlementMessage("Evidence review failed: "+(e.message||"Check reviewer permission and separation of duties."),"error");btn.disabled=false;}
                    });actions.appendChild(btn);
                });
            } else if(item.reconciliation_status==="bank_match_proposed" && item.review_status==="verified" && item.recorded_by!==currentUser.id && item.reviewed_by!==currentUser.id) {
                ["confirm","reject"].forEach(decision=>{
                    const btn=document.createElement("button");btn.type="button";btn.className=decision==="confirm"?"primary-button":"logout-button";btn.textContent=decision==="confirm"?"Confirm bank credit":"Reject bank match";
                    btn.addEventListener("click",async()=>{
                        btn.disabled=true;
                        try {
                            const {error}=await supabaseClient.rpc("healthos_confirm_provider_bank_match",{p_settlement_id:item.id,p_decision:decision,p_notes:"Independent Finance review against imported bank statement."});
                            if(error)throw error;setSettlementMessage(decision==="confirm"?"Provider net settlement independently matched to bank credit.":"Proposed bank match rejected; record retained as an exception.","success");
                            await loadProviderSettlementRecords();
                        } catch(e){setSettlementMessage("Bank match review failed: "+(e.message||"Check approval permission and separation of duties."),"error");btn.disabled=false;}
                    });actions.appendChild(btn);
                });
            } else actions.textContent="No action";
            tr.appendChild(actions);settlementRows.appendChild(tr);
        });
    }
    if(settlementForm) settlementForm.addEventListener("submit",async event=>{
        event.preventDefault();
        const button=document.getElementById("recordProviderSettlement");button.disabled=true;
        try {
            if(!currentClinic||!currentUser||!supabaseClient)throw new Error("Sign in to the authorised Finance workspace first.");
            const gross=Number(document.getElementById("settlementGross").value);
            const fee=Number(document.getElementById("settlementFee").value);
            if(!Number.isFinite(gross)||gross<=0||!Number.isFinite(fee)||fee<0||fee>gross)throw new Error("Provider fee must be between zero and the gross payment amount.");
            const localDate=document.getElementById("settlementDateTime").value;
            const {error}=await supabaseClient.rpc("healthos_record_provider_settlement",{
                p_clinic_id:currentClinic.id,p_provider_key:document.getElementById("settlementProvider").value.trim(),
                p_batch_reference:document.getElementById("settlementBatch").value.trim(),
                p_provider_transaction_reference:document.getElementById("settlementTransactionRef").value.trim(),
                p_gross_amount:gross,p_provider_fee:fee,p_currency:document.getElementById("settlementCurrency").value,
                p_settled_at:localDate?new Date(localDate).toISOString():null,
                p_expected_bank_date:document.getElementById("settlementExpectedBankDate").value||null,
                p_payment_reference:document.getElementById("settlementPaymentRef").value.trim()||null,
                p_invoice_reference:document.getElementById("settlementInvoiceRef").value.trim()||null,
                p_source_evidence_reference:document.getElementById("settlementEvidenceRef").value.trim()
            });
            if(error)throw error;
            settlementForm.reset();document.getElementById("settlementFee").value="0";
            setSettlementMessage("Settlement line recorded. Net amount is gross less provider fee; independent evidence review is still required.","success");
            await loadProviderSettlementRecords();
        } catch(e){setSettlementMessage("Could not record settlement: "+(e.message||"Check Finance reconciliation permission and duplicate references."),"error");}
        finally{button.disabled=false;}
    });
    settlementRefresh?.addEventListener("click",()=>loadProviderSettlementRecords().catch(e=>setSettlementMessage(e.message||"Could not refresh records.","error")));
    settlementPropose?.addEventListener("click",async()=>{
        settlementPropose.disabled=true;
        try{
            const {data,error}=await supabaseClient.rpc("healthos_propose_provider_bank_matches",{p_clinic_id:currentClinic.id});
            if(error)throw error;
            setSettlementMessage(Number(data||0)+" unambiguous provider-to-bank match(es) proposed. Independent approval is required before reconciliation.","success");
            await loadProviderSettlementRecords();
        }catch(e){setSettlementMessage("Could not propose bank matches: "+(e.message||"Check Finance permissions."),"error");}
        finally{settlementPropose.disabled=false;}
    });
    // END PAYMENT GATEWAY SETTLEMENT & FEE AUDITOR

    async function openBankStatementPanel() {
        if (!supabaseClient || !currentClinic || !currentUser) return;
        panel.hidden = false;
        const formArea = document.getElementById("bankStatementImportForm");
        const { data: allowed, error } = await supabaseClient.rpc(
            "can_import_bank_statements",
            { p_clinic_id: currentClinic.id }
        );
        if (error) {
            console.error("Bank statement import permission check failed:", error);
            if (formArea) formArea.hidden = true;
            setImportMessage("Your import permission could not be verified. The bank statement panel is visible, but uploading is disabled. Contact the administrator.", "error");
        } else if (allowed === true) {
            if (formArea) formArea.hidden = false;
            setImportMessage("Finance import access verified.", "success");
        } else {
            if (formArea) formArea.hidden = true;
            setImportMessage("Your account can open this panel but does not currently have bank statement import permission. Ask the administrator to grant it.", "error");
        }
        try {
            await loadBankStatementData();
            await loadProviderSettlementRecords();
        } catch (loadError) {
            console.error("Bank statement history load failed:", loadError);
            setImportMessage("Import history could not load. Confirm bank statement view permissions for this account.", "error");
        }
    }

    window.loadBankStatementImports = openBankStatementPanel;

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!supabaseClient || !currentClinic || !currentUser) {
            setImportMessage("Sign in to your authorised clinic account first.", "error");
            return;
        }
        const file = fileInput.files && fileInput.files[0];
        const csvName = file ? file.name.toLowerCase() : "";
        if (!file || (!allowedTypes.includes(file.type) && !csvName.endsWith(".csv")) ||
            file.size === 0 || file.size > 10 * 1024 * 1024) {
            setImportMessage("Choose a non-empty CSV file no larger than 10 MB.", "error");
            return;
        }
        const provider = document.getElementById("bankStatementProvider").value.trim();
        if (!provider) {
            setImportMessage("Enter the bank or payment provider.", "error");
            return;
        }
        const periodStart = document.getElementById("bankStatementPeriodStart").value || null;
        const periodEnd = document.getElementById("bankStatementPeriodEnd").value || null;
        if (periodStart && periodEnd && periodStart > periodEnd) {
            setImportMessage("The statement period end must not be earlier than its start.", "error");
            return;
        }

        button.disabled = true;
        setImportMessage("Uploading private statement evidence…");
        try {
            const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError || !sessionData.session) throw new Error("Your session has expired. Sign in again.");

            const { data: uploadTicket, error: ticketError } = await supabaseClient.functions.invoke(
                "healthos-b2-storage",
                { body: { action: "create-upload", fileName: file.name, contentType: "text/plain", sizeBytes: file.size, clinicId: currentClinic.id, purpose: "bank_statement" } }
            );
            if (ticketError) throw ticketError;
            if (!uploadTicket || !uploadTicket.uploadUrl || !uploadTicket.objectKey) {
                throw new Error("Backblaze did not return secure upload details.");
            }
            const uploadResponse = await fetch(uploadTicket.uploadUrl, {
                method: "PUT",
                headers: uploadTicket.requiredHeaders || { "Content-Type": "text/plain" },
                body: file
            });
            if (!uploadResponse.ok) throw new Error("Backblaze statement upload failed (HTTP " + uploadResponse.status + ").");
            const storagePath = uploadTicket.objectKey;

            setImportMessage("Statement uploaded to private Backblaze storage. Importing and validating CSV rows…");
            const { data: importResult, error: functionError } = await supabaseClient.functions.invoke(
                "import-bank-statement",
                {
                    body: {
                        clinic_id: currentClinic.id,
                        storage_path: storagePath,
                        storage_provider: "backblaze_b2",
                        bank_or_provider: provider,
                        account_label: document.getElementById("bankStatementAccount").value.trim() || null,
                        period_start: periodStart,
                        period_end: periodEnd
                    }
                }
            );
            if (functionError) throw functionError;
            if (!importResult || !importResult.import_id) {
                throw new Error(importResult && importResult.error ? importResult.error : "Import did not return an import reference.");
            }
            form.reset();
            setImportMessage(
                "Statement imported. " + Number(importResult.imported_rows || 0) +
                " bank transaction row(s) saved. No hospital payment has been reconciled.",
                "success"
            );
            await loadBankStatementData();
        } catch (error) {
            console.error("Bank statement import failed:", error);
            setImportMessage("Bank statement import failed: " + (error.message || "Check the file and finance permissions."), "error");
        } finally {
            button.disabled = false;
        }
    });

    document.querySelectorAll(".sidebar .nav-item").forEach(link => {
        link.addEventListener("click", () => {
            if (link.getAttribute("href") === "#posReconciliation") {
                openBankStatementPanel().catch(error => {
                    console.error("Bank statement panel failed:", error);
                    setImportMessage("Bank statement panel could not load.", "error");
                });
            }
        });
    });
    console.log("HealthOS Accounts bank statement import module initialized.");
})();


/* HEALTHOS AI: PHARMACY STOCK ADJUSTMENTS AND TRANSFERS */
(function () {
    "use strict";
    const byId = id => document.getElementById(id);
    const message = byId("pharmacyStockControlMessage");
    const adjustmentForm = byId("pharmacyStockAdjustmentForm");
    const locationForm = byId("pharmacyStockLocationForm");
    const transferForm = byId("pharmacyStockTransferForm");
    if (!adjustmentForm || !locationForm || !transferForm) return;

    function context() {
        if (typeof supabaseClient === "undefined" || !supabaseClient ||
            typeof currentUser === "undefined" || !currentUser ||
            typeof currentClinic === "undefined" || !currentClinic) {
            throw new Error("Sign in and select a clinic before managing pharmacy stock.");
        }
        return {clinicId: currentClinic.id, userId: currentUser.id};
    }
    function say(text, error) {
        if (!message) return;
        message.textContent = text;
        message.style.color = error ? "#b42318" : "#16794b";
    }
    function cell(row, value) {
        const td = document.createElement("td");
        td.textContent = String(value ?? "—");
        row.appendChild(td);
        return td;
    }
    let inventoryRows = [];
    let locations = [];

    async function loadStockControl() {
        try {
            const c = context();
            const [inventoryResult, locationResult, adjustmentResult, transferResult, eventsResult] = await Promise.all([
                supabaseClient.from("pharmacy_inventory")
                    .select("id,medicine_name,batch_number,quantity,expiry_date,location_id")
                    .eq("clinic_id", c.clinicId).order("medicine_name"),
                supabaseClient.from("pharmacy_stock_locations")
                    .select("id,location_name,department_name,is_default,is_active")
                    .eq("clinic_id", c.clinicId).eq("is_active", true).order("location_name"),
                supabaseClient.from("pharmacy_stock_adjustment_requests")
                    .select("id,inventory_id,quantity_before,quantity_after,reason_code,status,created_at")
                    .eq("clinic_id", c.clinicId).order("created_at", {ascending:false}).limit(100),
                supabaseClient.from("pharmacy_stock_transfers")
                    .select("id,transfer_number,inventory_id,source_location_id,destination_location_id,medicine_name,batch_number,quantity,status")
                    .eq("clinic_id", c.clinicId).order("created_at", {ascending:false}).limit(100),
                supabaseClient.from("pharmacy_stock_control_events")
                    .select("id,inventory_id,adjustment_request_id,transfer_id,event_type,actor_id,quantity_before,quantity_after,metadata,occurred_at")
                    .eq("clinic_id", c.clinicId).order("occurred_at", {ascending:false}).limit(200)
            ]);
            for (const r of [inventoryResult,locationResult,adjustmentResult,transferResult,eventsResult]) if (r.error) throw r.error;
            inventoryRows = inventoryResult.data || [];
            locations = locationResult.data || [];
            const locationMap = new Map(locations.map(x => [x.id, x.location_name]));
            const inventoryMap = new Map(inventoryRows.map(x => [x.id,x]));

            [byId("pharmacyAdjustmentBatch"),byId("pharmacyTransferBatch")].forEach(select => {
                select.replaceChildren();
                const placeholder = document.createElement("option");
                placeholder.value = ""; placeholder.textContent = "Select medicine batch"; select.appendChild(placeholder);
                inventoryRows.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.id;
                    option.textContent = item.medicine_name + " | " + item.batch_number + " | Stock " + item.quantity +
                        " | " + (locationMap.get(item.location_id) || "Store");
                    select.appendChild(option);
                });
            });
            const destination = byId("pharmacyTransferDestination");
            destination.replaceChildren();
            const dp = document.createElement("option"); dp.value=""; dp.textContent="Select destination"; destination.appendChild(dp);
            locations.forEach(loc => {
                const option=document.createElement("option"); option.value=loc.id;
                option.textContent=loc.location_name + (loc.department_name ? " — "+loc.department_name : "");
                destination.appendChild(option);
            });

            const adjustmentBody=byId("pharmacyAdjustmentRequestsBody");
            adjustmentBody.replaceChildren();
            if (!(adjustmentResult.data || []).length) {
                const row=document.createElement("tr"); cell(row,"No adjustment requests."); adjustmentBody.appendChild(row);
            }
            (adjustmentResult.data || []).forEach(req => {
                const item=inventoryMap.get(req.inventory_id); const row=document.createElement("tr");
                cell(row,item ? item.medicine_name+" / "+item.batch_number : "Inventory batch");
                cell(row,req.quantity_before+" → "+req.quantity_after);
                cell(row,req.reason_code.replace(/_/g," "));
                cell(row,new Date(req.created_at).toLocaleString());
                cell(row,req.status);
                const action=cell(row,"");
                if(req.status==="pending") ["approved","rejected"].forEach(decision=>{
                    const btn=document.createElement("button"); btn.type="button";
                    btn.textContent=decision==="approved"?"Approve":"Reject";
                    btn.dataset.adjustmentDecision=decision; btn.dataset.requestId=req.id;
                    btn.style.marginRight="5px"; action.appendChild(btn);
                });
                adjustmentBody.appendChild(row);
            });

            const transferBody=byId("pharmacyStockTransfersBody");
            transferBody.replaceChildren();
            if (!(transferResult.data || []).length) {
                const row=document.createElement("tr"); cell(row,"No stock transfers recorded."); transferBody.appendChild(row);
            }
            (transferResult.data || []).forEach(t=>{
                const row=document.createElement("tr");
                cell(row,t.transfer_number); cell(row,t.medicine_name+" / "+t.batch_number);
                cell(row,locationMap.get(t.source_location_id)); cell(row,locationMap.get(t.destination_location_id));
                cell(row,t.quantity); cell(row,t.status);
                const action=cell(row,"");
                const actions=t.status==="pending"?["approved","rejected"]:t.status==="approved"?["dispatch"]:t.status==="dispatched"?["receive"]:[];
                actions.forEach(name=>{
                    const btn=document.createElement("button"); btn.type="button";
                    btn.textContent=name==="approved"?"Approve":name==="rejected"?"Reject":name==="dispatch"?"Dispatch":"Confirm Receipt";
                    btn.dataset.transferAction=name; btn.dataset.transferId=t.id; btn.style.marginRight="5px"; action.appendChild(btn);
                });
                transferBody.appendChild(row);
            });

            const eventBody=byId("pharmacyStockCustodyEventsBody");
            if(eventBody) {
                eventBody.replaceChildren();
                const eventRows=eventsResult.data || [];
                if(!eventRows.length) {
                    const row=document.createElement("tr"); cell(row,"No stock custody events recorded yet."); eventBody.appendChild(row);
                }
                const labels={
                    adjustment_requested:"Adjustment requested", adjustment_approved:"Adjustment approved",
                    adjustment_rejected:"Adjustment rejected", transfer_requested:"Transfer requested",
                    transfer_approved:"Transfer approved", transfer_rejected:"Transfer rejected",
                    transfer_dispatched:"Transfer dispatched", transfer_received:"Transfer received"
                };
                eventRows.forEach(ev=>{
                    const row=document.createElement("tr");
                    const item=inventoryMap.get(ev.inventory_id);
                    cell(row,new Date(ev.occurred_at).toLocaleString());
                    cell(row,labels[ev.event_type] || ev.event_type);
                    cell(row,item ? item.medicine_name+" / "+item.batch_number : "Stock batch");
                    cell(row,ev.quantity_before==null ? "—" : ev.quantity_before+" → "+(ev.quantity_after==null?"—":ev.quantity_after));
                    cell(row,ev.actor_id);
                    const meta=ev.metadata || {};
                    const detail=Object.entries(meta).filter(([key,value])=>value!==null && value!=="")
                        .map(([key,value])=>key.replace(/_/g," ")+": "+String(value)).join(" · ");
                    cell(row,detail || (ev.transfer_id || ev.adjustment_request_id || "—"));
                    eventBody.appendChild(row);
                });
            }
            say("Stock controls and immutable custody events loaded. Review, dispatch and receipt are recorded separately.",false);
        } catch(e) {
            console.error("Pharmacy stock control load error:",e);
            say(e.message || "Unable to load stock controls.",true);
        }
    }

    adjustmentForm.addEventListener("submit",async event=>{
        event.preventDefault();
        const button=byId("pharmacyAdjustmentSubmit"); button.disabled=true;
        try {
            const c=context(); const qty=Number(byId("pharmacyAdjustmentQuantity").value);
            if(!Number.isInteger(qty)||qty<0) throw new Error("Enter a whole-number stock count of zero or more.");
            const result=await supabaseClient.rpc("request_pharmacy_stock_adjustment",{
                p_clinic_id:c.clinicId,p_inventory_id:byId("pharmacyAdjustmentBatch").value,
                p_quantity_after:qty,p_reason_code:byId("pharmacyAdjustmentReason").value,
                p_reason_notes:byId("pharmacyAdjustmentNotes").value.trim()||null
            });
            if(result.error) throw result.error;
            adjustmentForm.reset(); say("Adjustment submitted. Stock will change only after owner/admin approval.",false);
            await loadStockControl();
        } catch(e) { say(e.message||"Unable to submit adjustment.",true); }
        finally { button.disabled=false; }
    });

    locationForm.addEventListener("submit",async event=>{
        event.preventDefault(); const button=byId("pharmacyStockLocationSubmit"); button.disabled=true;
        try {
            const c=context();
            const result=await supabaseClient.rpc("create_pharmacy_stock_location",{
                p_clinic_id:c.clinicId,p_location_name:byId("pharmacyStockLocationName").value.trim(),
                p_department_name:byId("pharmacyStockLocationDepartment").value.trim()||null
            });
            if(result.error) throw result.error;
            locationForm.reset(); say("Stock location registered.",false); await loadStockControl();
        } catch(e) { say(e.message||"Unable to register stock location.",true); }
        finally { button.disabled=false; }
    });

    transferForm.addEventListener("submit",async event=>{
        event.preventDefault(); const button=byId("pharmacyTransferSubmit"); button.disabled=true;
        try {
            const c=context(); const qty=Number(byId("pharmacyTransferQuantity").value);
            if(!Number.isInteger(qty)||qty<1) throw new Error("Transfer quantity must be a whole number above zero.");
            const result=await supabaseClient.rpc("request_pharmacy_stock_transfer",{
                p_clinic_id:c.clinicId,p_transfer_number:byId("pharmacyTransferNumber").value.trim(),
                p_inventory_id:byId("pharmacyTransferBatch").value,
                p_destination_location_id:byId("pharmacyTransferDestination").value,
                p_quantity:qty,p_notes:byId("pharmacyTransferNotes").value.trim()||null
            });
            if(result.error) throw result.error;
            transferForm.reset(); say("Transfer request submitted for owner/admin approval. Source stock has not yet been deducted.",false);
            await loadStockControl();
        } catch(e) { say(e.message||"Unable to submit transfer.",true); }
        finally { button.disabled=false; }
    });

    document.addEventListener("click",async event=>{
        const adj=event.target.closest("button[data-adjustment-decision]");
        const transfer=event.target.closest("button[data-transfer-action]");
        if(!adj&&!transfer) return;
        const button=adj||transfer; button.disabled=true;
        try {
            const c=context(); let result;
            if(adj) {
                result=await supabaseClient.rpc("review_pharmacy_stock_adjustment",{
                    p_clinic_id:c.clinicId,p_request_id:adj.dataset.requestId,
                    p_decision:adj.dataset.adjustmentDecision,p_review_notes:null
                });
            } else {
                const action=transfer.dataset.transferAction;
                const rpc=action==="dispatch"?"dispatch_pharmacy_stock_transfer":
                    action==="receive"?"receive_pharmacy_stock_transfer":"review_pharmacy_stock_transfer";
                const args={p_clinic_id:c.clinicId,p_transfer_id:transfer.dataset.transferId};
                if(action==="approved"||action==="rejected") args.p_decision=action;
                result=await supabaseClient.rpc(rpc,args);
            }
            if(result.error) throw result.error;
            say(adj?"Stock adjustment "+adj.dataset.adjustmentDecision+".":
                "Stock transfer "+transfer.dataset.transferAction+" action completed.",false);
            if(window.loadHealthOSPharmacyInventory) await window.loadHealthOSPharmacyInventory();
            await loadStockControl();
        } catch(e) { say(e.message||"Unable to complete stock control action.",true); }
        finally { button.disabled=false; }
    });

    document.querySelectorAll(".sidebar .nav-item").forEach(link=>{
        link.addEventListener("click",()=>{
            if((link.getAttribute("href")||"")==="#pharmacy") void loadStockControl();
        });
    });
    window.loadHealthOSPharmacyStockControls=loadStockControl;
    if(document.getElementById("pharmacy") && !document.getElementById("pharmacy").hidden) void loadStockControl();
})();


/* HEALTHOS AI: PHARMACY EXPENDITURE, STOCK VALUATION AND DEMAND FORECAST */
(function () {
    "use strict";
    const $ = id => document.getElementById(id);
    const panel = $("pharmacyAnalyticsWorkspace");
    if (!panel) return;
    const money = value => "₦" + Number(value || 0).toLocaleString("en-NG", {minimumFractionDigits:2, maximumFractionDigits:2});
    const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    function setMessage(value, isError) {
        const node = $("pharmacyAnalyticsMessage");
        if (node) { node.textContent = value; node.style.color = isError ? "#b42318" : "#16794b"; }
    }
    function addCell(row, value) {
        const td = document.createElement("td");
        td.textContent = String(value ?? "—");
        row.appendChild(td);
    }
    function emptyRow(body, colspan, message) {
        body.replaceChildren();
        const tr = document.createElement("tr"), td = document.createElement("td");
        td.colSpan = colspan; td.textContent = message; tr.appendChild(td); body.appendChild(tr);
    }
    async function loadAnalytics() {
        if (typeof supabaseClient === "undefined" || !supabaseClient ||
            typeof currentClinic === "undefined" || !currentClinic) return;
        const clinicId = currentClinic.id;
        const now = new Date();
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        setMessage("Calculating pharmacy expenditure, stock value and demand from clinic records…", false);
        try {
            const results = await Promise.all([
                supabaseClient.from("pharmacy_inventory")
                    .select("id,medicine_name,quantity,reorder_level,expiry_date,purchase_cost")
                    .eq("clinic_id", clinicId),
                supabaseClient.from("pharmacy_supplier_payments")
                    .select("supplier_id,amount,status,payment_date")
                    .eq("clinic_id", clinicId).eq("status", "approved"),
                supabaseClient.from("pharmacy_purchase_orders")
                    .select("id,supplier_id,total_amount,status,po_number")
                    .eq("clinic_id", clinicId),
                supabaseClient.from("pharmacy_suppliers")
                    .select("id,supplier_name").eq("clinic_id", clinicId),
                supabaseClient.from("pharmacy_dispensing_records")
                    .select("medicine_name_snapshot,quantity_dispensed,dispensed_at,status")
                    .eq("clinic_id", clinicId).eq("status", "dispensed")
                    .gte("dispensed_at", cutoff).lte("dispensed_at", now.toISOString())
            ]);
            for (const result of results) if (result.error) throw result.error;
            const inventory = results[0].data || [];
            const payments = results[1].data || [];
            const orders = results[2].data || [];
            const suppliers = results[3].data || [];
            const dispensing = results[4].data || [];
            const today = now.toISOString().slice(0,10);
            const stockValue = inventory.reduce((sum, item) => sum + safeNumber(item.quantity) * safeNumber(item.purchase_cost), 0);
            const expiredValue = inventory.filter(item => item.expiry_date < today)
                .reduce((sum,item)=>sum+safeNumber(item.quantity)*safeNumber(item.purchase_cost),0);
            const approvedPayments = payments.reduce((sum,p)=>sum+safeNumber(p.amount),0);
            const approvedOrders = orders.filter(o => ["approved","partially_received","received"].includes(o.status));
            const approvedOrderValue = approvedOrders.reduce((sum,o)=>sum+safeNumber(o.total_amount),0);
            const outstanding = Math.max(0, approvedOrderValue - approvedPayments);
            $("pharmacyAnalyticsStockValue").textContent = money(stockValue);
            $("pharmacyAnalyticsExpiredValue").textContent = money(expiredValue);
            $("pharmacyAnalyticsPayments").textContent = money(approvedPayments);
            $("pharmacyAnalyticsOutstanding").textContent = money(outstanding);

            const supplierNames = new Map(suppliers.map(s=>[s.id,s.supplier_name]));
            const supplierIds = new Set([
                ...payments.map(p=>p.supplier_id), ...approvedOrders.map(o=>o.supplier_id)
            ]);
            const spendBody = $("pharmacySupplierSpendBody");
            spendBody.replaceChildren();
            if (!supplierIds.size) emptyRow(spendBody,4,"No approved supplier payments or orders recorded.");
            supplierIds.forEach(id=>{
                const paid=payments.filter(p=>p.supplier_id===id).reduce((sum,p)=>sum+safeNumber(p.amount),0);
                const supplierOrders=approvedOrders.filter(o=>o.supplier_id===id);
                const orderValue=supplierOrders.reduce((sum,o)=>sum+safeNumber(o.total_amount),0);
                const tr=document.createElement("tr");
                [supplierNames.get(id)||"Supplier",money(paid),money(orderValue),money(Math.max(0,orderValue-paid))].forEach(v=>addCell(tr,v));
                spendBody.appendChild(tr);
            });

            const usage = new Map();
            dispensing.forEach(record=>{
                const key=(record.medicine_name_snapshot||"").trim().toLowerCase();
                if (!key) return;
                const current=usage.get(key)||{quantity:0,name:record.medicine_name_snapshot};
                current.quantity+=safeNumber(record.quantity_dispensed);
                usage.set(key,current);
            });
            const medicineMap = new Map();
            inventory.forEach(item=>{
                const key=(item.medicine_name||"").trim().toLowerCase();
                if (!key) return;
                if (!medicineMap.has(key)) medicineMap.set(key,{name:item.medicine_name,stock:0,reorder:0,expiryRisk:0});
                const group=medicineMap.get(key);
                if (item.expiry_date >= today) group.stock+=Math.max(0,safeNumber(item.quantity));
                group.reorder=Math.max(group.reorder,safeNumber(item.reorder_level));
                if (item.expiry_date < today || item.expiry_date <= new Date(now.getTime()+30*86400000).toISOString().slice(0,10)) group.expiryRisk+=Math.max(0,safeNumber(item.quantity));
            });
            const forecastBody=$("pharmacyForecastBody");
            forecastBody.replaceChildren();
            if (!medicineMap.size) emptyRow(forecastBody,7,"No inventory batches available for forecasting.");
            medicineMap.forEach((item,key)=>{
                const history=usage.get(key);
                const used=history?history.quantity:0;
                const daily=used/30;
                const days=daily>0?item.stock/daily:null;
                let recommendation="Insufficient dispensing history";
                if (item.expiryRisk>0 && item.stock===0) recommendation="Expiry / stock review required";
                if (history && daily>0) {
                    if (item.stock<=0) recommendation="URGENT: stock-out — initiate approved replenishment";
                    else if (days<=7) recommendation="URGENT: reorder — 7 days or less of cover";
                    else if (days<=14 || item.stock<=item.reorder) recommendation="Reorder soon";
                    else recommendation="Stock cover currently adequate";
                } else if (item.stock<=item.reorder) recommendation="Low stock — review manual reorder";
                const tr=document.createElement("tr");
                [item.name,item.stock,history?used:"No data",history?daily.toFixed(2):"—",days===null?"—":days.toFixed(1),item.reorder,recommendation].forEach(v=>addCell(tr,v));
                forecastBody.appendChild(tr);
            });
            setMessage("Analytics refreshed. Forecast window: last 30 days. "+dispensing.length+" completed dispensing record(s) included. Values are based on saved clinic records; pending payments are excluded.",false);
        } catch(error) {
            console.error("Pharmacy analytics load failed:",error);
            setMessage("Analytics could not load: "+(error.message||"Check pharmacy reporting permissions."),true);
        }
    }
    const refresh=$("pharmacyAnalyticsRefreshButton");
    if(refresh) refresh.addEventListener("click",()=>loadAnalytics());
    document.querySelectorAll(".sidebar .nav-item").forEach(link=>{
        link.addEventListener("click",()=>{
            if((link.getAttribute("href")||"")==="#pharmacy") void loadAnalytics();
        });
    });
    window.loadHealthOSPharmacyAnalytics=loadAnalytics;
})();


// ============================================================
// HEALTHOS AI: SMART QUEUE AND BED MANAGEMENT
// ============================================================
(function initHealthOSPatientFlow() {
    const $flow = (id) => document.getElementById(id);
    const flowMessage = (id, message, isError = false) => {
        const el = $flow(id);
        if (!el) return;
        el.textContent = message;
        el.className = "message" + (isError ? " error" : " success");
    };
    const safeText = (value) => value == null ? "" : String(value);
    const patientLabel = (p) => [p.patient_number, p.first_name, p.last_name].filter(Boolean).join(" — ");
    const formatTime = (value) => value ? new Date(value).toLocaleString() : "—";
    const addFlowCell = (row, value) => {
        const cell = document.createElement("td");
        cell.textContent = safeText(value);
        row.appendChild(cell);
        return cell;
    };
    let patientsCache = [];
    let bedsCache = [];
    let queueCache = [];

    async function loadPatientFlow() {
        if (!supabaseClient || !currentClinic || !currentClinic.id) return;
        try {
            const clinicId = currentClinic.id;
            const [patientsResult, queueResult, bedsResult, admissionsResult] = await Promise.all([
                supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id", clinicId).order("created_at", {ascending:false}).limit(500),
                supabaseClient.from("patient_queue").select("id,patient_id,appointment_id,queue_number,priority,status,visit_reason,arrived_at,called_at,consultation_started_at").eq("clinic_id", clinicId).order("arrived_at", {ascending:false}).limit(250),
                supabaseClient.from("hospital_beds").select("id,bed_number,ward_name,bed_type,status").eq("clinic_id", clinicId).order("ward_name").order("bed_number"),
                supabaseClient.from("patient_admissions").select("id,patient_id,bed_id,admission_number,admitted_at,status").eq("clinic_id", clinicId).eq("status","admitted").order("admitted_at",{ascending:false})
            ]);
            for (const result of [patientsResult,queueResult,bedsResult,admissionsResult]) if (result.error) throw result.error;
            patientsCache = patientsResult.data || [];
            queueCache = queueResult.data || [];
            bedsCache = bedsResult.data || [];
            const patientMap = new Map(patientsCache.map(p => [p.id,patientLabel(p)]));
            const bedMap = new Map(bedsCache.map(b => [b.id,b]));
            const fillSelect = (id, rows, labelFn, firstLabel) => {
                const select = $flow(id);
                if (!select) return;
                const previous = select.value;
                select.replaceChildren(new Option(firstLabel,""));
                rows.forEach(item => select.add(new Option(labelFn(item),item.id)));
                if (rows.some(item => item.id === previous)) select.value = previous;
            };
            fillSelect("queuePatientSelect",patientsCache,patientLabel,"Select patient");
            fillSelect("admissionPatientSelect",patientsCache,patientLabel,"Select patient");
            fillSelect("admissionBedSelect",bedsCache.filter(b=>b.status==="available"),b=>b.bed_number+" — "+b.ward_name,"Select available bed");
            const appointmentSelect=$flow("queueAppointmentSelect");
            if(appointmentSelect){
                const {data:appointments,error}=await supabaseClient.from("appointments")
                    .select("id,patient_id,scheduled_at,reason,status").eq("clinic_id",clinicId)
                    .in("status",["scheduled","checked_in"]).order("scheduled_at",{ascending:true}).limit(300);
                if(error) throw error;
                const prior=appointmentSelect.value;
                appointmentSelect.replaceChildren(new Option("Walk-in / no appointment",""));
                (appointments||[]).forEach(a=>appointmentSelect.add(new Option(
                    (patientMap.get(a.patient_id)||"Patient")+" — "+formatTime(a.scheduled_at)+" — "+(a.reason||"Visit"),a.id
                )));
                if((appointments||[]).some(a=>a.id===prior)) appointmentSelect.value=prior;
            }
            const activeQueue=queueCache.filter(q=>!["completed","cancelled"].includes(q.status));
            $flow("queueWaitingCount").textContent=activeQueue.filter(q=>["waiting","triage"].includes(q.status)).length;
            $flow("queuePriorityCount").textContent=activeQueue.filter(q=>["urgent","emergency"].includes(q.priority)).length;
            $flow("bedAvailableCount").textContent=bedsCache.filter(b=>b.status==="available").length;
            $flow("bedOccupiedCount").textContent=bedsCache.filter(b=>b.status==="occupied").length;
            const queueBody=$flow("patientQueueBody"); queueBody.replaceChildren();
            if(!queueCache.length){const row=queueBody.insertRow();addFlowCell(row,"No patients in today's queue.");}
            queueCache.forEach(q=>{
                const row=queueBody.insertRow();
                [q.queue_number,patientMap.get(q.patient_id)||"Patient record",formatTime(q.arrived_at),q.priority,q.visit_reason,q.status.replaceAll("_"," ")].forEach(v=>addFlowCell(row,v));
                const action=addFlowCell(row,"");
                if(!["completed","cancelled"].includes(q.status)){
                    const select=document.createElement("select");
                    ["waiting","triage","called","in_consultation","completed","cancelled"].forEach(s=>select.add(new Option(s.replaceAll("_"," "),s)));
                    select.value=q.status;
                    const button=document.createElement("button");button.type="button";button.className="logout-button";button.textContent="Update";
                    button.addEventListener("click",async()=>{
                        button.disabled=true;
                        const updates={status:select.value,updated_at:new Date().toISOString()};
                        if(select.value==="called"&&!q.called_at) updates.called_at=new Date().toISOString();
                        if(select.value==="in_consultation"&&!q.consultation_started_at) updates.consultation_started_at=new Date().toISOString();
                        if(select.value==="completed") updates.completed_at=new Date().toISOString();
                        const {error}=await supabaseClient.from("patient_queue").update(updates).eq("id",q.id).eq("clinic_id",clinicId);
                        if(error){flowMessage("queueEntryMessage",error.message,true);button.disabled=false;return;}
                        if(select.value==="completed" && q.appointment_id){ await supabaseClient.from("appointments").update({status:"completed"}).eq("id",q.appointment_id).eq("clinic_id",clinicId); }
                        await loadPatientFlow();
                    });
                    action.append(select,button);
                }
            });
            const bedBody=$flow("bedRegisterBody");bedBody.replaceChildren();
            if(!bedsCache.length){const row=bedBody.insertRow();addFlowCell(row,"No beds registered.");}
            bedsCache.forEach(b=>{const row=bedBody.insertRow();[b.bed_number,b.ward_name,b.bed_type||"—",b.status].forEach(v=>addFlowCell(row,v));});
            const admissionBody=$flow("activeAdmissionsBody");admissionBody.replaceChildren();
            if(!admissionsResult.data.length){const row=admissionBody.insertRow();addFlowCell(row,"No active admissions.");}
            (admissionsResult.data||[]).forEach(a=>{
                const bed=bedMap.get(a.bed_id);
                const row=admissionBody.insertRow();
                [a.admission_number,patientMap.get(a.patient_id)||"Patient record",bed?bed.bed_number+" — "+bed.ward_name:"No bed",formatTime(a.admitted_at)].forEach(v=>addFlowCell(row,v));
                const cell=addFlowCell(row,"");
                const button=document.createElement("button");button.type="button";button.className="logout-button";button.textContent="Discharge";
                button.addEventListener("click",async()=>{
                    const note=window.prompt("Enter discharge note (required):");
                    if(!note||!note.trim()) return;
                    button.disabled=true;
                    const {error}=await supabaseClient.from("patient_admissions").update({status:"discharged",discharged_at:new Date().toISOString(),discharge_note:note.trim(),discharged_by:currentUser.id}).eq("id",a.id).eq("clinic_id",clinicId);
                    if(error){flowMessage("admissionMessage",error.message,true);button.disabled=false;return;}
                    await loadPatientFlow();
                });
                cell.appendChild(button);
            });
        } catch(error) {
            console.error("Patient flow load failed:",error);
            flowMessage("queueEntryMessage","Patient flow could not load: "+(error.message||"Check your clinic permissions."),true);
        }
    }

    const queueForm=$flow("queueEntryForm");
    if(queueForm) queueForm.addEventListener("submit",async event=>{
        event.preventDefault();
        if(!currentClinic||!currentUser) return;
        const patientId=$flow("queuePatientSelect").value;
        const appointmentId=$flow("queueAppointmentSelect").value||null;
        const patient=patientsCache.find(p=>p.id===patientId);
        if(!patient){flowMessage("queueEntryMessage","Select a registered patient.",true);return;}
        const button=queueForm.querySelector('button[type="submit"]');button.disabled=true;
        const dateKey=new Date().toISOString().slice(0,10).replaceAll("-","");
        const queueNumber="Q-"+dateKey+"-"+Math.random().toString(36).slice(2,7).toUpperCase();
        const {error}=await supabaseClient.from("patient_queue").insert({
            clinic_id:currentClinic.id,patient_id:patientId,appointment_id:appointmentId,
            queue_number:queueNumber,priority:$flow("queuePriority").value,
            visit_reason:$flow("queueVisitReason").value.trim(),
            triage_note:$flow("queueTriageNote").value.trim()||null,created_by:currentUser.id
        });
        button.disabled=false;
        if(error){flowMessage("queueEntryMessage",error.message,true);return;}
        if(appointmentId){ await supabaseClient.from("appointments").update({status:"checked_in"}).eq("id",appointmentId).eq("clinic_id",currentClinic.id); }
        queueForm.reset();flowMessage("queueEntryMessage","Patient added to queue: "+queueNumber);
        await loadPatientFlow();
    });

    const bedForm=$flow("bedRegisterForm");
    if(bedForm) bedForm.addEventListener("submit",async event=>{
        event.preventDefault();
        if(!currentClinic) return;
        const button=bedForm.querySelector('button[type="submit"]');button.disabled=true;
        const {error}=await supabaseClient.from("hospital_beds").insert({
            clinic_id:currentClinic.id,bed_number:$flow("bedNumber").value.trim(),
            ward_name:$flow("bedWardName").value.trim(),bed_type:$flow("bedType").value.trim()||null
        });
        button.disabled=false;
        if(error){flowMessage("bedRegisterMessage",error.message,true);return;}
        bedForm.reset();flowMessage("bedRegisterMessage","Bed registered.");await loadPatientFlow();
    });

    const admissionForm=$flow("patientAdmissionForm");
    if(admissionForm) admissionForm.addEventListener("submit",async event=>{
        event.preventDefault();
        if(!currentClinic||!currentUser) return;
        const patientId=$flow("admissionPatientSelect").value;
        const bedId=$flow("admissionBedSelect").value;
        const bed=bedsCache.find(b=>b.id===bedId&&b.status==="available");
        if(!bed){flowMessage("admissionMessage","Select a currently available bed.",true);return;}
        const button=admissionForm.querySelector('button[type="submit"]');button.disabled=true;
        const admissionNumber="ADM-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
        const {error}=await supabaseClient.from("patient_admissions").insert({
            clinic_id:currentClinic.id,patient_id:patientId,bed_id:bedId,
            admission_number:admissionNumber,admission_reason:$flow("admissionReason").value.trim(),
            admitted_by:currentUser.id
        });
        button.disabled=false;
        if(error){flowMessage("admissionMessage",error.message,true);return;}
        flowMessage("admissionMessage","Patient admitted. Reference: "+admissionNumber);
        admissionForm.reset();await loadPatientFlow();
    });

    const refresh=$flow("refreshPatientFlow");
    if(refresh) refresh.addEventListener("click",loadPatientFlow);
    document.querySelectorAll(".sidebar .nav-item").forEach(link=>{
        link.addEventListener("click",()=>{if((link.getAttribute("href")||"")==="#patientFlow") void loadPatientFlow();});
    });
    window.loadHealthOSPatientFlow=loadPatientFlow;
})();


// ============================================================
// HEALTHOS AI: CLINICAL MANAGEMENT AND ELECTRONIC MEDICAL RECORDS
// ============================================================
(function initHealthOSClinicalRecords(){
 const $c=id=>document.getElementById(id);
 const msg=(message,error=false)=>{const el=$c("clinicalRecordsMessage");if(el){el.textContent=message;el.className="message"+(error?" error":" success");}};
 const patientName=p=>[p.patient_number,p.first_name,p.last_name].filter(Boolean).join(" — ");
 const when=v=>v?new Date(v).toLocaleString():"—";
 const cell=(row,value)=>{const td=document.createElement("td");td.textContent=value==null?"—":String(value);row.appendChild(td);return td;};
 const numberOrNull=id=>{const v=$c(id).value;return v===""?null:Number(v);};
 let patients=[],encounters=[],selectedEncounter=null;
 async function loadClinicalRecords(){
  if(!supabaseClient||!currentClinic||!currentClinic.id)return;
  try{
   const clinicId=currentClinic.id;
   const [p,e,n,v,a,s]=await Promise.all([
    supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(500),
    supabaseClient.from("clinical_encounters").select("id,patient_id,appointment_id,encounter_number,encounter_type,status,chief_complaint,started_at,clinician_id").eq("clinic_id",clinicId).order("started_at",{ascending:false}).limit(150),
    supabaseClient.from("clinical_notes").select("id,encounter_id,note_type,note_text,status,author_id,created_at").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(250),
    supabaseClient.from("patient_vitals").select("id,encounter_id,patient_id,temperature_c,systolic_bp,diastolic_bp,pulse_bpm,respiratory_rate,oxygen_saturation,weight_kg,recorded_at").eq("clinic_id",clinicId).order("recorded_at",{ascending:false}).limit(250),
    supabaseClient.from("patient_allergies").select("id,patient_id,allergen,reaction,severity,status,created_at").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(250),
    supabaseClient.from("clinical_scribe_drafts").select("id,encounter_id,note_type,status,created_at,clinician_id").eq("clinic_id",clinicId).eq("clinician_id",currentUser.id).order("created_at",{ascending:false}).limit(100)
   ]);
   for(const x of [p,e,n,v,a,s])if(x.error)throw x.error;
   patients=p.data||[];encounters=e.data||[];
   const pmap=new Map(patients.map(x=>[x.id,patientName(x)]));
   const fill=(id,rows,label,empty)=>{const el=$c(id);if(!el)return;const old=el.value;el.replaceChildren(new Option(empty,""));rows.forEach(x=>el.add(new Option(label(x),x.id)));if(rows.some(x=>x.id===old))el.value=old;};
   fill("clinicalPatientSelect",patients,patientName,"Select patient");
   fill("clinicalAllergyPatient",patients,patientName,"Select patient");
   const active=encounters.filter(x=>["open","in_progress"].includes(x.status));
   fill("clinicalNoteEncounter",active,x=>x.encounter_number+" — "+(pmap.get(x.patient_id)||"Patient"),"Select an open encounter");
   fill("clinicalVitalsEncounter",active,x=>x.encounter_number+" — "+(pmap.get(x.patient_id)||"Patient"),"Select an open encounter");
   const appt=$c("clinicalAppointmentSelect");
   if(appt){
    const {data,error}=await supabaseClient.from("appointments").select("id,patient_id,scheduled_at,reason,status").eq("clinic_id",clinicId).in("status",["scheduled","checked_in"]).order("scheduled_at",{ascending:true}).limit(250);
    if(error)throw error;const old=appt.value;appt.replaceChildren(new Option("No linked appointment",""));
    (data||[]).forEach(x=>{const option=new Option((pmap.get(x.patient_id)||"Patient")+" — "+when(x.scheduled_at)+" — "+(x.reason||""),x.id);option.dataset.patientId=x.patient_id;appt.add(option);});
    if((data||[]).some(x=>x.id===old))appt.value=old;
   }
   $c("clinicalOpenCount").textContent=active.length;
   $c("clinicalDraftCount").textContent=(n.data||[]).filter(x=>x.status==="draft").length;
   const today=new Date();today.setHours(0,0,0,0);
   $c("clinicalVitalsCount").textContent=(v.data||[]).filter(x=>new Date(x.recorded_at)>=today).length;
   const eb=$c("clinicalEncountersBody");eb.replaceChildren();
   if(!encounters.length){const r=eb.insertRow();cell(r,"No clinical encounters recorded.");}
   encounters.forEach(x=>{const r=eb.insertRow();[x.encounter_number,pmap.get(x.patient_id)||"Patient",x.encounter_type.replaceAll("_"," "),when(x.started_at),x.status].forEach(y=>cell(r,y));const td=cell(r,"");const b=document.createElement("button");b.type="button";b.className="logout-button";b.textContent="Open";b.addEventListener("click",()=>{selectedEncounter=x.id;$c("clinicalNoteEncounter").value=x.id;$c("clinicalVitalsEncounter").value=x.id;void loadEncounterDetails();});td.appendChild(b);});
   const ab=$c("clinicalAllergiesBody");ab.replaceChildren();
   if(!(a.data||[]).length){const r=ab.insertRow();cell(r,"No allergy records.");}
   (a.data||[]).forEach(x=>{const r=ab.insertRow();[pmap.get(x.patient_id)||"Patient",x.allergen,x.reaction||"—",x.severity,x.status].forEach(y=>cell(r,y));});
   const scribeEncounter=$c("scribeEncounterSelect");
   if(scribeEncounter){
    const old=scribeEncounter.value;
    const mine=active.filter(x=>x.clinician_id===currentUser.id);
    scribeEncounter.replaceChildren(new Option("Select your open encounter",""));
    mine.forEach(x=>scribeEncounter.add(new Option(x.encounter_number+" — "+(pmap.get(x.patient_id)||"Patient"),x.id)));
    if(mine.some(x=>x.id===old))scribeEncounter.value=old;
   }
   const scribeBody=$c("scribeDraftsBody");
   if(scribeBody){
    scribeBody.replaceChildren();
    if(!(s.data||[]).length){const row=scribeBody.insertRow();cell(row,"No scribe drafts yet.");}
    (s.data||[]).forEach(d=>{
     const row=scribeBody.insertRow();
     [when(d.created_at),encounters.find(x=>x.id===d.encounter_id)?.encounter_number||"Encounter",d.note_type,d.status.replaceAll("_"," ")].forEach(value=>cell(row,value));
     const action=cell(row,"");
     if(d.status==="draft"&&d.clinician_id===currentUser.id){
      const button=document.createElement("button");button.type="button";button.className="logout-button";button.textContent="Review & save to EMR";
      button.addEventListener("click",async()=>{
       if(!confirm("Confirm that you have reviewed and corrected this note, and want to save it as an unsigned clinical draft?"))return;
       button.disabled=true;
       const {data,error}=await supabaseClient.rpc("finalize_clinical_scribe_draft",{p_clinic_id:currentClinic.id,p_scribe_draft_id:d.id});
       if(error){scribeMessage(error.message,true);button.disabled=false;return;}
       selectedEncounter=d.encounter_id;
       $c("clinicalNoteEncounter").value=d.encounter_id;
       $c("clinicalVitalsEncounter").value=d.encounter_id;
       scribeMessage("Reviewed note saved to Clinical Records as an unsigned draft. A clinician must sign it separately.");
       await loadClinicalRecords();
      });
      action.appendChild(button);
     }
    });
   }
   msg("Clinical records loaded. Access is controlled by clinic permissions.");
   await loadEncounterDetails();
  }catch(err){console.error("Clinical records load:",err);msg("Could not load clinical records: "+(err.message||"Check clinical-record permissions."),true);}
 }
 async function loadEncounterDetails(){
  const id=selectedEncounter||$c("clinicalNoteEncounter").value||$c("clinicalVitalsEncounter").value;
  if(!id)return;
  selectedEncounter=id;
  const [notes,vitals]=await Promise.all([
   supabaseClient.from("clinical_notes").select("id,note_type,note_text,status,author_id,created_at").eq("clinic_id",currentClinic.id).eq("encounter_id",id).order("created_at",{ascending:false}),
   supabaseClient.from("patient_vitals").select("temperature_c,systolic_bp,diastolic_bp,pulse_bpm,respiratory_rate,oxygen_saturation,weight_kg,recorded_at").eq("clinic_id",currentClinic.id).eq("encounter_id",id).order("recorded_at",{ascending:false}).limit(50)
  ]);
  if(notes.error||vitals.error){msg((notes.error||vitals.error).message,true);return;}
  const nb=$c("clinicalNotesBody");nb.replaceChildren();
  if(!notes.data.length){const r=nb.insertRow();cell(r,"No notes for this encounter.");}
  notes.data.forEach(x=>{const r=nb.insertRow();[when(x.created_at),x.note_type,x.note_text.length>220?x.note_text.slice(0,220)+"…":x.note_text,x.status].forEach(y=>cell(r,y));const td=cell(r,"");if(x.status==="draft"&&x.author_id===currentUser.id){const b=document.createElement("button");b.type="button";b.className="logout-button";b.textContent="Sign note";b.addEventListener("click",async()=>{if(!confirm("Sign this note? Signed notes cannot be edited."))return;b.disabled=true;const {error}=await supabaseClient.from("clinical_notes").update({status:"signed"}).eq("id",x.id).eq("clinic_id",currentClinic.id);if(error){msg(error.message,true);b.disabled=false;}else{msg("Note signed and locked.");await loadClinicalRecords();}});td.appendChild(b);}});
  const vb=$c("clinicalVitalsBody");vb.replaceChildren();
  if(!vitals.data.length){const r=vb.insertRow();cell(r,"No vital signs recorded for this encounter.");}
  vitals.data.forEach(x=>{const r=vb.insertRow();[when(x.recorded_at),x.temperature_c??"—",(x.systolic_bp??"—")+"/"+(x.diastolic_bp??"—"),x.pulse_bpm??"—",x.respiratory_rate??"—",x.oxygen_saturation??"—",x.weight_kg??"—"].forEach(y=>cell(r,y));});
  await loadClinicalSafetyAlerts();
 }

 async function loadClinicalSafetyAlerts(){
  const body=$c("clinicalSafetyAlertsBody");
  if(!body)return;
  body.replaceChildren();
  if(!selectedEncounter){
   const r=body.insertRow();cell(r,"Select an encounter to view safety alerts.");
   const allergyBody=$c("clinicalAllergySafetyBody");if(allergyBody){allergyBody.replaceChildren();const row=allergyBody.insertRow();cell(row,"No patient selected.");}
   const allergyMessage=$c("clinicalAllergySafetyMessage");if(allergyMessage)allergyMessage.textContent="Select an encounter to review recorded allergies.";
   return;
  }
  const encounter=encounters.find(x=>x.id===selectedEncounter);
  const allergyBody=$c("clinicalAllergySafetyBody");
  const allergyMessage=$c("clinicalAllergySafetyMessage");
  if(allergyBody){
   allergyBody.replaceChildren();
   if(!encounter){const row=allergyBody.insertRow();cell(row,"Encounter details unavailable.");}
   else{
    const {data:allergies,error:allergyError}=await supabaseClient.from("patient_allergies")
     .select("allergen,reaction,severity,status")
     .eq("clinic_id",currentClinic.id).eq("patient_id",encounter.patient_id)
     .order("created_at",{ascending:false}).limit(100);
    if(allergyError){const row=allergyBody.insertRow();cell(row,"Could not load allergy records.");if(allergyMessage){allergyMessage.textContent="Allergy records unavailable. Verify the patient's allergy history directly.";allergyMessage.className="message error";}}
    else if(!allergies||!allergies.length){const row=allergyBody.insertRow();cell(row,"No allergy records found. Confirm allergy history directly; absence of a record does not mean no allergies.");if(allergyMessage){allergyMessage.textContent="No recorded allergies found. Confirm with the patient.";allergyMessage.className="message";}}
    else{
     allergies.forEach(item=>{const row=allergyBody.insertRow();[item.allergen,item.reaction||"Not recorded",item.severity||"Unknown",item.status||"Unspecified"].forEach(value=>cell(row,value));});
     if(allergyMessage){allergyMessage.textContent=allergies.length+" recorded allergy item(s). Confirm the list and reactions with the patient.";allergyMessage.className="message error";}
    }
   }
  }
  const medicationBody=$c("clinicalMedicationHistoryBody");
  const medicationMessage=$c("clinicalMedicationHistoryMessage");
  if(medicationBody){
   medicationBody.replaceChildren();
   if(!encounter){const row=medicationBody.insertRow();cell(row,"Encounter details unavailable.");}
   else{
    const {data:dispenses,error:dispenseError}=await supabaseClient.from("pharmacy_dispensing_records")
     .select("medicine_name_snapshot,quantity_dispensed,batch_number_snapshot,expiry_date_snapshot,status,dispensed_at")
     .eq("clinic_id",currentClinic.id).eq("patient_id",encounter.patient_id)
     .order("dispensed_at",{ascending:false}).limit(100);
    if(dispenseError){
     const row=medicationBody.insertRow();cell(row,"Could not load dispensing history.");
     if(medicationMessage){medicationMessage.textContent="Dispensing history unavailable. Verify medication history directly with the patient and pharmacy.";medicationMessage.className="message error";}
    }else if(!dispenses||!dispenses.length){
     const row=medicationBody.insertRow();cell(row,"No pharmacy dispensing history found.");
     if(medicationMessage){medicationMessage.textContent="No dispensing records found. This does not establish that the patient takes no medication.";medicationMessage.className="message";}
    }else{
     dispenses.forEach(item=>{
      const row=medicationBody.insertRow();
      const d=item.dispensed_at?new Date(item.dispensed_at):null; const e=item.expiry_date_snapshot?new Date(item.expiry_date_snapshot+"T23:59:59"):null; const review=d&&e&&e<d?"Potentially expired at dispensing — verify":item.expiry_date_snapshot?"Expiry date recorded — verify batch":"Expiry date not recorded"; [when(item.dispensed_at),item.medicine_name_snapshot,item.quantity_dispensed,item.batch_number_snapshot,item.expiry_date_snapshot,review,item.status].forEach(value=>cell(row,value));
     });
     if(medicationMessage){medicationMessage.textContent=dispenses.length+" historical dispensing record(s) found. Confirm current use, dose, frequency and any outside medications with the patient.";medicationMessage.className="message";}
    }
   }
  }
  const vitalTrendBody=$c("clinicalVitalTrendBody");
  const vitalTrendMessage=$c("clinicalVitalTrendMessage");
  if(vitalTrendBody){
   vitalTrendBody.replaceChildren();
   if(!encounter){
    const row=vitalTrendBody.insertRow();cell(row,"Encounter details unavailable.");
   }else{
    const {data:vitalHistory,error:vitalHistoryError}=await supabaseClient.from("patient_vitals")
     .select("recorded_at,systolic_bp,diastolic_bp,pulse_bpm,temperature_c,respiratory_rate,oxygen_saturation,weight_kg,height_cm,pain_score")
     .eq("clinic_id",currentClinic.id).eq("patient_id",encounter.patient_id)
     .order("recorded_at",{ascending:false}).limit(20);
    if(vitalHistoryError){
     const row=vitalTrendBody.insertRow();cell(row,"Could not load recent observations.");
     if(vitalTrendMessage){vitalTrendMessage.textContent="Recent observations unavailable. Review the patient's chart directly.";vitalTrendMessage.className="message error";}
    }else if(!vitalHistory||!vitalHistory.length){
     const row=vitalTrendBody.insertRow();cell(row,"No previous observations found.");
     if(vitalTrendMessage){vitalTrendMessage.textContent="No recorded vital-sign history found for this patient.";vitalTrendMessage.className="message";}
    }else{
     vitalHistory.forEach(item=>{
      const row=vitalTrendBody.insertRow();
      const bp=item.systolic_bp!=null||item.diastolic_bp!=null?[item.systolic_bp??"—",item.diastolic_bp??"—"].join("/"):"—";
      const bmi=item.weight_kg!=null&&item.height_cm!=null&&Number(item.height_cm)>0?(Number(item.weight_kg)/Math.pow(Number(item.height_cm)/100,2)).toFixed(1):"—";
      [when(item.recorded_at),bp,item.pulse_bpm??"—",item.temperature_c!=null?item.temperature_c+" °C":"—",item.respiratory_rate??"—",item.oxygen_saturation!=null?item.oxygen_saturation+"%":"—",item.weight_kg!=null?item.weight_kg+" kg":"—",item.height_cm!=null?item.height_cm+" cm":"—",bmi,item.pain_score??"—"].forEach(value=>cell(row,value));
     });
     if(vitalTrendMessage){vitalTrendMessage.textContent=vitalHistory.length+" recent observation(s) shown, newest first. Compare with prior readings and assess clinically.";vitalTrendMessage.className="message";}
    }
   }
  }
  const {data,error}=await supabaseClient.from("clinical_decision_support_alerts")
   .select("id,rule_code,severity,observed_value,alert_message,status,created_at,review_note")
   .eq("clinic_id",currentClinic.id).eq("encounter_id",selectedEncounter)
   .order("created_at",{ascending:false}).limit(100);
  if(error){["clinicalCriticalCount","clinicalHighCount","clinicalPendingCount","clinicalResolvedCount"].forEach(id=>{const el=$c(id);if(el)el.textContent="0";});safetyMessage(error.message,true);const r=body.insertRow();cell(r,"Could not load safety alerts.");return;}
  const alerts=Array.isArray(data)?data:[];
  const count=(id,value)=>{const el=$c(id);if(el)el.textContent=String(value);};
  count("clinicalCriticalCount",alerts.filter(a=>(a.severity||"").toLowerCase()==="critical").length);
  count("clinicalHighCount",alerts.filter(a=>(a.severity||"").toLowerCase()==="high").length);
  count("clinicalPendingCount",alerts.filter(a=>(a.status||"").toLowerCase()!=="resolved").length);
  count("clinicalResolvedCount",alerts.filter(a=>(a.status||"").toLowerCase()==="resolved").length);
  if(!alerts.length){const r=body.insertRow();cell(r,"No rule-based safety alerts for this encounter. This does not mean the patient is clinically clear.");return;}
  data.forEach(alert=>{
   const row=body.insertRow();
   [when(alert.created_at),alert.rule_code.replaceAll("_"," "),alert.severity.toUpperCase(),alert.observed_value,alert.alert_message,alert.status.replaceAll("_"," ")].forEach(value=>cell(row,value));
   const action=cell(row,"");
   if(alert.status!=="resolved"){
    const select=document.createElement("select");
    [["acknowledged","Acknowledge"],["escalated","Escalate"],["resolved","Resolve"]].forEach(([v,l])=>select.add(new Option(l,v)));
    const button=document.createElement("button");button.type="button";button.className="logout-button";button.textContent="Save review";
    button.addEventListener("click",async()=>{
     const note=window.prompt("Record the clinician's review/action (minimum 3 characters):");
     if(!note||note.trim().length<3)return;
     button.disabled=true;
     const {error}=await supabaseClient.rpc("review_clinical_safety_alert",{p_clinic_id:currentClinic.id,p_alert_id:alert.id,p_status:select.value,p_review_note:note.trim()});
     if(error){safetyMessage(error.message,true);button.disabled=false;return;}
     safetyMessage("Clinical alert review recorded.");await loadClinicalSafetyAlerts();
    });
    action.append(select,button);
   }else cell(row,alert.review_note||"Reviewed");
  });
  safetyMessage("Showing recorded rule-based alerts. Verify the source observation and follow hospital protocol.");
 }
 function safetyMessage(message,error=false){
  const el=$c("clinicalDecisionSupportMessage");if(el){el.textContent=message;el.className="message"+(error?" error":" success");}
 }
 $c("runClinicalSafetyReview")?.addEventListener("click",async()=>{
  if(!currentClinic||!selectedEncounter){safetyMessage("Select an encounter first.",true);return;}
  const button=$c("runClinicalSafetyReview");button.disabled=true;
  const {data,error}=await supabaseClient.rpc("generate_clinical_safety_alerts",{p_clinic_id:currentClinic.id,p_encounter_id:selectedEncounter});
  button.disabled=false;
  if(error){safetyMessage(error.message,true);return;}
  safetyMessage((Number(data)||0)+" new alert(s) generated from the latest recorded observations. Existing alerts are retained.");
  await loadClinicalSafetyAlerts();
 });
 const patientPicker=$c("clinicalPatientSelect");
 if(patientPicker)patientPicker.addEventListener("change",()=>{const chosen=patientPicker.value;const appt=$c("clinicalAppointmentSelect");if(!appt)return;Array.from(appt.options).forEach((option,index)=>{if(index>0)option.hidden=!!chosen&&option.dataset.patientId!==chosen;});if(appt.selectedOptions[0]?.hidden)appt.value="";});
 const encounterForm=$c("clinicalEncounterForm");
 if(encounterForm)encounterForm.addEventListener("submit",async ev=>{
  ev.preventDefault();if(!currentClinic||!currentUser)return;
  const patientId=$c("clinicalPatientSelect").value;if(!patients.some(p=>p.id===patientId)){msg("Select a registered patient.",true);return;}const linkedAppointment=$c("clinicalAppointmentSelect").selectedOptions[0];if(linkedAppointment?.dataset.patientId&&linkedAppointment.dataset.patientId!==patientId){msg("Choose an appointment belonging to the selected patient.",true);return;}
  const button=encounterForm.querySelector('button[type="submit"]');button.disabled=true;
  const ref="ENC-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+Math.random().toString(36).slice(2,7).toUpperCase();
  const {error}=await supabaseClient.from("clinical_encounters").insert({clinic_id:currentClinic.id,patient_id:patientId,appointment_id:$c("clinicalAppointmentSelect").value||null,encounter_number:ref,encounter_type:$c("clinicalEncounterType").value,chief_complaint:$c("clinicalChiefComplaint").value.trim(),clinician_id:currentUser.id});
  button.disabled=false;if(error){msg(error.message,true);return;}encounterForm.reset();msg("Clinical encounter opened: "+ref);await loadClinicalRecords();
 });
 const noteForm=$c("clinicalNoteForm");
 if(noteForm)noteForm.addEventListener("submit",async ev=>{
  ev.preventDefault();const id=$c("clinicalNoteEncounter").value;if(!id){msg("Select an open encounter.",true);return;}
  const button=noteForm.querySelector('button[type="submit"]');button.disabled=true;
  const {error}=await supabaseClient.from("clinical_notes").insert({clinic_id:currentClinic.id,encounter_id:id,note_type:$c("clinicalNoteType").value,note_text:$c("clinicalNoteText").value.trim(),author_id:currentUser.id});
  button.disabled=false;if(error){msg(error.message,true);return;} $c("clinicalNoteText").value="";msg("Clinical note saved as a draft. It is not signed.");selectedEncounter=id;await loadClinicalRecords();
 });
 const vitalsForm=$c("clinicalVitalsForm");
 if(vitalsForm)vitalsForm.addEventListener("submit",async ev=>{
  ev.preventDefault();const encounterId=$c("clinicalVitalsEncounter").value;const encounter=encounters.find(x=>x.id===encounterId);
  if(!encounter){msg("Select an open encounter.",true);return;}
  const fields=["clinicalTemperature","clinicalSystolic","clinicalDiastolic","clinicalPulse","clinicalRespiratory","clinicalOxygen","clinicalWeight","clinicalHeight","clinicalPain"];
  if(fields.every(id=>$c(id).value==="")){msg("Enter at least one observation.",true);return;}
  const button=vitalsForm.querySelector('button[type="submit"]');button.disabled=true;
  const payload={clinic_id:currentClinic.id,encounter_id:encounterId,patient_id:encounter.patient_id,temperature_c:numberOrNull("clinicalTemperature"),systolic_bp:numberOrNull("clinicalSystolic"),diastolic_bp:numberOrNull("clinicalDiastolic"),pulse_bpm:numberOrNull("clinicalPulse"),respiratory_rate:numberOrNull("clinicalRespiratory"),oxygen_saturation:numberOrNull("clinicalOxygen"),weight_kg:numberOrNull("clinicalWeight"),height_cm:numberOrNull("clinicalHeight"),pain_score:numberOrNull("clinicalPain"),notes:$c("clinicalVitalsNotes").value.trim()||null,recorded_by:currentUser.id};
  const {error}=await supabaseClient.from("patient_vitals").insert(payload);button.disabled=false;if(error){msg(error.message,true);return;}vitalsForm.reset();msg("Vital signs saved.");selectedEncounter=encounterId;await loadClinicalRecords();
 });
 const allergyForm=$c("clinicalAllergyForm");
 if(allergyForm)allergyForm.addEventListener("submit",async ev=>{
  ev.preventDefault();const patientId=$c("clinicalAllergyPatient").value;if(!patientId){msg("Select a patient.",true);return;}
  const button=allergyForm.querySelector('button[type="submit"]');button.disabled=true;
  const {error}=await supabaseClient.from("patient_allergies").insert({clinic_id:currentClinic.id,patient_id:patientId,allergen:$c("clinicalAllergen").value.trim(),reaction:$c("clinicalAllergyReaction").value.trim()||null,severity:$c("clinicalAllergySeverity").value,recorded_by:currentUser.id});
  button.disabled=false;if(error){msg(error.message,true);return;}allergyForm.reset();msg("Allergy record saved.");await loadClinicalRecords();
 });
 ["clinicalNoteEncounter","clinicalVitalsEncounter"].forEach(id=>$c(id)?.addEventListener("change",()=>{selectedEncounter=$c(id).value;void loadEncounterDetails();}));
 let scribeRecorder=null,scribeChunks=[],scribeRecordedBlob=null;
 const audioStatus=message=>{const el=$c("scribeAudioStatus");if(el)el.textContent=message;};
 const audioStart=$c("scribeRecordStart"),audioStop=$c("scribeRecordStop"),audioInput=$c("scribeAudioFile"),transcribeButton=$c("scribeTranscribeButton");
 audioStart?.addEventListener("click",async()=>{
  if(!$c("scribeConsent").checked||!$c("scribeAudioConsent").checked){audioStatus("Confirm both documentation consent and explicit audio-processing consent before recording.");return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){audioStatus("Audio recording is not supported by this browser. Select an audio file or enter an approved transcript.");return;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const mimeType=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"].find(type=>MediaRecorder.isTypeSupported(type));
   scribeRecorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);scribeChunks=[];scribeRecordedBlob=null;
   scribeRecorder.ondataavailable=event=>{if(event.data&&event.data.size)scribeChunks.push(event.data);};
   scribeRecorder.onerror=()=>{stream.getTracks().forEach(track=>track.stop());audioStatus("Recording failed. Select an audio file or enter an approved transcript.");};
   scribeRecorder.onstop=()=>{scribeRecordedBlob=new Blob(scribeChunks,{type:scribeRecorder.mimeType||"audio/webm"});stream.getTracks().forEach(track=>track.stop());audioStatus("Recording ready ("+Math.round(scribeRecordedBlob.size/1024)+" KB). Select Transcribe & prepare note when ready.");};
   scribeRecorder.start();audioStart.disabled=true;if(audioStop)audioStop.disabled=false;audioStatus("Recording consultation audio. Press Stop recording when finished.");
  }catch(error){audioStatus("Microphone access was not granted. Check browser permission or select an audio file.");}
 });
 audioStop?.addEventListener("click",()=>{if(scribeRecorder&&scribeRecorder.state!=="inactive"){scribeRecorder.stop();audioStop.disabled=true;audioStart.disabled=false;}});
 audioInput?.addEventListener("change",()=>{scribeRecordedBlob=null;audioStatus(audioInput.files?.[0]?"Audio file selected. Confirm consent before transcription.":"No audio file selected.");});
 transcribeButton?.addEventListener("click",async()=>{
  if(!currentClinic||!currentUser){audioStatus("Sign in to the clinic workspace before using the Medical Scribe.");return;}
  if(!$c("scribeConsent").checked||!$c("scribeAudioConsent").checked){audioStatus("Confirm both documentation consent and explicit audio-processing consent before transcription.");return;}
  const encounterId=$c("scribeEncounterSelect").value;
  const encounter=encounters.find(x=>x.id===encounterId&&x.clinician_id===currentUser.id&&["open","in_progress"].includes(x.status));
  if(!encounter){audioStatus("Select an open encounter assigned to your account.");return;}
  const selectedFile=audioInput?.files?.[0];
  const audioBlob=selectedFile||scribeRecordedBlob;
  if(!audioBlob){audioStatus("Record audio or select an audio file first.");return;}
  if(audioBlob.size>20*1024*1024){audioStatus("Audio file exceeds the 20 MB limit. Use a shorter recording.");return;}
  if(!audioBlob.type||!audioBlob.type.startsWith("audio/")){audioStatus("Choose a supported audio file.");return;}
  const button=transcribeButton;button.disabled=true;audioStatus("Checking clinic permissions and securely processing audio. Please wait.");
  try{
   const formData=new FormData();
   formData.append("clinic_id",currentClinic.id);formData.append("encounter_id",encounter.id);
   formData.append("consent_confirmed","true");formData.append("audio_processing_consent","true");
   formData.append("note_type",$c("scribeNoteType").value);
   formData.append("audio",audioBlob,selectedFile?.name||"consultation-audio.webm");
   const {data,error}=await supabaseClient.functions.invoke("clinical-scribe-assist",{body:formData});
   if(error){audioStatus(error.message||"Secure transcription could not be completed. Check provider configuration and clinic permissions.");return;}
   if(!data?.transcript||!data?.draft_note){audioStatus("The transcription service returned an incomplete response. No draft was saved.");return;}
   $c("scribeTranscript").value=data.transcript;
   $c("scribeEditedNote").value=data.draft_note;
   $c("scribeSourceType").value="approved_transcription_service";
   $c("scribeReviewConfirm").checked=false;
   audioStatus("Transcript and note draft prepared. Listen/read the source, correct the transcript and personally edit the note before saving.");
   scribeMessage("Draft prepared for clinician review only. Nothing has been signed or added to the medical record.");
  }catch(error){audioStatus("Secure transcription failed. No audio was saved in HealthOS. Please try again or enter an approved transcript manually.");}
  finally{button.disabled=false;}
 });


 // Clinician-only patient context preview. Data remains in the authenticated
 // browser session and is deliberately not attached to the AI request.
 const contextSelect=$c("scribeEncounterSelect");
 const contextBody=$c("scribePatientContextBody");
 async function loadScribePatientContext(){
  if(!contextSelect||!contextBody||!supabaseClient||!currentClinic||!currentUser)return;
  const encounter=encounters.find(x=>x.id===contextSelect.value&&x.clinician_id===currentUser.id&&["open","in_progress"].includes(x.status));
  if(!encounter){contextBody.textContent="Select an open encounter assigned to your account.";return;}
  contextBody.textContent="Loading patient context…";
  try{
   const patientId=encounter.patient_id,clinicId=currentClinic.id;
   const [allergyResult,vitalResult,noteResult]=await Promise.all([
    supabaseClient.from("patient_allergies").select("allergen,reaction,severity,status,created_at").eq("clinic_id",clinicId).eq("patient_id",patientId).order("created_at",{ascending:false}).limit(20),
    supabaseClient.from("patient_vitals").select("temperature_c,systolic_bp,diastolic_bp,pulse_bpm,respiratory_rate,oxygen_saturation,weight_kg,recorded_at").eq("clinic_id",clinicId).eq("patient_id",patientId).order("recorded_at",{ascending:false}).limit(5),
    supabaseClient.from("clinical_notes").select("note_type,note_text,status,created_at").eq("clinic_id",clinicId).eq("encounter_id",encounter.id).order("created_at",{ascending:false}).limit(5)
   ]);
   for(const result of [allergyResult,vitalResult,noteResult])if(result.error)throw result.error;
   const activeAllergies=(allergyResult.data||[]).filter(x=>!x.status||["active","confirmed"].includes(String(x.status).toLowerCase()));
   const vitals=vitalResult.data||[],notes=noteResult.data||[];
   const section=(title,items)=>{
    const wrap=document.createElement("div"),heading=document.createElement("strong"),list=document.createElement("ul");
    heading.textContent=title;wrap.appendChild(heading);
    if(!items.length){const li=document.createElement("li");li.textContent="No records found.";list.appendChild(li);}
    else items.forEach(value=>{const li=document.createElement("li");li.textContent=value;list.appendChild(li);});
    wrap.appendChild(list);return wrap;
   };
   contextBody.replaceChildren();
   contextBody.appendChild(section("Active / confirmed allergies",activeAllergies.map(x=>[x.allergen,x.reaction&&("Reaction: "+x.reaction),x.severity&&("Severity: "+x.severity)].filter(Boolean).join(" — "))));
   contextBody.appendChild(section("Latest recorded observations",vitals.map(x=>[
    x.recorded_at?new Date(x.recorded_at).toLocaleString():"",
    x.temperature_c!=null?("Temp "+x.temperature_c+" °C"):"",
    x.systolic_bp!=null?("BP "+x.systolic_bp+"/"+(x.diastolic_bp??"—")):"",
    x.pulse_bpm!=null?("Pulse "+x.pulse_bpm):"",
    x.respiratory_rate!=null?("RR "+x.respiratory_rate):"",
    x.oxygen_saturation!=null?("SpO₂ "+x.oxygen_saturation+"%"):"",
    x.weight_kg!=null?("Weight "+x.weight_kg+" kg"):""
   ].filter(Boolean).join(" — "))));
   contextBody.appendChild(section("Notes from this encounter",notes.map(x=>(x.created_at?new Date(x.created_at).toLocaleString()+" — ":"")+(x.note_type||"Note")+" ("+(x.status||"status not recorded")+") — "+(x.note_text||"No note text").slice(0,500))));
   const disclaimer=document.createElement("p");disclaimer.className="muted";disclaimer.textContent="Verify source, date and accuracy before relying on any item. Missing records do not mean the patient has no history.";contextBody.appendChild(disclaimer);
  }catch(error){
   contextBody.textContent="Patient context could not be loaded. Check your clinical-record permissions; continue using the verified source record.";
   console.error("Scribe patient context load failed:",error);
  }
 }
 contextSelect?.addEventListener("change",loadScribePatientContext);

 const scribeForm=$c("clinicalScribeForm");
 if(scribeForm)scribeForm.addEventListener("submit",async ev=>{
  ev.preventDefault();
  if(!currentClinic||!currentUser)return;
  const encounterId=$c("scribeEncounterSelect").value;
  const encounter=encounters.find(x=>x.id===encounterId&&x.clinician_id===currentUser.id&&["open","in_progress"].includes(x.status));
  const transcript=$c("scribeTranscript").value.trim();
  const edited=$c("scribeEditedNote").value.trim();
  if(!encounter){scribeMessage("Select an open encounter assigned to your account.",true);return;}
  if(!$c("scribeConsent").checked){scribeMessage("Confirm patient consent/authorisation before saving.",true);return;}
  if(!$c("scribeReviewConfirm").checked){scribeMessage("Confirm that you personally reviewed and corrected the transcript and note before saving.",true);return;}
  if(!transcript||!edited){scribeMessage("Enter the transcript and the clinician-reviewed note.",true);return;}
  const button=scribeForm.querySelector('button[type="submit"]');button.disabled=true;
  const {error}=await supabaseClient.from("clinical_scribe_drafts").insert({
   clinic_id:currentClinic.id,encounter_id:encounter.id,patient_id:encounter.patient_id,
   clinician_id:currentUser.id,source_type:$c("scribeSourceType").value,consent_confirmed:true,
   consent_confirmed_at:new Date().toISOString(),transcript_text:transcript,
   clinician_edited_note:edited,note_type:$c("scribeNoteType").value
  });
  button.disabled=false;
  if(error){scribeMessage(error.message,true);return;}
  $c("scribeTranscript").value="";$c("scribeEditedNote").value="";$c("scribeConsent").checked=false;$c("scribeAudioConsent").checked=false;$c("scribeReviewConfirm").checked=false;$c("scribeSourceType").value="manual_transcript";
  scribeMessage("Scribe draft saved. Review it below before adding it to the medical record.");
  selectedEncounter=encounter.id;
  await loadClinicalRecords();
 });
 function scribeMessage(message,error=false){
  const el=$c("scribeMessage");if(el){el.textContent=message;el.className="message"+(error?" error":" success");}
 }
 $c("refreshClinicalRecords")?.addEventListener("click",loadClinicalRecords);
 document.querySelectorAll(".sidebar .nav-item").forEach(link=>link.addEventListener("click",()=>{if(["#clinicalRecords","#clinicalScribe"].includes(link.getAttribute("href")||""))void loadClinicalRecords();}));
 window.loadHealthOSClinicalRecords=loadClinicalRecords;
})();

// HEALTHOS AI: OFFLINE-FIRST APPLICATION SHELL FOUNDATION
// Only the public application shell is cached. Authenticated API responses,
// patient records, clinical notes, payment data and pharmacy data are never cached.
(function initOfflineShell() {
    const banner = document.getElementById("offlineModeBanner");
    function refreshNetworkState() {
        const offline = !navigator.onLine;
        if (banner) banner.hidden = !offline;
        if (connectionStatus && offline) {
            connectionStatus.textContent = "Offline — application shell only";
            connectionStatus.classList.remove("success");
            connectionStatus.classList.add("error");
        } else if (connectionStatus && navigator.onLine) {
            connectionStatus.textContent = "Network available — sign-in required for live data";
            connectionStatus.classList.remove("error");
        }
    }
    window.addEventListener("online", refreshNetworkState);
    window.addEventListener("offline", refreshNetworkState);
    refreshNetworkState();

    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js")
                .then(() => console.info("HealthOS offline application shell registered."))
                .catch(error => console.warn("Offline shell registration unavailable:", error));
        });
    }
})();


// HEALTHOS AI: WHATSAPP AI TRIAGE & PATIENT INTAKE FOUNDATION
(function initWhatsappPatientIntake() {
 const $i = id => document.getElementById(id), form=$i("whatsappIntakeForm"), body=$i("whatsappIntakeBody");
 const departments=["Reception","Nursing","Doctors","Pharmacy","Laboratory","Radiology","Accounts and Finance","Administration"];
 const message=(text,isError=false)=>{const el=$i("whatsappIntakeMessage");if(el){el.textContent=text;el.className="message"+(isError?" error":" success");}};
 const cell=(row,value)=>{const td=document.createElement("td");td.textContent=value==null||value===""?"—":String(value);row.appendChild(td);return td;};
 const stamp=value=>value?new Date(value).toLocaleString():"—";
 async function writeActivity(requestId,type,note){
  const {error}=await supabaseClient.from("whatsapp_intake_activity").insert({clinic_id:currentClinic.id,intake_request_id:requestId,activity_type:type,activity_note:String(note).slice(0,1000),created_by:currentUser.id});
  if(error)console.warn("WhatsApp intake activity log could not be saved:",error.message);
  return !error;
 }
 async function loadActivity(requestId){
  const {data,error}=await supabaseClient.from("whatsapp_intake_activity").select("activity_type,activity_note,created_at").eq("clinic_id",currentClinic.id).eq("intake_request_id",requestId).order("created_at",{ascending:false}).limit(30);
  if(error){message("Activity history could not be loaded: "+error.message,true);return;}
  const lines=(data||[]).map(x=>stamp(x.created_at)+" · "+x.activity_type.replaceAll("_"," ")+": "+x.activity_note);
  window.alert(lines.length?lines.join("\n\n"):"No activity has been recorded for this request yet.");
 }
 async function loadWhatsappIntake(){
  if(!body||!currentClinic||!supabaseClient)return;
  body.replaceChildren();
  const {data,error}=await supabaseClient.from("whatsapp_intake_requests").select("id,channel,contact_name,contact_phone,concern_summary,triage_level,status,assigned_department,created_at").eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(200);
  if(error){message("Could not load intake inbox: "+error.message,true);const row=body.insertRow();cell(row,"Intake inbox unavailable.");return;}
  const rows=data||[];
  $i("intakeNewCount").textContent=rows.filter(x=>x.status==="new").length;
  $i("intakeReviewCount").textContent=rows.filter(x=>x.status==="under_review").length;
  $i("intakeUrgentCount").textContent=rows.filter(x=>["urgent","emergency"].includes(x.triage_level)).length;
  $i("intakeClosedCount").textContent=rows.filter(x=>x.status==="closed").length;
  if(!rows.length){const row=body.insertRow();const td=cell(row,"No intake requests have been recorded.");td.colSpan=9;return;}
  rows.forEach(item=>{
   const row=body.insertRow();cell(row,stamp(item.created_at));cell(row,item.contact_name+" · "+item.contact_phone);cell(row,item.channel.replaceAll("_"," "));cell(row,item.concern_summary);
   const triageCell=cell(row,""),triage=document.createElement("select");
   [["unreviewed","Unreviewed"],["emergency","Emergency"],["urgent","Urgent"],["routine","Routine"],["administrative","Administrative"]].forEach(([v,l])=>triage.add(new Option(l,v)));
   triage.value=item.triage_level;triageCell.appendChild(triage);
   const statusCell=cell(row,""),status=document.createElement("select");
   [["new","New"],["under_review","Under review"],["referred","Referred"],["appointment_booked","Appointment booked"],["closed","Closed"]].forEach(([v,l])=>status.add(new Option(l,v)));
   status.value=item.status;statusCell.appendChild(status);
   const deptCell=cell(row,""),dept=document.createElement("select");dept.add(new Option("Unassigned",""));
   departments.forEach(name=>dept.add(new Option(name,name)));dept.value=item.assigned_department||"";deptCell.appendChild(dept);
   const action=cell(row,""),save=document.createElement("button");save.type="button";save.className="logout-button";save.textContent="Save review";
   save.addEventListener("click",async()=>{
    const note=window.prompt("Enter the human review/action note (minimum 3 characters):");if(!note||note.trim().length<3)return;
    save.disabled=true;
    const changes={triage_level:triage.value,status:status.value,assigned_department:dept.value||null,reviewed_by:currentUser.id,review_note:note.trim(),reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    const {error:updateError}=await supabaseClient.from("whatsapp_intake_requests").update(changes).eq("id",item.id).eq("clinic_id",currentClinic.id);
    if(updateError){message("Review could not be saved: "+updateError.message,true);save.disabled=false;return;}
    const logged=await writeActivity(item.id,"reviewed","Triage: "+triage.value+"; status: "+status.value+"; department: "+(dept.value||"unassigned")+". Staff note: "+note.trim());
    message(logged?"Human review saved and added to activity history.":"Human review saved, but activity logging failed.",!logged);await loadWhatsappIntake();
   });
   action.appendChild(save);
   const historyCell=cell(row,""),history=document.createElement("button");history.type="button";history.className="logout-button";history.textContent="View history";history.addEventListener("click",()=>loadActivity(item.id));historyCell.appendChild(history);
  });
  message("Loaded "+rows.length+" intake request(s). Every triage level requires authorised human review.");
 }
 if(form)form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!currentClinic||!currentUser){message("Sign in to an authorised clinic workspace first.",true);return;}
  if(!$i("intakeConsent").checked){message("Consent is required before recording this enquiry.",true);return;}
  const name=$i("intakeContactName").value.trim(),phone=$i("intakeContactPhone").value.trim(),concern=$i("intakeConcernSummary").value.trim();
  if(name.length<2||phone.length<7||concern.length<3){message("Check the contact name, phone number and concern summary.",true);return;}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try{
   const {data,error}=await supabaseClient.from("whatsapp_intake_requests").insert({clinic_id:currentClinic.id,channel:$i("intakeChannel").value,contact_name:name,contact_phone:phone,concern_summary:concern,consent_confirmed:true,consent_confirmed_at:new Date().toISOString(),created_by:currentUser.id}).select("id").single();
   if(error)throw error;
   const logged=await writeActivity(data.id,"created","Enquiry received through "+$i("intakeChannel").value+"; consent confirmed.");
   form.reset();message(logged?"Intake saved and activity logged. Waiting for staff triage.":"Intake saved, but activity logging failed.",!logged);await loadWhatsappIntake();
  }catch(error){message("Could not save intake request: "+(error.message||"Unknown error"),true);}
  finally{button.disabled=false;}
 });
 $i("refreshWhatsappIntake")?.addEventListener("click",loadWhatsappIntake);
 window.loadWhatsappIntake=loadWhatsappIntake;
})();


(function initAdminVoiceTranslator(){
 const $v=id=>document.getElementById(id);
 const form=$v("adminVoiceForm"), body=$v("adminVoiceBody");
 let recognition=null, listening=false;
 const say=(text,isError=false)=>{const el=$v("adminVoiceMessage");if(el){el.textContent=text;el.className="message"+(isError?" error":" success");}};
 const cell=(row,value)=>{const td=document.createElement("td");td.textContent=value==null||value===""?"—":String(value);row.appendChild(td);return td;};
 const date=value=>value?new Date(value).toLocaleString():"—";
 const langCode={english:"en-NG",yoruba:"yo-NG",hausa:"ha-NG",igbo:"ig-NG",nigerian_pidgin:"en-NG",other:"en-NG"};
 async function loadAdminVoiceTranslations(){
  if(!body||!currentClinic)return;
  body.replaceChildren();
  const {data,error}=await supabaseClient.from("administrative_voice_translations")
   .select("id,source_language,source_text,standardized_english,output_type,department,status,created_at")
   .eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(200);
  if(error){say("Could not load communication register: "+error.message,true);const row=body.insertRow();const td=cell(row,"Register unavailable.");td.colSpan=8;return;}
  const rows=data||[];
  $v("adminVoiceDraftCount").textContent=rows.filter(x=>x.status==="draft").length;
  $v("adminVoiceReviewedCount").textContent=rows.filter(x=>x.status==="reviewed").length;
  $v("adminVoiceArchivedCount").textContent=rows.filter(x=>x.status==="archived").length;
  if(!rows.length){const row=body.insertRow();const td=cell(row,"No administrative translations saved yet.");td.colSpan=8;return;}
  rows.forEach(item=>{
   const row=body.insertRow();cell(row,date(item.created_at));cell(row,item.source_language.replaceAll("_"," "));
   cell(row,item.department);cell(row,item.source_text);cell(row,item.standardized_english);
   cell(row,item.output_type.replaceAll("_"," "));cell(row,item.status);
   const action=cell(row,"");
   if(item.status==="draft"){
    const review=document.createElement("button");review.type="button";review.className="logout-button";review.textContent="Mark reviewed";
    review.addEventListener("click",async()=>{
     if(!window.confirm("Confirm that the source and English version have been checked by a staff member?"))return;
     review.disabled=true;
     const {error:updateError}=await supabaseClient.from("administrative_voice_translations").update({status:"reviewed",reviewed_by:currentUser.id,review_note:"Staff confirmed source and English version were reviewed.",reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id).eq("clinic_id",currentClinic.id);
     if(updateError){say("Could not mark reviewed: "+updateError.message,true);review.disabled=false;return;}
     say("Record marked as reviewed.");await loadAdminVoiceTranslations();
    });action.appendChild(review);
   }else if(item.status==="reviewed"){
    const archive=document.createElement("button");archive.type="button";archive.className="logout-button";archive.textContent="Archive";
    archive.addEventListener("click",async()=>{
     if(!window.confirm("Archive this administrative communication?"))return;
     archive.disabled=true;
     const {error:updateError}=await supabaseClient.from("administrative_voice_translations").update({status:"archived",updated_at:new Date().toISOString()}).eq("id",item.id).eq("clinic_id",currentClinic.id);
     if(updateError){say("Could not archive record: "+updateError.message,true);archive.disabled=false;return;}
     say("Record archived.");await loadAdminVoiceTranslations();
    });action.appendChild(archive);
   }
  });
  say("Loaded "+rows.length+" administrative communication record(s).");
 }
 function stopMic(){
  if(recognition){try{recognition.stop();}catch(_e){}}
  listening=false;$v("adminVoiceStart").disabled=false;$v("adminVoiceStop").disabled=true;
 }
 $v("adminVoiceStart")?.addEventListener("click",()=>{
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){$v("adminVoiceMicStatus").textContent="Speech recognition is not supported by this browser. Type the original message instead.";return;}
  if(!$v("adminVoiceMicConsent").checked){$v("adminVoiceMicStatus").textContent="Confirm the microphone privacy notice before starting speech recognition.";return;}
  recognition=new SpeechRecognition();recognition.lang=langCode[$v("adminVoiceLanguage").value]||"en-NG";
  recognition.continuous=true;recognition.interimResults=true;
  const source=$v("adminVoiceSourceText");let finalText=source.value.trim();
  recognition.onresult=event=>{
   let interim="";
   for(let i=event.resultIndex;i<event.results.length;i++){
    const spoken=event.results[i][0].transcript;
    if(event.results[i].isFinal)finalText+=(finalText?" ":"")+spoken;else interim+=spoken;
   }
   source.value=finalText+(interim?" "+interim:"");
  };
  recognition.onerror=event=>{$v("adminVoiceMicStatus").textContent="Microphone error: "+event.error+". You may type the transcript instead.";stopMic();};
  recognition.onend=()=>{listening=false;$v("adminVoiceStart").disabled=false;$v("adminVoiceStop").disabled=true;$v("adminVoiceMicStatus").textContent="Microphone stopped. Check and correct the transcript before saving.";};
  try{recognition.start();listening=true;$v("adminVoiceStart").disabled=true;$v("adminVoiceStop").disabled=false;$v("adminVoiceMicStatus").textContent="Listening. Speak clearly, then stop and review the transcript."; }
  catch(error){$v("adminVoiceMicStatus").textContent="Could not start microphone: "+error.message;}
 });
 $v("adminVoiceStop")?.addEventListener("click",stopMic);
 $v("adminVoiceLanguage")?.addEventListener("change",()=>{if(listening){stopMic();$v("adminVoiceMicStatus").textContent="Language changed. Start the microphone again."; }});
 if(form)form.addEventListener("submit",async event=>{
  event.preventDefault();stopMic();
  if(!currentClinic||!currentUser){say("Sign in to an authorised clinic workspace first.",true);return;}
  if(!$v("adminVoiceReviewConfirm").checked){say("Confirm human review and privacy checks before saving.",true);return;}
  const source=$v("adminVoiceSourceText").value.trim(),english=$v("adminVoiceEnglishText").value.trim();
  if(source.length<2||english.length<2){say("Enter the original message and its reviewed English version.",true);return;}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  const {error}=await supabaseClient.from("administrative_voice_translations").insert({
   clinic_id:currentClinic.id,source_language:$v("adminVoiceLanguage").value,
   source_text:source,transcript_text:source,standardized_english:english,
   output_type:$v("adminVoiceOutputType").value,department:$v("adminVoiceDepartment").value||null,
   status:"draft",created_by:currentUser.id
  });
  button.disabled=false;
  if(error){say("Could not save record: "+error.message,true);return;}
  form.reset();$v("adminVoiceMicStatus").textContent="Microphone is off. You can type the original message instead.";$v("adminVoiceMicConsent").checked=false;
  say("Administrative communication saved as a draft. It is not yet approved.");await loadAdminVoiceTranslations();
 });
 $v("refreshAdminVoice")?.addEventListener("click",loadAdminVoiceTranslations);
 window.loadAdminVoiceTranslations=loadAdminVoiceTranslations;
})();


// PATIENT-CONTROLLED RECORD SHARING FOUNDATION
(function initPatientRecordSharing(){
 const $s=id=>document.getElementById(id), form=$s("patientShareForm"), body=$s("patientShareBody");
 const say=(message,error=false)=>{const el=$s("patientShareMessage");if(el){el.textContent=message;el.className="message"+(error?" error":" success");}};
 const cell=(row,value)=>{const td=document.createElement("td");td.textContent=value==null||value===""?"—":String(value);row.appendChild(td);return td;};
 const date=value=>value?new Date(value).toLocaleString():"—";
 async function loadPatientSharePatients(){
  if(!currentClinic||!$s("patientSharePatient"))return;
  const select=$s("patientSharePatient");select.replaceChildren();
  const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Select patient";select.appendChild(placeholder);
  const {data,error}=await supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id",currentClinic.id).order("first_name").limit(1000);
  if(error){say("Could not load patients: "+error.message,true);return;}
  (data||[]).forEach(p=>{const option=document.createElement("option");option.value=p.id;option.textContent=[p.patient_number,p.first_name,p.last_name].filter(Boolean).join(" — ");select.appendChild(option);});
 }
 async function loadPatientRecordShares(){
  if(!currentClinic||!body)return;
  body.replaceChildren();
  const {data,error}=await supabaseClient.from("patient_record_shares").select("id,patient_id,scope_categories,expires_at,max_uses,use_count,status,created_at,patients(first_name,last_name,patient_number)").eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(200);
  if(error){const row=body.insertRow();const td=cell(row,"Could not load shares: "+error.message);td.colSpan=7;return;}
  if(!data?.length){const row=body.insertRow();const td=cell(row,"No patient record shares have been created.");td.colSpan=7;return;}
  data.forEach(item=>{
   const row=body.insertRow(),p=item.patients||{};
   cell(row,date(item.created_at));cell(row,[p.patient_number,p.first_name,p.last_name].filter(Boolean).join(" — "));
   cell(row,(item.scope_categories||[]).join(", "));cell(row,date(item.expires_at));cell(row,item.use_count+" / "+item.max_uses);
   const status=item.status==="active"&&new Date(item.expires_at)<new Date()?"expired":item.status;cell(row,status);
   const action=cell(row,"");
   if(item.status==="active"&&new Date(item.expires_at)>new Date()){
    const button=document.createElement("button");button.type="button";button.className="logout-button";button.textContent="Revoke access";
    button.addEventListener("click",async()=>{if(!window.confirm("Revoke this patient-authorised access code immediately?"))return;button.disabled=true;
     const {error:revokeError}=await supabaseClient.rpc("revoke_patient_record_share",{p_clinic_id:currentClinic.id,p_share_id:item.id});
     if(revokeError){say("Could not revoke share: "+revokeError.message,true);button.disabled=false;return;}
     say("Access code revoked.");await loadPatientRecordShares();
    });action.appendChild(button);
   }
  });
 }
 if(form)form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!currentClinic||!currentUser){say("Sign in to an authorised clinic workspace first.",true);return;}
  const scopes=[...form.querySelectorAll('input[name="patientShareScope"]:checked')].map(x=>x.value);
  if(!scopes.length){say("Select at least one record category.",true);return;}
  if(!$s("patientShareConsent").checked){say("Explicit patient consent must be confirmed.",true);return;}
  const reference=$s("patientShareConsentReference").value.trim();
  if(reference.length<3){say("Enter a consent reference or witness details.",true);return;}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;$s("patientShareCodePanel").hidden=true;
  const {data,error}=await supabaseClient.rpc("create_patient_record_share",{
   p_clinic_id:currentClinic.id,p_patient_id:$s("patientSharePatient").value,p_scope_categories:scopes,
   p_consent_method:$s("patientShareConsentMethod").value,p_consent_reference:reference,p_consent_confirmed:true,
   p_expires_in_hours:Number($s("patientShareExpiry").value),p_max_uses:Number($s("patientShareUses").value)
  });
  button.disabled=false;
  if(error){say("Could not create access code: "+error.message,true);return;}
  $s("patientShareCode").textContent=data.share_code;
  $s("patientShareExpiryText").textContent="Expires: "+date(data.expires_at)+" · Maximum uses: "+data.max_uses;
  const qrTarget=$s("patientShareQr");
  const downloadQr=$s("patientShareQrDownload");
  if(qrTarget) {
   qrTarget.replaceChildren();
   if(typeof QRCode==="function") {
    new QRCode(qrTarget,{text:data.share_code,width:240,height:240,colorDark:"#111111",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
    if(downloadQr) {
     downloadQr.disabled=false;
     downloadQr.onclick=()=>{
      const canvas=qrTarget.querySelector("canvas");
      const image=qrTarget.querySelector("img");
      const dataUrl=canvas?canvas.toDataURL("image/png"):(image?image.src:null);
      if(!dataUrl){say("QR image is not ready yet. Try again.",true);return;}
      const link=document.createElement("a");link.href=dataUrl;link.download="healthos-patient-record-access-qr.png";link.click();
     };
    }
   } else {
    qrTarget.textContent="QR generator could not load. Use the secure access code shown above instead.";
    if(downloadQr)downloadQr.disabled=true;
   }
  }
  $s("patientShareCodePanel").hidden=false;
  say("Temporary patient-authorised access code and QR generated. Scanning the QR does not bypass patient approval or verification. It will not be shown again after leaving this screen.");
  await loadPatientRecordShares();
 });
 window.loadPatientRecordShares=async()=>{await loadPatientSharePatients();await loadPatientRecordShares();};
})();


// USSD DIAGNOSTIC REQUEST MANAGEMENT FOUNDATION
(function initUssdDiagnosticRequests(){
 const $u=id=>document.getElementById(id), form=$u("ussdDiagnosticForm"), body=$u("ussdDiagnosticBody");
 const say=(message,error=false)=>{const el=$u("ussdDiagnosticMessage");if(el){el.textContent=message;el.className="message"+(error?" error":" success");}};
 const cell=(row,value)=>{const td=document.createElement("td");td.textContent=value==null||value===""?"—":String(value);row.appendChild(td);return td;};
 const date=value=>value?new Date(value).toLocaleString():"—";
 async function loadUssdDiagnosticRequests(){
  if(!currentClinic||!body)return;
  const patientSelect=$u("ussdPatient");
  if(patientSelect){
   const previous=patientSelect.value;
   const {data:patients,error:patientError}=await supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id",currentClinic.id).order("first_name").limit(1000);
   if(!patientError){patientSelect.replaceChildren();const blank=document.createElement("option");blank.value="";blank.textContent="Not linked / identify later";patientSelect.appendChild(blank);
    (patients||[]).forEach(p=>{const option=document.createElement("option");option.value=p.id;option.textContent=[p.patient_number,p.first_name,p.last_name].filter(Boolean).join(" — ");patientSelect.appendChild(option);});
    if(previous)patientSelect.value=previous;
   }
  }
  const {data,error}=await supabaseClient.from("ussd_diagnostic_requests").select("id,patient_id,phone_number,patient_reference,service_code,requested_service,request_channel,status,appointment_at,assigned_department,created_at,patients(first_name,last_name,patient_number)").eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(300);
  if(error){body.replaceChildren();const row=body.insertRow();const td=cell(row,"Could not load requests: "+error.message);td.colSpan=10;return;}
  const rows=data||[];
  $u("ussdNewCount").textContent=rows.filter(x=>x.status==="new").length;
  $u("ussdVerifyCount").textContent=rows.filter(x=>x.status==="verification_required").length;
  $u("ussdAcceptedCount").textContent=rows.filter(x=>["accepted","scheduled"].includes(x.status)).length;
  $u("ussdCompletedCount").textContent=rows.filter(x=>x.status==="completed").length;
  body.replaceChildren();
  if(!rows.length){const row=body.insertRow();const td=cell(row,"No diagnostic requests registered.");td.colSpan=10;return;}
  rows.forEach(item=>{
   const row=body.insertRow(),p=item.patients||{};
   cell(row,date(item.created_at));cell(row,[p.patient_number,p.first_name,p.last_name,item.patient_reference].filter(Boolean).join(" — "));
   cell(row,item.phone_number);cell(row,item.request_channel.replaceAll("_"," "));cell(row,item.service_code);cell(row,item.requested_service);cell(row,item.assigned_department||"Laboratory");cell(row,item.appointment_at?date(item.appointment_at):"Not scheduled");cell(row,item.status.replaceAll("_"," "));
   const action=cell(row,"");
   const select=document.createElement("select");
   ["new","verification_required","accepted","scheduled","sample_collected","completed","cancelled","rejected"].forEach(status=>{const option=document.createElement("option");option.value=status;option.textContent=status.replaceAll("_"," ");select.appendChild(option);});
   select.value=item.status;
   const note=document.createElement("input");note.type="text";note.maxLength=500;note.placeholder="Staff note (optional)";note.setAttribute("aria-label","Staff review note");
   const appointment=document.createElement("input");appointment.type="datetime-local";appointment.setAttribute("aria-label","Appointment date and time");if(item.appointment_at)appointment.value=new Date(item.appointment_at).toISOString().slice(0,16);
   const save=document.createElement("button");save.type="button";save.className="logout-button";save.textContent="Update";
   save.addEventListener("click",async()=>{
    if(!window.confirm("Save this diagnostic request status? Confirm patient identity and test suitability before accepting or scheduling."))return;
    save.disabled=true;
    if(select.value==="scheduled"&&!appointment.value){say("Choose an appointment date and time before scheduling.",true);save.disabled=false;return;}
    const {error:updateError}=await supabaseClient.from("ussd_diagnostic_requests").update({status:select.value,appointment_at:appointment.value?new Date(appointment.value).toISOString():null,staff_note:note.value.trim()||null,reviewed_by:currentUser.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id).eq("clinic_id",currentClinic.id);
    if(updateError){say("Could not update request: "+updateError.message,true);save.disabled=false;return;}
    say("Diagnostic request updated.");await loadUssdDiagnosticRequests();
   });
   action.append(select,appointment,note,save);
  });
  say("Loaded "+rows.length+" diagnostic request(s).");
 }
 if(form)form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!currentClinic||!currentUser){say("Sign in to an authorised clinic workspace first.",true);return;}
  if(!$u("ussdConsent").checked){say("Patient consent is required before recording this request.",true);return;}
  const phone=$u("ussdPhone").value.trim(),code=$u("ussdServiceCode").value.trim(),service=$u("ussdServiceName").value.trim();
  if(phone.length<7||code.length<2||service.length<2){say("Check the phone number, service code and requested service.",true);return;}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  const {error}=await supabaseClient.from("ussd_diagnostic_requests").insert({
   clinic_id:currentClinic.id,patient_id:$u("ussdPatient").value||null,phone_number:phone,
   patient_reference:$u("ussdPatientReference").value.trim()||null,request_channel:$u("ussdChannel").value,
   service_code:code,requested_service:service,consent_confirmed:true,consent_recorded_at:new Date().toISOString(),
   created_by:currentUser.id
  });
  button.disabled=false;
  if(error){say("Could not register request: "+error.message,true);return;}
  form.reset();say("Diagnostic request registered. It is awaiting staff verification.");await loadUssdDiagnosticRequests();
 });
 window.loadUssdDiagnosticRequests=loadUssdDiagnosticRequests;
})();


// HEALTHOS AI: MULTI-FACILITY MANAGEMENT WORKFLOWS
(function () {
 const byId = id => document.getElementById(id);
 const setMessage = (id, message, error=false) => {
  const el=byId(id); if(el){el.textContent=message;el.className="message"+(error?" error":" success");}
 };
 const addCell=(tr,value)=>{const td=document.createElement("td");td.textContent=value==null||value===""?"—":String(value);tr.appendChild(td);};
 let facilitiesLoaded=false;
 async function loadMultiFacilityManagement(){
  if(!supabaseClient||!currentUser||!currentClinic) return;
  if(!managementVerified){setMessage("facilityOrganisationMessage","Management verification is required before managing facilities.",true);return;}
  const [orgsResult, clinicsResult] = await Promise.all([
   supabaseClient.from("healthcare_organizations").select("id,organization_name,organization_code,status").eq("owner_user_id",currentUser.id).order("created_at",{ascending:true}),
   supabaseClient.from("clinics").select("id,name").eq("owner_user_id",currentUser.id).order("created_at",{ascending:true})
  ]);
  if(orgsResult.error) throw orgsResult.error;
  if(clinicsResult.error) throw clinicsResult.error;
  const orgs=orgsResult.data||[], clinics=clinicsResult.data||[];
  byId("facilityOrgCount").textContent=orgs.length;
  byId("facilityOrganisationSelect").replaceChildren(new Option("Select organisation",""));
  orgs.forEach(o=>byId("facilityOrganisationSelect").add(new Option(o.organization_name,o.id)));
  byId("facilityClinicSelect").replaceChildren(new Option("Select an owned clinic workspace",""));
  clinics.forEach(c=>byId("facilityClinicSelect").add(new Option(c.name,c.id)));
  const {data: links,error}=await supabaseClient.from("organization_facilities").select("id,organization_id,clinic_id,facility_name,facility_code,facility_type,status,healthcare_organizations(organization_name),clinics(name)").order("created_at",{ascending:false});
  if(error) throw error;
  const rows=links||[];
  byId("facilityLinkedCount").textContent=rows.length;
  byId("facilityActiveCount").textContent=rows.filter(x=>x.status==="active").length;
  byId("facilityInactiveCount").textContent=rows.filter(x=>x.status!=="active").length;
  const body=byId("facilityRegisterBody");body.replaceChildren();
  if(!rows.length){const tr=document.createElement("tr");const td=document.createElement("td");td.colSpan=6;td.textContent="No facilities linked yet. Create an organisation to link your current clinic.";tr.appendChild(td);body.appendChild(tr);}
  rows.forEach(x=>{const tr=document.createElement("tr");addCell(tr,x.healthcare_organizations?.organization_name);addCell(tr,x.facility_name);addCell(tr,x.facility_code);addCell(tr,x.facility_type?.replaceAll("_"," "));addCell(tr,x.clinics?.name);addCell(tr,x.status);body.appendChild(tr);});
  facilitiesLoaded=true;
 }
 byId("facilityOrganisationForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!managementVerified||!currentUser||!currentClinic){setMessage("facilityOrganisationMessage","Sign in and complete management verification first.",true);return;}
  const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{
   const name=byId("facilityOrganisationName").value.trim();
   const code=byId("facilityOrganisationCode").value.trim()||null;
   const {data:org,error:orgError}=await supabaseClient.from("healthcare_organizations").insert({organization_name:name,organization_code:code,owner_user_id:currentUser.id}).select("id,organization_name").single();
   if(orgError) throw orgError;
   const {error:linkError}=await supabaseClient.from("organization_facilities").insert({organization_id:org.id,clinic_id:currentClinic.id,facility_name:currentClinic.name,facility_code:"MAIN",facility_type:"hospital"});
   if(linkError) throw new Error("Organisation was created, but linking the current facility failed: "+linkError.message);
   byId("facilityOrganisationForm").reset();
   setMessage("facilityOrganisationMessage","Organisation created and current clinic linked as its first facility.");
   await loadMultiFacilityManagement();
  }catch(error){setMessage("facilityOrganisationMessage",error.message||"Could not create organisation.",true);}
  finally{button.disabled=false;}
 });
 byId("facilityLinkForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!managementVerified||!currentUser){setMessage("facilityLinkMessage","Management verification is required.",true);return;}
  const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{
   const clinicId=byId("facilityClinicSelect").value;
   const {data:clinic,error:clinicError}=await supabaseClient.from("clinics").select("id,name").eq("id",clinicId).eq("owner_user_id",currentUser.id).single();
   if(clinicError) throw new Error("Select a clinic workspace that you own.");
   const {error}=await supabaseClient.from("organization_facilities").insert({organization_id:byId("facilityOrganisationSelect").value,clinic_id:clinic.id,facility_name:byId("facilityDisplayName").value.trim(),facility_code:byId("facilityCode").value.trim()||null,facility_type:byId("facilityType").value});
   if(error) throw error;
   byId("facilityLinkForm").reset();
   setMessage("facilityLinkMessage","Facility successfully linked to the organisation.");
   await loadMultiFacilityManagement();
  }catch(error){setMessage("facilityLinkMessage",error.message||"Could not link facility.",true);}
  finally{button.disabled=false;}
 });
 byId("facilityRefreshButton")?.addEventListener("click",()=>loadMultiFacilityManagement().catch(e=>setMessage("facilityLinkMessage",e.message,true)));
 window.loadMultiFacilityManagement=loadMultiFacilityManagement;
})();
 
// HEALTHOS AI: OPERATIONAL INTELLIGENCE & ANALYTICS
(function initAIAnalytics(){
 const $=id=>document.getElementById(id);
 const money=value=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(value)||0);
 const num=value=>new Intl.NumberFormat("en-NG").format(Number(value)||0);
 const dateKey=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");};
 const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
 const endOfDay=d=>{const x=startOfDay(d);x.setDate(x.getDate()+1);return x;};
 const set=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 const say=(message,error=false)=>{const el=$("aiAnalyticsMessage");if(el){el.textContent=message;el.className="message"+(error?" error":" success");}};
 const cell=(row,value)=>{const td=document.createElement("td");td.textContent=value==null||value===""?"—":String(value);row.appendChild(td);};

 function renderMiniChart(id,kind,rows,formatValue){
  const host=$(id);if(!host)return;host.replaceChildren();
  const values=(rows||[]).filter(r=>Number.isFinite(Number(r.value)));
  if(!values.length||values.every(r=>Number(r.value)===0)){const p=document.createElement("p");p.className="muted";p.textContent="No recorded data for this reporting period.";host.appendChild(p);return;}
  const w=520,h=190,l=48,r=12,t=12,b=38,pw=w-l-r,ph=h-t-b,max=Math.max(1,...values.map(x=>Number(x.value)));
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 "+w+" "+h);svg.setAttribute("width","100%");
  const add=(tag,attrs,txt)=>{const e=document.createElementNS("http://www.w3.org/2000/svg",tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(txt!==undefined)e.textContent=txt;svg.appendChild(e);};
  [0,.5,1].forEach(f=>{const y=t+ph*(1-f);add("line",{x1:l,y1:y,x2:w-r,y2:y,stroke:"#dbe4ef"});add("text",{x:l-8,y:y+4,"text-anchor":"end",fill:"#52657d","font-size":11},Math.round(max*f).toLocaleString());});
  if(kind==="line"){
   const pts=values.map((x,i)=>({x:l+(values.length===1?pw/2:i*pw/(values.length-1)),y:t+ph-(Number(x.value)/max)*ph,label:x.label,value:Number(x.value)}));
   add("polyline",{points:pts.map(p=>p.x+","+p.y).join(" "),fill:"none",stroke:"#123b68","stroke-width":3,"stroke-linecap":"round","stroke-linejoin":"round"});
   pts.forEach(p=>{add("circle",{cx:p.x,cy:p.y,r:4,fill:"#168a83"});add("text",{x:p.x,y:Math.max(12,p.y-9),"text-anchor":"middle",fill:"#123b68","font-size":10},formatValue?formatValue(p.value):p.value.toLocaleString());add("text",{x:p.x,y:h-12,"text-anchor":"middle",fill:"#52657d","font-size":10},p.label);});
  }else{
   const slot=pw/values.length,bw=Math.min(46,slot*.62);
   values.forEach((x,i)=>{const v=Number(x.value),bh=v/max*ph,bx=l+i*slot+(slot-bw)/2,by=t+ph-bh;add("rect",{x:bx,y:by,width:bw,height:Math.max(0,bh),rx:4,fill:"#1c527f"});add("text",{x:bx+bw/2,y:Math.max(12,by-5),"text-anchor":"middle",fill:"#123b68","font-size":10},v.toLocaleString());add("text",{x:bx+bw/2,y:h-12,"text-anchor":"middle",fill:"#52657d","font-size":10},x.label);});
  }
  host.appendChild(svg);
 }
 function renderInsights(items){
  const box=$("aiOperationalInsights");if(!box)return;box.replaceChildren();
  items.forEach(item=>{const card=document.createElement("article");card.className="stat-card";const p=document.createElement("p");p.textContent=item.title;const h=document.createElement("h3");h.textContent=item.value;const note=document.createElement("p");note.className="muted";note.textContent=item.note;card.append(p,h,note);box.appendChild(card);});
 }
 async function loadAIAnalytics(){
  if(!supabaseClient||!currentUser||!currentClinic){say("Sign in to an authorised clinic workspace first.",true);return;}
  const clinicId=currentClinic.id,now=new Date(),todayStart=startOfDay(now),tomorrow=endOfDay(now),trendStart=new Date(todayStart);trendStart.setDate(trendStart.getDate()-6);
  const isoStart=trendStart.toISOString(),isoTomorrow=tomorrow.toISOString();
  say("Calculating clinic operational indicators…");
  const results=await Promise.all([
   supabaseClient.from("patients").select("id",{count:"exact",head:true}).eq("clinic_id",clinicId),
   supabaseClient.from("appointments").select("id,scheduled_at,status").eq("clinic_id",clinicId).gte("scheduled_at",isoStart).lt("scheduled_at",isoTomorrow).order("scheduled_at",{ascending:true}).limit(5000),
   supabaseClient.from("billing_transactions").select("invoice_amount,amount_paid,payment_status,transaction_date").eq("clinic_id",clinicId).order("transaction_date",{ascending:false}).limit(5000),
   supabaseClient.from("service_events").select("id,quantity,unit_price,event_status,performed_at").eq("clinic_id",clinicId).gte("performed_at",todayStart.toISOString()).lt("performed_at",isoTomorrow).in("event_status",["performed","verified"]).limit(3000),
   supabaseClient.from("patient_queue").select("id,priority,status").eq("clinic_id",clinicId).not("status","in","(completed,cancelled)").limit(3000),
   supabaseClient.from("hospital_beds").select("id,status").eq("clinic_id",clinicId).limit(3000),
   supabaseClient.from("pharmacy_inventory").select("id,medicine_name,quantity,reorder_level,expiry_date").eq("clinic_id",clinicId).limit(5000),
   supabaseClient.from("clinical_encounters").select("id,status,started_at").eq("clinic_id",clinicId).gte("started_at",todayStart.toISOString()).lt("started_at",isoTomorrow).limit(3000)
  ]);
  const failed=results.find(r=>r.error);if(failed)throw failed.error;
  const patients=results[0].count||0,appointments=results[1].data||[],billing=results[2].data||[],services=results[3].data||[],queue=results[4].data||[],beds=results[5].data||[],stock=results[6].data||[],encounters=results[7].data||[];
  const appointmentsToday=appointments.filter(x=>x.scheduled_at&&new Date(x.scheduled_at)>=todayStart&&new Date(x.scheduled_at)<tomorrow);
  const todaysBills=billing.filter(x=>x.transaction_date&&new Date(x.transaction_date)>=todayStart&&new Date(x.transaction_date)<tomorrow);
  const collectedToday=todaysBills.reduce((n,x)=>n+Number(x.amount_paid||0),0);
  const outstanding=billing.reduce((n,x)=>n+Math.max(0,Number(x.invoice_amount||0)-Number(x.amount_paid||0)),0);
  const performedValue=services.reduce((n,x)=>n+(Number(x.quantity||0)*Number(x.unit_price||0)),0);
  const waiting=queue.filter(x=>["waiting","triage","called"].includes(x.status));
  const urgent=waiting.filter(x=>["urgent","emergency"].includes(x.priority));
  const occupied=beds.filter(x=>x.status==="occupied").length;
  const low=stock.filter(x=>Number(x.quantity||0)<=Number(x.reorder_level||0));
  const expired=stock.filter(x=>x.expiry_date&&new Date(x.expiry_date)<todayStart);
  const soon=stock.filter(x=>x.expiry_date&&new Date(x.expiry_date)>=todayStart&&new Date(x.expiry_date)<new Date(todayStart.getTime()+30*86400000));
  set("aiPatientsTotal",num(patients));set("aiAppointmentsToday",num(appointmentsToday.length));set("aiRevenueToday",money(collectedToday));
  set("aiOutstanding",money(outstanding));set("aiServicesToday",num(services.length));set("aiQueueWaiting",num(waiting.length));
  set("aiBedsOccupied",num(occupied));set("aiLowStock",num(low.length));
  const trend=$("aiRevenueTrendBody");trend.replaceChildren();
  for(let offset=6;offset>=0;offset--){
   const day=new Date(todayStart);day.setDate(day.getDate()-offset);const key=dateKey(day);
   const rows=billing.filter(x=>x.transaction_date&&dateKey(x.transaction_date)===key);
   const invoiced=rows.reduce((n,x)=>n+Number(x.invoice_amount||0),0),paid=rows.reduce((n,x)=>n+Number(x.amount_paid||0),0);
   const tr=trend.insertRow();cell(tr,day.toLocaleDateString());cell(tr,num(rows.length));cell(tr,money(invoiced));cell(tr,money(paid));cell(tr,money(Math.max(0,invoiced-paid)));
  }

  const dailyRevenue=[];
  for(let offset=6;offset>=0;offset--){const day=new Date(todayStart);day.setDate(day.getDate()-offset);const key=dateKey(day);const rows=billing.filter(x=>x.transaction_date&&dateKey(x.transaction_date)===key);dailyRevenue.push({label:day.toLocaleDateString("en-NG",{weekday:"short"}),value:rows.reduce((n,x)=>n+Number(x.amount_paid||0),0)});}
  renderMiniChart("aiRevenueChart","line",dailyRevenue,v=>money(v));
  const revenueTotal=dailyRevenue.reduce((n,x)=>n+x.value,0),dailyMean=revenueTotal/7;
  set("aiRevenueChartEvidence","Source: billing_transactions · 7 calendar days · "+num(todaysBills.length)+" payments today · 7-day mean "+money(dailyMean)+".");
  const appointmentStatus=["scheduled","confirmed","completed","cancelled","no_show","checked_in"];
  const appointmentCounts=appointmentStatus.map(status=>({label:status.replaceAll("_"," "),value:appointments.filter(a=>a.status===status).length}));
  renderMiniChart("aiAppointmentChart","bar",appointmentCounts);
  set("aiAppointmentChartEvidence","Source: appointments.scheduled_at · "+num(appointments.length)+" records in 7 days · today "+num(appointmentsToday.length)+".");
  const stockRisk=[
   {label:"Healthy",value:stock.filter(x=>Number(x.quantity||0)>Number(x.reorder_level||0)&&!(x.expiry_date&&new Date(x.expiry_date)<todayStart)).length},
   {label:"Low stock",value:low.length},{label:"Expired",value:expired.length},{label:"Expiring soon",value:soon.length}
  ];
  renderMiniChart("aiStockChart","bar",stockRisk);
  set("aiStockChartEvidence","Source: pharmacy_inventory · "+num(stock.length)+" batches · expiring soon means within 30 days. Risk categories may overlap.");
  const analysis=[
   {title:"7-day revenue average",value:money(dailyMean),note:"Recorded amount_paid divided by 7 calendar days; not a forecast."},
   {title:"Appointment completion rate",value:appointments.length?((appointments.filter(a=>a.status==="completed").length/appointments.length)*100).toFixed(1)+"%":"No data",note:"Completed appointments divided by all appointments in the 7-day window."},
   {title:"Low-stock batch share",value:stock.length?((low.length/stock.length)*100).toFixed(1)+"%":"No data",note:"Batches at/below reorder level divided by all inventory batches."},
   {title:"Occupied bed share",value:beds.length?((occupied/beds.length)*100).toFixed(1)+"%":"No data",note:"Beds marked occupied divided by all beds returned for this clinic."}
  ];
  const evidence=$("aiEvidenceAnalysis");if(evidence){evidence.replaceChildren();analysis.forEach(x=>{const card=document.createElement("article");card.className="stat-card";const p=document.createElement("p");p.textContent=x.title;const v=document.createElement("h3");v.textContent=x.value;const n=document.createElement("p");n.className="muted";n.textContent=x.note;card.append(p,v,n);evidence.appendChild(card);});}
  const insights=[
   {title:"Urgent / emergency queue",value:num(urgent.length),note:urgent.length?"Priority patients need prompt staff attention.":"No urgent or emergency priority entries currently in the active queue."},
   {title:"Expired medicine batches",value:num(expired.length),note:expired.length?"Quarantine and review expired batches; do not dispense.":"No expired batch is currently recorded in this inventory result."},
   {title:"Medicine expiring within 30 days",value:num(soon.length),note:soon.length?"Review near-expiry stock and plan safe use or supplier action.":"No batches recorded as expiring within 30 days."},
   {title:"Low-stock medicine batches",value:num(low.length),note:low.length?"Review reorder needs against current demand and supplier lead time.":"No batch is currently at or below its recorded reorder level."},
   {title:"Clinical encounters today",value:num(encounters.length),note:"Open and completed encounters started today."},
   {title:"Services value today",value:money(performedValue),note:"Recorded performed/verified quantity multiplied by unit price; verify billing linkage."}
  ];
  renderInsights(insights);
  say("Updated "+new Date().toLocaleTimeString()+". Loaded "+num(billing.length)+" billing records for financial calculations; patient count uses the database exact count.");
 }
 $("aiAnalyticsRefresh")?.addEventListener("click",()=>loadAIAnalytics().catch(e=>say("Analytics could not be refreshed: "+(e.message||"Unknown error"),true)));
 window.loadAIAnalytics=loadAIAnalytics;
})();



// HEALTHOS AI: ENCRYPTED OFFLINE PATIENT DIRECTORY (MINIMUM IDENTIFIERS ONLY)
(function initOfflinePatientDirectory(){
 const $=id=>document.getElementById(id);
 const DB="healthos_offline_directory_v1",STORE="secure_cache",KEY="patient_directory";
 let cachedRows=[];
 function status(text,error=false){const el=$("offlineDirectoryStatus");if(el){el.textContent=text;el.className="message"+(error?" error":" success");}}
 function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
 async function put(value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(value,KEY);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
 async function get(){const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get(KEY);req.onsuccess=()=>{db.close();resolve(req.result||null);};req.onerror=()=>{db.close();reject(req.error);};});}
 async function clear(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(KEY);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
 function currentIdentity(){return currentUser&&currentClinic?{user:currentUser.id,clinic:currentClinic.id}:null;}
 async function refresh(){
  const identity=currentIdentity();if(!identity){status("Sign in to an authorised clinic workspace first.",true);return;}
  if(!navigator.onLine){status("Connect to the internet before refreshing the encrypted directory.",true);return;}
  status("Loading minimum patient identifiers securely…");
  const {data,error}=await supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id",identity.clinic).order("first_name").limit(2000);
  if(error){status("Directory refresh failed: "+error.message,true);return;}
  try{
   const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
   const iv=crypto.getRandomValues(new Uint8Array(12));
   const payload={owner:identity,expiresAt:Date.now()+8*60*60*1000,patients:(data||[]).map(p=>({id:p.id,patient_number:p.patient_number,first_name:p.first_name,last_name:p.last_name}))};
   const encoded=new TextEncoder().encode(JSON.stringify(payload));
   const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoded);
   await put({key,iv:Array.from(iv),ciphertext,createdAt:Date.now()});
   cachedRows=payload.patients;render();
   status("Encrypted directory refreshed: "+cachedRows.length+" basic patient entries. Expires in 8 hours.");
  }catch(e){status("Secure offline storage is unavailable on this browser.",true);console.error(e);}
 }
 async function unlock(){
  const identity=currentIdentity();if(!identity){cachedRows=[];return false;}
  try{
   const record=await get();if(!record){cachedRows=[];return false;}
   const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(record.iv)},record.key,record.ciphertext);
   const payload=JSON.parse(new TextDecoder().decode(plain));
   if(payload.owner.user!==identity.user||payload.owner.clinic!==identity.clinic||payload.expiresAt<Date.now()){
    await clear();cachedRows=[];status("Offline directory expired or belongs to another session. Refresh it online.");return false;
   }
   cachedRows=payload.patients||[];return true;
  }catch(e){cachedRows=[];status("Could not unlock the offline directory. Erase it and refresh while online.",true);return false;}
 }
 function render(){
  const box=$("offlineDirectoryResults"),query=($("offlineDirectorySearch")?.value||"").trim().toLowerCase();if(!box)return;
  box.replaceChildren();
  const matches=cachedRows.filter(p=>[p.patient_number,p.first_name,p.last_name].filter(Boolean).join(" ").toLowerCase().includes(query)).slice(0,50);
  if(!matches.length){box.textContent="No matching saved directory entries.";return;}
  const list=document.createElement("ul");
  matches.forEach(p=>{const li=document.createElement("li");li.textContent=[p.patient_number,p.first_name,p.last_name].filter(Boolean).join(" — ");list.appendChild(li);});
  box.appendChild(list);
 }
 $("offlineDirectoryRefresh")?.addEventListener("click",refresh);
 $("offlineDirectoryClear")?.addEventListener("click",async()=>{await clear();cachedRows=[];render();status("Offline directory erased from this browser.");});
 $("offlineDirectorySearch")?.addEventListener("input",render);
 window.addEventListener("online",()=>status("Internet connection restored. Refresh the offline directory when needed."));
 window.addEventListener("offline",async()=>{const ok=await unlock();status(ok?"Offline mode: encrypted basic directory unlocked. Clinical records remain unavailable offline.":"Offline mode: no valid offline directory is available.",!ok);render();});
 window.addEventListener("beforeunload",()=>{cachedRows=[];});
 if(!navigator.onLine)unlock().then(ok=>{render();status(ok?"Offline mode: encrypted basic directory unlocked. Clinical records remain unavailable offline.":"Offline mode: no valid offline directory is available.",!ok);});
 if(currentIdentity())unlock().then(ok=>{if(ok){render();status("Encrypted offline directory available for this signed-in clinic user.");}});
})();


// HEALTHOS AI: ENCRYPTED OFFLINE CLINICAL NOTE QUEUE
// Drafts remain unsigned and are inserted only after online ownership/status checks.
(function initOfflineClinicalQueue(){
 const $=id=>document.getElementById(id);
 const DB="healthos_offline_directory_v1",STORE="secure_cache",KEY="clinical_note_queue";
 let queue=[];
 const say=(m,error=false)=>{const el=$("offlineClinicalStatus");if(el){el.textContent=m;el.className="message"+(error?" error":" success");}};
 const identity=()=>currentUser&&currentClinic?{user:currentUser.id,clinic:currentClinic.id}:null;
 function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async function read(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE).objectStore(STORE).get(KEY);r.onsuccess=()=>{d.close();resolve(r.result||null);};r.onerror=()=>{d.close();reject(r.error);};});}
 async function write(v){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(v,KEY);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>{d.close();reject(t.error);};});}
 async function erase(){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).delete(KEY);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>{d.close();reject(t.error);};});}
 async function persist(){
  const who=identity();if(!who)throw new Error("Sign in to your clinic workspace first.");
  const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const payload={owner:who,expiresAt:Date.now()+8*60*60*1000,items:queue};
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(payload)));
  await write({key,iv:Array.from(iv),ciphertext});
 }
 async function unlock(){
  const who=identity();if(!who){queue=[];return false;}
  try{
   const record=await read();if(!record){queue=[];return true;}
   const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(record.iv)},record.key,record.ciphertext);
   const payload=JSON.parse(new TextDecoder().decode(plain));
   if(payload.owner.user!==who.user||payload.owner.clinic!==who.clinic||payload.expiresAt<Date.now()){await erase();queue=[];say("Offline clinical queue expired or belongs to another account. It was erased.");return false;}
   queue=payload.items||[];return true;
  }catch(e){queue=[];say("Could not unlock the encrypted clinical queue. Erase it before creating a new queue.",true);return false;}
 }
 function render(){
  const body=$("offlineClinicalQueueBody");if(!body)return;body.replaceChildren();
  if(!queue.length){const r=body.insertRow();const c=r.insertCell();c.colSpan=5;c.textContent="No queued notes.";return;}
  queue.forEach(item=>{
   const r=body.insertRow();
   [new Date(item.createdAt).toLocaleString(),item.encounterLabel,item.noteType,item.status].forEach(v=>{const c=r.insertCell();c.textContent=v;});
   const action=r.insertCell();
   if(item.status==="conflict"||item.status==="sync_error"){const b=document.createElement("button");b.type="button";b.className="logout-button";b.textContent="Retry after review";b.addEventListener("click",()=>{item.status="queued";persist().then(render);});action.appendChild(b);}
  });
 }
 async function loadEncounters(){
  const select=$("offlineClinicalEncounter");if(!select)return;
  if(!identity())return;
  const {data,error}=await supabaseClient.from("clinical_encounters").select("id,encounter_number,status,clinician_id").eq("clinic_id",currentClinic.id).eq("clinician_id",currentUser.id).in("status",["open","in_progress"]).order("started_at",{ascending:false}).limit(100);
  if(error){say("Could not load assigned encounters: "+error.message,true);return;}
  const old=select.value;select.replaceChildren(new Option("Select your encounter",""));
  (data||[]).forEach(x=>select.add(new Option(x.encounter_number+" — "+x.status,x.id)));
  if((data||[]).some(x=>x.id===old))select.value=old;
 }
 $("offlineClinicalQueueForm")?.addEventListener("submit",async ev=>{
  ev.preventDefault();
  if(!identity()){say("Sign in to your clinic workspace first.",true);return;}
  const encounterId=$("offlineClinicalEncounter").value;
  const note=$("offlineClinicalText").value.trim();
  if(!encounterId||!note){say("Select an assigned open encounter and enter the note.",true);return;}
  if(!navigator.onLine&&!$("offlineClinicalEncounter").selectedOptions[0]){say("Choose an encounter that was loaded while you were online.",true);return;}
  const encounter=$("offlineClinicalEncounter").selectedOptions[0];
  queue.push({id:crypto.randomUUID(),encounterId,encounterLabel:encounter?.textContent||"Encounter",noteType:$("offlineClinicalType").value,noteText:note,createdAt:Date.now(),status:"queued"});
  try{await persist();$("offlineClinicalText").value="";render();say("Encrypted unsigned note saved on this device. It has not been added to the medical record.");}
  catch(e){queue.pop();say("Could not securely save this note: "+e.message,true);}
 });
 $("offlineClinicalSync")?.addEventListener("click",async()=>{
  if(!navigator.onLine){say("Connect to the internet before syncing.",true);return;}
  if(!identity()){say("Sign in to the same clinic user who created these notes.",true);return;}
  const button=$("offlineClinicalSync");button.disabled=true;
  try{
   await unlock();
   let synced=0,conflicts=0,failed=0;
   for(const item of queue.filter(x=>x.status!=="synced")){
    const {data:enc,error:encError}=await supabaseClient.from("clinical_encounters").select("id,status,clinician_id").eq("id",item.encounterId).eq("clinic_id",currentClinic.id).maybeSingle();
    if(encError||!enc||enc.clinician_id!==currentUser.id||!["open","in_progress"].includes(enc.status)){item.status="conflict";item.syncMessage="Encounter unavailable, closed or not assigned to this clinician.";conflicts++;continue;}
    const {error}=await supabaseClient.from("clinical_notes").insert({id:item.id,clinic_id:currentClinic.id,encounter_id:item.encounterId,note_type:item.noteType,note_text:item.noteText,author_id:currentUser.id,status:"draft"});
    if(!error){item.status="synced";item.syncedAt=Date.now();synced++;continue;}
    if(error.code==="23505"){
     const {data:existing}=await supabaseClient.from("clinical_notes").select("id,encounter_id,note_type,note_text,author_id").eq("id",item.id).eq("clinic_id",currentClinic.id).maybeSingle();
     if(existing&&existing.encounter_id===item.encounterId&&existing.note_type===item.noteType&&existing.note_text===item.noteText&&existing.author_id===currentUser.id){item.status="synced";item.syncedAt=Date.now();synced++;}
     else{item.status="conflict";item.syncMessage="A record with this queue ID exists but its content differs.";conflicts++;}
    }else{item.status="sync_error";item.syncMessage=error.message;failed++;}
   }
   await persist();render();
   say("Sync complete: "+synced+" saved as unsigned drafts, "+conflicts+" conflict(s), "+failed+" error(s). Review unresolved items before retrying.");
   if(synced&&window.loadHealthOSClinicalRecords)await window.loadHealthOSClinicalRecords();
  }catch(e){say("Sync could not complete: "+e.message,true);}
  finally{button.disabled=false;}
 });
 $("offlineClinicalErase")?.addEventListener("click",async()=>{if(!confirm("Permanently erase all queued offline clinical notes from this browser?"))return;await erase();queue=[];render();say("Offline clinical queue erased from this device.");});
 window.addEventListener("online",()=>say("Connection restored. Review queued notes and sync when ready."));
 window.addEventListener("offline",()=>say("Offline mode. New notes can be encrypted locally; syncing is unavailable."));
 async function init(){
  if(!window.crypto?.subtle||!window.indexedDB){say("This browser does not support secure offline storage.",true);return;}
  await unlock();await loadEncounters();render();
  if(queue.length)say(queue.length+" encrypted note(s) available. Sync only after reconnecting and reviewing conflicts.");
 }
 document.querySelectorAll(".sidebar .nav-item").forEach(link=>link.addEventListener("click",()=>{if((link.getAttribute("href")||"")==="#clinicalRecords")void init();}));
 window.addEventListener("online",()=>{if(identity())void loadEncounters();});
 init();
})();


// HEALTHOS AI: ENCRYPTED OFFLINE VITALS QUEUE
(function initOfflineVitalsQueue(){
 const $=id=>document.getElementById(id), DB="healthos_offline_directory_v1", STORE="secure_cache", KEY="vitals_queue";
 let items=[];
 const who=()=>currentUser&&currentClinic?{user:currentUser.id,clinic:currentClinic.id}:null;
 const say=(m,e=false)=>{const el=$("offlineVitalsStatus");if(el){el.textContent=m;el.className="message"+(e?" error":" success");}};
 function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async function get(){const d=await openDb();return new Promise((resolve,reject)=>{const r=d.transaction(STORE).objectStore(STORE).get(KEY);r.onsuccess=()=>{d.close();resolve(r.result||null);};r.onerror=()=>{d.close();reject(r.error);};});}
 async function put(v){const d=await openDb();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(v,KEY);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>{d.close();reject(t.error);};});}
 async function remove(){const d=await openDb();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).delete(KEY);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>{d.close();reject(t.error);};});}
 async function saveEncrypted(){
  const owner=who();if(!owner)throw new Error("Sign in to the clinic workspace first.");
  const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data={owner,expiresAt:Date.now()+8*60*60*1000,items};
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(data)));
  await put({key,iv:Array.from(iv),ciphertext});
 }
 async function unlock(){
  if(!who()){items=[];return false;}
  try{
   const rec=await get();if(!rec){items=[];return true;}
   const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(rec.iv)},rec.key,rec.ciphertext);
   const data=JSON.parse(new TextDecoder().decode(plain));
   if(data.owner.user!==who().user||data.owner.clinic!==who().clinic||data.expiresAt<Date.now()){await remove();items=[];say("Offline observations expired or belong to another account; the queue was erased.");return false;}
   items=data.items||[];return true;
  }catch(e){items=[];say("Encrypted offline observations could not be unlocked. Erase the queue before starting again.",true);return false;}
 }
 const ids=["clinicalTemperature","clinicalSystolic","clinicalDiastolic","clinicalPulse","clinicalRespiratory","clinicalOxygen","clinicalWeight","clinicalHeight","clinicalPain"];
 const fields=["temperature_c","systolic_bp","diastolic_bp","pulse_bpm","respiratory_rate","oxygen_saturation","weight_kg","height_cm","pain_score"];
 function capture(){
  const values={};ids.forEach((id,i)=>values[fields[i]]=$(id).value===""?null:Number($(id).value));
  return values;
 }
 function valid(v){return Object.values(v).some(x=>x!==null)&&
  (v.temperature_c===null||(v.temperature_c>=25&&v.temperature_c<=45))&&
  (v.systolic_bp===null||(Number.isInteger(v.systolic_bp)&&v.systolic_bp>=40&&v.systolic_bp<=300))&&
  (v.diastolic_bp===null||(Number.isInteger(v.diastolic_bp)&&v.diastolic_bp>=20&&v.diastolic_bp<=200))&&
  (v.pulse_bpm===null||(Number.isInteger(v.pulse_bpm)&&v.pulse_bpm>=20&&v.pulse_bpm<=250))&&
  (v.respiratory_rate===null||(Number.isInteger(v.respiratory_rate)&&v.respiratory_rate>=4&&v.respiratory_rate<=80))&&
  (v.oxygen_saturation===null||(v.oxygen_saturation>=0&&v.oxygen_saturation<=100))&&
  (v.weight_kg===null||(v.weight_kg>=0.2&&v.weight_kg<=500))&&
  (v.height_cm===null||(v.height_cm>=20&&v.height_cm<=250))&&
  (v.pain_score===null||(Number.isInteger(v.pain_score)&&v.pain_score>=0&&v.pain_score<=10));}
 function render(){
  const body=$("offlineVitalsBody");if(!body)return;body.replaceChildren();
  if(!items.length){const r=body.insertRow(),c=r.insertCell();c.colSpan=5;c.textContent="No queued observations.";return;}
  items.forEach(x=>{const r=body.insertRow();[new Date(x.capturedAt).toLocaleString(),x.encounterLabel,
   fields.filter(k=>x.values[k]!==null).map(k=>k.replaceAll("_"," ")+": "+x.values[k]).join("; "),x.status,x.detail||"—"
  ].forEach(v=>{const c=r.insertCell();c.textContent=v;});});
 }
 $("offlineVitalsSave")?.addEventListener("click",async()=>{
  if(!who()){say("Sign in to your clinic workspace first.",true);return;}
  const encounterId=$("clinicalVitalsEncounter").value;
  if(!encounterId){say("Select an encounter that was loaded while online.",true);return;}
  const values=capture();
  if(!valid(values)){say("Enter at least one valid observation. Check each value's permitted range.",true);return;}
  const option=$("clinicalVitalsEncounter").selectedOptions[0];
  const item={id:crypto.randomUUID(),encounterId,encounterLabel:option?.textContent||"Encounter",patientId:null,values,notes:$("clinicalVitalsNotes").value.trim()||null,capturedAt:Date.now(),status:"queued",detail:"Awaiting online encounter verification"};
  try{
   if(navigator.onLine){
    const {data,error}=await supabaseClient.from("clinical_encounters").select("id,patient_id,status,clinician_id").eq("id",encounterId).eq("clinic_id",currentClinic.id).maybeSingle();
    if(error||!data||data.clinician_id!==currentUser.id||!["open","in_progress"].includes(data.status)){say("Encounter is not available to this clinician or is no longer open.",true);return;}
    item.patientId=data.patient_id;
   }
   items.push(item);await saveEncrypted();render();
   ids.forEach(id=>$(id).value="");$("clinicalVitalsNotes").value="";
   say("Vital observations encrypted on this device. They have not yet been added to the medical record.");
  }catch(e){say("Could not securely queue observations: "+e.message,true);}
 });
 $("offlineVitalsSync")?.addEventListener("click",async()=>{
  if(!navigator.onLine){say("Connect to the internet before syncing.",true);return;}
  if(!who()){say("Sign in to the same clinic account that captured these observations.",true);return;}
  const b=$("offlineVitalsSync");b.disabled=true;
  try{
   await unlock();let saved=0,conflicts=0,failed=0;
   for(const x of items.filter(v=>v.status!=="synced")){
    const {data:enc,error:ee}=await supabaseClient.from("clinical_encounters").select("id,patient_id,status,clinician_id").eq("id",x.encounterId).eq("clinic_id",currentClinic.id).maybeSingle();
    if(ee||!enc||enc.clinician_id!==currentUser.id||!["open","in_progress"].includes(enc.status)){x.status="conflict";x.detail="Encounter unavailable, closed or not assigned to this clinician.";conflicts++;continue;}
    x.patientId=enc.patient_id;
    const payload={id:x.id,clinic_id:currentClinic.id,encounter_id:x.encounterId,patient_id:enc.patient_id,...x.values,notes:x.notes,recorded_by:currentUser.id,recorded_at:new Date(x.capturedAt).toISOString()};
    const {error}=await supabaseClient.from("patient_vitals").insert(payload);
    if(!error){x.status="synced";x.detail="Saved to patient record";saved++;continue;}
    if(error.code==="23505"){
     const {data:existing}=await supabaseClient.from("patient_vitals").select("id,encounter_id,patient_id,recorded_by").eq("id",x.id).eq("clinic_id",currentClinic.id).maybeSingle();
     if(existing&&existing.encounter_id===x.encounterId&&existing.patient_id===enc.patient_id&&existing.recorded_by===currentUser.id){x.status="synced";x.detail="Already synced";saved++;}
     else{x.status="conflict";x.detail="A record with this queue ID exists but does not match.";conflicts++;}
    }else{x.status="sync_error";x.detail=error.message;failed++;}
   }
   await saveEncrypted();render();say("Sync complete: "+saved+" observation set(s) saved, "+conflicts+" conflict(s), "+failed+" error(s). Check the clinical record and resolve conflicts.");
   if(saved&&window.loadHealthOSClinicalRecords)await window.loadHealthOSClinicalRecords();
  }catch(e){say("Sync could not complete: "+e.message,true);}
  finally{b.disabled=false;}
 });
 $("offlineVitalsErase")?.addEventListener("click",async()=>{if(!confirm("Permanently erase queued offline vital observations from this device?"))return;await remove();items=[];render();say("Offline vital observations erased from this device.");});
 async function init(){if(!crypto?.subtle||!indexedDB){say("This browser does not support secure offline storage.",true);return;}await unlock();render();}
 document.querySelectorAll(".sidebar .nav-item").forEach(link=>link.addEventListener("click",()=>{if((link.getAttribute("href")||"")==="#clinicalRecords")void init();}));
 window.addEventListener("online",()=>say("Connection restored. Review queued observations and sync when ready."));
 init();
})();


async function loadDepartmentAppointmentInbox(departmentId) {
 const body=document.getElementById("departmentAppointmentInboxBody");
 const message=document.getElementById("departmentAppointmentInboxMessage");
 if(!body||!message)return;
 if(!currentUser||!currentClinic||!departmentId){message.textContent="Choose one of your active assigned departments.";return;}
 body.replaceChildren();message.textContent="Loading department requests...";
 try{
  const [{data:rows,error},{data:patients,error:patientsError},{data:names,error:namesError}]=await Promise.all([
   supabaseClient.from("healthos_patient_appointment_requests").select("id,patient_user_id,department_id,requested_at,reason,visit_type,status,patient_note,linked_appointment_id").eq("clinic_id",currentClinic.id).eq("department_id",departmentId).order("created_at",{ascending:false}).limit(200),
   supabaseClient.from("patients").select("id,first_name,last_name,patient_number").eq("clinic_id",currentClinic.id).order("first_name").limit(1000),
   supabaseClient.rpc("healthos_get_department_appointment_patient_names",{p_clinic_id:currentClinic.id,p_department_id:departmentId})
  ]);
  if(error)throw error;if(patientsError)throw patientsError;if(namesError)throw namesError;
  const data=rows||[], patientRows=patients||[], patientNames=new Map((names||[]).map(x=>[x.patient_user_id,x.full_name]));
  const count=(status)=>data.filter(x=>x.status===status).length;
  document.getElementById("departmentApptPending").textContent=count("requested");
  document.getElementById("departmentApptAccepted").textContent=count("accepted");
  document.getElementById("departmentApptRejected").textContent=count("rejected");
  document.getElementById("departmentApptCompleted").textContent=count("completed");
  if(!data.length){body.innerHTML='<tr><td colspan="7">No requests routed to this department.</td></tr>';message.textContent="Department inbox is clear.";message.className="message success";return;}
  data.forEach(row=>{
   const tr=document.createElement("tr");
   const cells=[new Date(row.created_at||row.requested_at).toLocaleString(),patientNames.get(row.patient_user_id)||"Patient",new Date(row.requested_at).toLocaleString(),String(row.visit_type||"").replace(/_/g," "),row.reason||"—",row.status];
   cells.forEach(value=>{const td=document.createElement("td");td.textContent=value;tr.appendChild(td);});
   const action=document.createElement("td");
   if(row.status==="requested"){
    const selector=document.createElement("select");selector.add(new Option("Match hospital patient record",""));
    patientRows.forEach(p=>selector.add(new Option([p.first_name,p.last_name].filter(Boolean).join(" ")+" · "+p.patient_number,p.id)));
    const accept=document.createElement("button");accept.type="button";accept.className="primary-button";accept.textContent="Accept";
    accept.addEventListener("click",async()=>{
     if(!selector.value){message.textContent="Select the correct hospital patient record first.";message.className="message error";return;}
     accept.disabled=true;accept.textContent="Accepting...";
     const {data:appointmentId,error:rpcError}=await supabaseClient.rpc("healthos_accept_patient_appointment_request",{p_request_id:row.id,p_patient_id:selector.value});
     if(rpcError){message.textContent=friendlyError(rpcError);message.className="message error";accept.disabled=false;accept.textContent="Accept";return;}
     message.textContent="Accepted. Appointment added to the hospital register.";message.className="message success";
     if(typeof loadAppointments==="function")await loadAppointments();
     await loadDepartmentAppointmentInbox(departmentId);
    });
    const reject=document.createElement("button");reject.type="button";reject.className="logout-button";reject.textContent="Reject";
    reject.addEventListener("click",async()=>{
     if(!confirm("Reject this request for this department?"))return;
     reject.disabled=true;
     const {error:updateError}=await supabaseClient.from("healthos_patient_appointment_requests").update({status:"rejected",reviewed_at:new Date().toISOString(),reviewed_by:currentUser.id,updated_at:new Date().toISOString()}).eq("id",row.id).eq("status","requested");
     if(updateError){message.textContent=friendlyError(updateError);message.className="message error";reject.disabled=false;return;}
     await loadDepartmentAppointmentInbox(departmentId);
    });
    action.append(selector,accept,reject);
   }else {
    action.textContent=row.linked_appointment_id?"Linked appointment: "+row.linked_appointment_id:"No action required";
    if(row.status==="accepted"&&["audio","video"].includes(row.visit_type)){
     const prepare=document.createElement("button");prepare.type="button";prepare.className="primary-button";prepare.textContent="Prepare remote consultation";
     prepare.addEventListener("click",async()=>{
      prepare.disabled=true;prepare.textContent="Preparing...";
      const {data,error}=await supabaseClient.rpc("healthos_create_telemedicine_session",{p_request_id:row.id});
      if(error){message.textContent=friendlyError(error);message.className="message error";prepare.disabled=false;prepare.textContent="Prepare remote consultation";return;}
      message.textContent="Remote consultation session created. Provider connection is still required before the patient can join.";message.className="message success";
      prepare.textContent=data?.session_status==="awaiting_provider"?"Provider connection pending":"Session prepared";
     });
     action.appendChild(prepare);
    }
   }
   tr.appendChild(action);body.appendChild(tr);
  });
  message.textContent=data.length+" request(s) loaded for this department. Patient records are matched only when accepting.";
  message.className="message success";
 }catch(error){message.textContent=friendlyError(error);message.className="message error";}
}
const refreshDepartmentAppointmentInbox=document.getElementById("refreshDepartmentAppointmentInbox");
if(refreshDepartmentAppointmentInbox)refreshDepartmentAppointmentInbox.addEventListener("click",()=>{
 const select=document.getElementById("staffDepartmentContextSelect");
 if(select?.selectedOptions?.length)loadDepartmentAppointmentInbox(select.selectedOptions[0].dataset.departmentId||"");
});

window.loadPatientAppointmentRequests=async function(){
 const body=document.getElementById("patientAppointmentReviewBody"),message=document.getElementById("patientAppointmentReviewMessage");if(!body||!message)return;
 if(!currentUser||!currentClinic){message.textContent="Open an authorised hospital workspace first.";message.className="message error";return;}
 body.replaceChildren();message.textContent="Loading appointment requests...";
 try{
 const [{data:rows,error},{data:patients,error:patientsError}]=await Promise.all([
  supabaseClient.from("healthos_patient_appointment_requests").select("id,patient_user_id,requested_at,reason,visit_type,status,patient_note,linked_appointment_id").eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(200),
  supabaseClient.from("patients").select("id,first_name,last_name,patient_number").eq("clinic_id",currentClinic.id).order("first_name").limit(1000)
 ]);
 if(error)throw error;if(patientsError)throw patientsError;
 const data=rows||[],patientRows=patients||[];
 document.getElementById("patientAppointmentPendingCount").textContent=data.filter(x=>x.status==="requested").length;
 document.getElementById("patientAppointmentAcceptedCount").textContent=data.filter(x=>x.status==="accepted").length;
 document.getElementById("patientAppointmentRejectedCount").textContent=data.filter(x=>x.status==="rejected").length;
 if(!data.length){body.innerHTML='<tr><td colspan="6">No appointment requests yet.</td></tr>';message.textContent="No requests found.";return;}
 const uids=[...new Set(data.map(x=>x.patient_user_id))];
 const {data:profiles,error:pError}=await supabaseClient.from("healthos_patient_profiles").select("user_id,full_name").in("user_id",uids);if(pError)throw pError;
 const names=new Map((profiles||[]).map(x=>[x.user_id,x.full_name]));
 data.forEach(row=>{
  const tr=document.createElement("tr");
  [new Date(row.requested_at).toLocaleString(),names.get(row.patient_user_id)||"Patient",row.visit_type.replace(/_/g," "),row.reason,row.status].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
  const action=document.createElement("td");
  if(row.status==="requested"){
   const selector=document.createElement("select");selector.setAttribute("aria-label","Match this request to a hospital patient record");selector.add(new Option("Select hospital patient record",""));
   patientRows.forEach(p=>selector.add(new Option([p.first_name,p.last_name].filter(Boolean).join(" ")+" · "+p.patient_number,p.id)));
   const accept=document.createElement("button");accept.type="button";accept.className="primary-button";accept.textContent="Accept & add to appointments";
   accept.addEventListener("click",async()=>{
    if(!selector.value){message.textContent="Select the matching hospital patient record before accepting.";message.className="message error";return;}
    if(!confirm("Create a scheduled appointment in this hospital's appointment register for the selected patient record?"))return;
    accept.disabled=true;accept.textContent="Creating appointment...";
    const {data:appointmentId,error:rpcError}=await supabaseClient.rpc("healthos_accept_patient_appointment_request",{p_request_id:row.id,p_patient_id:selector.value});
    if(rpcError){message.textContent=friendlyError(rpcError);message.className="message error";accept.disabled=false;accept.textContent="Accept & add to appointments";return;}
    message.textContent="Appointment created and added to the hospital appointment register ("+appointmentId+").";message.className="message success";
    if(typeof loadAppointments==="function")await loadAppointments();await window.loadPatientAppointmentRequests();
   });
   const reject=document.createElement("button");reject.type="button";reject.className="logout-button";reject.textContent="Reject";
   reject.addEventListener("click",async()=>{if(!confirm("Reject this appointment request?"))return;reject.disabled=true;const {error:updateError}=await supabaseClient.from("healthos_patient_appointment_requests").update({status:"rejected",reviewed_at:new Date().toISOString(),reviewed_by:currentUser.id,updated_at:new Date().toISOString()}).eq("id",row.id).eq("clinic_id",currentClinic.id).eq("status","requested");if(updateError){message.textContent=friendlyError(updateError);message.className="message error";reject.disabled=false;return;}await window.loadPatientAppointmentRequests();});
   action.append(selector,accept,reject);
  }else if(row.status==="accepted")action.textContent=row.linked_appointment_id?"Added to hospital appointment register":"Accepted";
  else action.textContent="No action";
  tr.appendChild(action);body.appendChild(tr);
 });
 message.textContent=data.length+" appointment request(s) loaded. Match each patient to the correct hospital record before accepting.";message.className="message success";
 }catch(error){message.textContent=friendlyError(error);message.className="message error";}
};
const refreshPatientAppointmentRequests=document.getElementById("refreshPatientAppointmentRequests");
if(refreshPatientAppointmentRequests)refreshPatientAppointmentRequests.addEventListener("click",()=>window.loadPatientAppointmentRequests());



async function loadPatientInternationalPayments(){
 const target=document.getElementById("patientInternationalPayments");
 if(!target||!currentUser)return;
 target.replaceChildren();
 const {data,error}=await supabaseClient.rpc("healthos_get_my_international_payment_intents");
 if(error)throw error;
 const rows=Array.isArray(data)?data:[];
 if(!rows.length){target.textContent="No hospital payment requests have been issued to your account.";return;}
 rows.forEach(item=>{
  const card=document.createElement("article");card.className="stat-card";
  const title=document.createElement("h3");title.textContent=item.hospital_name||"Connected hospital";
  const detail=document.createElement("p");detail.textContent=(item.description||"Healthcare payment")+" · "+(item.invoice_reference||"No invoice reference");
  const amount=document.createElement("strong");amount.textContent=Number(item.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+" "+String(item.currency||"").trim();
  const status=document.createElement("p");status.textContent="Status: "+String(item.status).replace(/_/g," ");
  const provider=document.createElement("p");provider.textContent=item.provider_key==="unconfigured"?"Online checkout not yet available":("Payment provider: "+item.provider_key);
  card.append(title,detail,amount,status,provider);target.appendChild(card);
 });
}
async function loadInternationalPaymentWorkspace(clinic){
 const body=document.getElementById("internationalPaymentRows");
 const message=document.getElementById("internationalPaymentMessage");
 if(!body||!clinic?.id)return;
 body.replaceChildren();const loading=document.createElement("tr");const loadingCell=document.createElement("td");loadingCell.colSpan=7;loadingCell.textContent="Loading international payment requests…";loading.appendChild(loadingCell);body.appendChild(loading);
 const patientSelect=document.getElementById("internationalPaymentPatient");
 if(patientSelect){
  patientSelect.replaceChildren(new Option("Loading approved patients…",""));
  const links=await supabaseClient.from("healthos_patient_hospital_links").select("patient_user_id").eq("clinic_id",clinic.id).eq("status","verified");
  if(links.error){patientSelect.replaceChildren(new Option("Unable to load approved patients",""));}
  else{
   const ids=[...new Set((links.data||[]).map(x=>x.patient_user_id))];
   patientSelect.replaceChildren(new Option(ids.length?"Choose a connected patient":"No approved patient connections",""));
   if(ids.length){
    const profiles=await supabaseClient.from("healthos_patient_profiles").select("user_id,full_name,phone_e164").in("user_id",ids);
    const byId=new Map((profiles.data||[]).map(x=>[x.user_id,x]));
    ids.forEach(id=>{const p=byId.get(id);patientSelect.add(new Option((p?.full_name||"Patient")+" · "+(p?.phone_e164||id.slice(0,8)),id));});
   }
  }
 }
 const {data,error}=await supabaseClient.rpc("healthos_get_clinic_international_payment_intents",{p_clinic_id:clinic.id});
 if(error){body.replaceChildren();const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=7;cell.textContent="Payment requests are available to hospital owners and administrators only.";row.appendChild(cell);body.appendChild(row);if(message){message.textContent=friendlyError(error);message.className="message error";}return;}
 body.replaceChildren();
 if(!data?.length){const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=7;cell.textContent="No international payment requests have been issued.";row.appendChild(cell);body.appendChild(row);return;}
 data.forEach(item=>{const row=document.createElement("tr");[item.patient_name,item.invoice_reference||"—",item.description,Number(item.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+" "+String(item.currency||"").trim(),String(item.status).replace(/_/g," "),item.provider_key,item.created_at?new Date(item.created_at).toLocaleString():"—"].forEach(value=>{const cell=document.createElement("td");cell.textContent=String(value??"—");row.appendChild(cell);});body.appendChild(row);});
}
document.getElementById("refreshInternationalPayments")?.addEventListener("click",()=>{if(currentClinic)loadInternationalPaymentWorkspace(currentClinic);});

document.getElementById("internationalPaymentCreateForm")?.addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),message=document.getElementById("internationalPaymentCreateMessage");
 if(!currentClinic?.id){return;}
 button.disabled=true;if(message){message.textContent="Creating secure payment request…";message.className="message";}
 try{
  const {data,error}=await supabaseClient.rpc("healthos_create_international_payment_intent",{
   p_clinic_id:currentClinic.id,
   p_patient_user_id:document.getElementById("internationalPaymentPatient").value,
   p_amount:Number(document.getElementById("internationalPaymentAmount").value),
   p_currency:document.getElementById("internationalPaymentCurrency").value,
   p_description:document.getElementById("internationalPaymentDescription").value.trim(),
   p_invoice_reference:document.getElementById("internationalPaymentInvoice").value.trim()||null,
   p_idempotency_key:crypto.randomUUID()
  });
  if(error)throw error;
  if(message){message.textContent=data?.message||"Payment request created.";message.className="message success";}
  form.reset();await loadInternationalPaymentWorkspace(currentClinic);
 }catch(error){if(message){message.textContent=friendlyError(error);message.className="message error";}}
 finally{button.disabled=false;}
});

async function loadPatientGlobalReferrals(){
 const target=document.getElementById("patientGlobalReferrals");if(!target||!currentUser)return;
 target.replaceChildren();const {data,error}=await supabaseClient.rpc("healthos_get_my_global_referrals");if(error)throw error;
 const rows=Array.isArray(data)?data:(data||[]);
 if(!rows.length){target.textContent="You have no specialist referrals.";return;}
 rows.forEach(r=>{
  const card=document.createElement("article");card.className="stat-card";
  const title=document.createElement("h3");title.textContent=(r.source_name||"Hospital")+" → "+(r.destination_name||"Receiving hospital");
  const detail=document.createElement("p");detail.textContent=r.specialty+" · "+r.urgency+" · "+r.reason;
  const status=document.createElement("strong");status.textContent="Status: "+String(r.status).replace(/_/g," ");
  card.append(title,detail,status);
  if(r.status==="awaiting_patient_consent"){
   const consent=document.createElement("button");consent.type="button";consent.className="primary-button";consent.textContent="I consent to this referral";
   consent.addEventListener("click",async()=>{consent.disabled=true;const {error}=await supabaseClient.rpc("healthos_consent_global_referral",{p_referral_id:r.id,p_consent:true});if(error){consent.disabled=false;alert(friendlyError(error));return;}await loadPatientGlobalReferrals();});
   const decline=document.createElement("button");decline.type="button";decline.className="logout-button";decline.textContent="Decline referral";
   decline.addEventListener("click",async()=>{if(!confirm("Decline and cancel this referral?"))return;const {error}=await supabaseClient.rpc("healthos_consent_global_referral",{p_referral_id:r.id,p_consent:false});if(error){alert(friendlyError(error));return;}await loadPatientGlobalReferrals();});
   card.append(consent,decline);
  }
  if(["accepted","awaiting_destination_review"].includes(r.status)){
   const scopeBox=document.createElement("fieldset"),legend=document.createElement("legend");legend.textContent="Choose records to share with this hospital";scopeBox.appendChild(legend);
   [["encounter_summary","Encounter summaries"],["signed_notes","Signed clinical notes"],["vitals","Vital signs"],["allergies","Allergies"]].forEach(([value,label])=>{const l=document.createElement("label"),cb=document.createElement("input");cb.type="checkbox";cb.value=value;l.append(cb,document.createTextNode(" "+label));scopeBox.appendChild(l);});
   const expiry=document.createElement("select");[24,72,168,720].forEach(hours=>expiry.add(new Option(hours===720?"30 days":hours+" hours",String(hours))));expiry.value="72";
   const grant=document.createElement("button");grant.type="button";grant.className="primary-button";grant.textContent="Authorise selected records";
   grant.addEventListener("click",async()=>{const scopes=[...scopeBox.querySelectorAll("input:checked")].map(x=>x.value);if(!scopes.length){alert("Select at least one record category.");return;}grant.disabled=true;const {error}=await supabaseClient.rpc("healthos_patient_consent_referral_records",{p_referral_id:r.id,p_scope_categories:scopes,p_expiry_hours:Number(expiry.value)});grant.disabled=false;if(error){alert(friendlyError(error));return;}alert("Record sharing authorised for the selected categories and expiry period.");});
   const revoke=document.createElement("button");revoke.type="button";revoke.className="logout-button";revoke.textContent="Revoke record access";
   revoke.addEventListener("click",async()=>{if(!confirm("Immediately revoke this referral's record access?"))return;const {error}=await supabaseClient.rpc("healthos_revoke_referral_record_consent",{p_referral_id:r.id});if(error){alert(friendlyError(error));return;}alert("Record access revoked.");});
   card.append(scopeBox,expiry,grant,revoke);
  }
  target.appendChild(card);
 });
}
async function loadGlobalReferralOptions(){
 const appointment=document.getElementById("globalReferralAppointment"),destination=document.getElementById("globalReferralDestination");
 if(!appointment||!destination||!currentClinic)return;
 appointment.replaceChildren(new Option("Loading accepted appointments…",""));
 destination.replaceChildren(new Option("Loading verified hospitals…",""));
 const [{data:requests,error:rError},{data:hospitals,error:hError}]=await Promise.all([
  supabaseClient.from("healthos_patient_appointment_requests").select("id,requested_at,reason,visit_type,linked_patient_record_id").eq("clinic_id",currentClinic.id).eq("status","accepted").not("linked_patient_record_id","is",null).order("requested_at",{ascending:false}).limit(200),
  supabaseClient.from("healthos_hospital_directory").select("clinic_id,public_name,city,country_code").eq("verification_status","verified").eq("accepting_patient_requests",true).neq("clinic_id",currentClinic.id).order("public_name").limit(500)
 ]);
 if(rError)throw rError;if(hError)throw hError;
 appointment.replaceChildren(new Option("Choose accepted appointment",""));
 (requests||[]).forEach(x=>appointment.add(new Option(new Date(x.requested_at).toLocaleString()+" · "+x.visit_type+" · "+(x.reason||"Visit"),x.id)));
 destination.replaceChildren(new Option("Choose receiving hospital",""));
 (hospitals||[]).forEach(x=>destination.add(new Option(x.public_name+" — "+x.city+", "+x.country_code,x.clinic_id)));
}
async function loadGlobalReferralInbox(){
 const body=document.getElementById("globalReferralInboxBody"),message=document.getElementById("globalReferralMessage");if(!body||!currentClinic)return;
 body.replaceChildren();message.textContent="Loading incoming referrals...";
 try{
  const {data,error}=await supabaseClient.rpc("healthos_get_destination_referrals",{p_clinic_id:currentClinic.id});if(error)throw error;
  const rows=Array.isArray(data)?data:(data||[]);
  if(!rows.length){body.innerHTML='<tr><td colspan="7">No patient-consented referrals awaiting review.</td></tr>';message.textContent="No incoming referrals.";return;}
  rows.forEach(r=>{
   const tr=document.createElement("tr");
   [new Date(r.created_at).toLocaleString(),r.patient_name||"Patient",r.source_name||"Hospital",r.specialty,r.reason,r.urgency].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
   const action=document.createElement("td");
   if(r.status==="awaiting_destination_review"){
    const response=document.createElement("input");response.maxLength=500;response.placeholder="Optional response";
    const accept=document.createElement("button");accept.type="button";accept.className="primary-button";accept.textContent="Accept";
    const reject=document.createElement("button");reject.type="button";reject.className="logout-button";reject.textContent="Decline";
    const decide=async decision=>{accept.disabled=true;reject.disabled=true;const {error}=await supabaseClient.rpc("healthos_review_global_referral",{p_referral_id:r.id,p_decision:decision,p_response:response.value.trim()||null});if(error){message.textContent=friendlyError(error);message.className="message error";accept.disabled=false;reject.disabled=false;return;}await loadGlobalReferralInbox();};
    accept.addEventListener("click",()=>decide("accepted"));reject.addEventListener("click",()=>decide("rejected"));action.append(response,accept,reject);
   }else {
    action.textContent=String(r.status).replace(/_/g," ");
    if(r.status==="accepted"){
     const bundleButton=document.createElement("button");bundleButton.type="button";bundleButton.className="primary-button";bundleButton.textContent="Retrieve authorised FHIR records";
     bundleButton.addEventListener("click",async()=>{bundleButton.disabled=true;const {data,error}=await supabaseClient.rpc("healthos_get_referral_fhir_bundle",{p_referral_id:r.id,p_access_reason:"Accepted specialist referral continuity of care"});bundleButton.disabled=false;if(error){message.textContent=friendlyError(error);message.className="message error";return;}const output=document.getElementById("referralFhirBundle");if(output)output.textContent=JSON.stringify(data,null,2);});
     action.appendChild(bundleButton);
    }
   }
   tr.appendChild(action);body.appendChild(tr);
  });
  message.textContent=rows.length+" consented referral(s) loaded.";
 }catch(e){message.textContent=friendlyError(e);message.className="message error";}
}
const globalReferralForm=document.getElementById("globalReferralForm");
globalReferralForm?.addEventListener("submit",async event=>{
 event.preventDefault();const message=document.getElementById("globalReferralMessage"),button=document.getElementById("globalReferralSubmit");
 button.disabled=true;button.textContent="Creating referral...";
 try{
  const {data,error}=await supabaseClient.rpc("healthos_create_global_referral",{
   p_appointment_request_id:document.getElementById("globalReferralAppointment").value,
   p_destination_clinic_id:document.getElementById("globalReferralDestination").value,
   p_specialty:document.getElementById("globalReferralSpecialty").value.trim(),
   p_reason:document.getElementById("globalReferralReason").value.trim(),
   p_urgency:document.getElementById("globalReferralUrgency").value
  });
  if(error)throw error;message.textContent="Referral created. The patient must approve it in their portal before the receiving hospital can review it.";message.className="message success";globalReferralForm.reset();await loadGlobalReferralOptions();
 }catch(e){message.textContent=friendlyError(e);message.className="message error";}
 finally{button.disabled=false;button.textContent="Send referral for patient consent";}
});
document.getElementById("refreshGlobalReferrals")?.addEventListener("click",async()=>{await loadGlobalReferralOptions();await loadGlobalReferralInbox();});


// GLOBAL USSD CARE REQUEST INBOX
(function initUssdCareRequestInbox(){
 const body=document.getElementById("ussdCareRequestBody"),message=document.getElementById("ussdCareRequestMessage");
 const say=(text,error=false)=>{if(message){message.textContent=text;message.className="message"+(error?" error":" success");}};
 async function loadEmergencyResponse(){
  const incidentRows=$("icuEmergencyIncidentRows"),eventRows=$("icuEmergencyResponseRows");
  if(!incidentRows||!eventRows)return;
  const status=$("icuEmergencyMessage"),setStatus=(s,e=false)=>{if(status){status.textContent=s;status.className="message"+(e?" error":" success");}};
  try{
   const clinic=currentClinic.id;
   const [incidentResult,staffResult,assetResult]=await Promise.all([
    supabaseClient.from("icu_emergency_incidents").select("id,patient_id,admission_id,equipment_asset_id,incident_type,severity,description,status,occurred_at,reported_by,assigned_to,created_at").eq("clinic_id",clinic).order("occurred_at",{ascending:false}).limit(200),
    supabaseClient.from("staff_profiles").select("user_id,full_name,department,employment_status").eq("clinic_id",clinic).eq("employment_status","active").limit(500),
    supabaseClient.from("icu_equipment_assets").select("id,asset_tag,equipment_type").eq("clinic_id",clinic).limit(500)
   ]);
   for(const r of [incidentResult,staffResult,assetResult])if(r.error)throw r.error;
   const incidents=incidentResult.data||[],staff=staffResult.data||[],assets=assetResult.data||[];
   const staffMap=new Map(staff.map(s=>[s.user_id,[s.full_name,s.department].filter(Boolean).join(" · ")||"Staff account"]));
   const assetMap=new Map(assets.map(a=>[a.id,a.asset_tag+" · "+a.equipment_type.replaceAll("_"," ")]));
   const patientsForSelect=patients.map(p=>({id:p.id,label:(p.patient_number||"Patient")+" · "+[p.first_name,p.last_name].filter(Boolean).join(" ")}));
   const psel=$("icuEmergencyPatient"),oldPatient=psel.value;psel.replaceChildren(new Option("No patient linked",""));patientsForSelect.forEach(p=>psel.add(new Option(p.label,p.id)));if(patients.some(p=>p.id===oldPatient))psel.value=oldPatient;
   const adm=$("icuEmergencyAdmission"),oldAdm=adm.value;adm.replaceChildren(new Option("No admission linked",""));admissions.forEach(a=>adm.add(new Option((a.admission_number||"ICU admission")+" · "+(patientMap.get(a.patient_id)||"Patient"),a.id)));if(admissions.some(a=>a.id===oldAdm))adm.value=oldAdm;
   const eq=$("icuEmergencyEquipment"),oldEq=eq.value;eq.replaceChildren(new Option("No equipment linked",""));assets.forEach(a=>eq.add(new Option(assetMap.get(a.id),a.id)));if(assets.some(a=>a.id===oldEq))eq.value=oldEq;
   const assignee=$("icuEmergencyAssignedStaff"),oldAssignee=assignee.value;assignee.replaceChildren(new Option("Select staff member for assignment",""));staff.forEach(s=>assignee.add(new Option(staffMap.get(s.user_id),s.user_id)));if(staff.some(s=>s.user_id===oldAssignee))assignee.value=oldAssignee;
   const select=$("icuEmergencyResponseIncident"),oldIncident=select.value;select.replaceChildren(new Option("Select an open incident",""));incidents.filter(i=>!["resolved","closed"].includes(i.status)).forEach(i=>select.add(new Option(i.incident_type.replaceAll("_"," ")+" · "+i.severity+" · "+fmt(i.occurred_at),i.id)));if(incidents.some(i=>i.id===oldIncident&&!["resolved","closed"].includes(i.status)))select.value=oldIncident;
   incidentRows.replaceChildren();
   if(!incidents.length){const tr=incidentRows.insertRow();const td=tr.insertCell();td.colSpan=6;td.textContent="No ICU emergency incidents have been reported.";}
   incidents.forEach(i=>{const tr=incidentRows.insertRow();[
    fmt(i.occurred_at),i.incident_type.replaceAll("_"," ")+" · "+i.severity,
    (patientMap.get(i.patient_id)||"No patient linked")+" / "+(assetMap.get(i.equipment_asset_id)||"No equipment linked"),
    i.status.replaceAll("_"," "),staffMap.get(i.assigned_to)||"Unassigned",i.description
   ].forEach(v=>cell(tr,v));});
   const ids=incidents.map(i=>i.id);let events=[];
   if(ids.length){const r=await supabaseClient.from("icu_emergency_response_events").select("id,incident_id,action_type,action_note,actor_user_id,action_at").eq("clinic_id",clinic).in("incident_id",ids).order("action_at",{ascending:false}).limit(300);if(r.error)throw r.error;events=r.data||[];}
   const incidentMap=new Map(incidents.map(i=>[i.id,i]));
   eventRows.replaceChildren();
   if(!events.length){const tr=eventRows.insertRow();const td=tr.insertCell();td.colSpan=5;td.textContent="No response actions recorded yet.";}
   events.forEach(e=>{const tr=eventRows.insertRow();[fmt(e.action_at),incidentMap.get(e.incident_id)?.incident_type.replaceAll("_"," ")||"Incident",e.action_type.replaceAll("_"," "),e.action_note,staffMap.get(e.actor_user_id)||staffNames.get(e.actor_user_id)||"Authorised staff account"].forEach(v=>cell(tr,v));});
   setStatus("Emergency incidents and response accountability history loaded. No external responder notification is connected.");
  }catch(error){console.warn("ICU emergency response panel unavailable",error);incidentRows.replaceChildren();const tr=incidentRows.insertRow();const td=tr.insertCell();td.colSpan=6;td.textContent="Emergency incident records could not be loaded. Confirm clinical-record read permission with the hospital administrator.";eventRows.replaceChildren();setStatus(error.message||"Emergency response records unavailable.",true);}
 }
 async function load(){
  if(!body||!currentClinic)return;
  body.replaceChildren();say("Loading incoming USSD care requests...");
  const {data,error}=await supabaseClient.rpc("healthos_get_ussd_care_requests",{p_clinic_id:currentClinic.id});
  if(error){say(friendlyError(error),true);return;}
  const rows=Array.isArray(data)?data:(data||[]);
  if(!rows.length){const tr=body.insertRow(),td=tr.insertCell();td.colSpan=9;td.textContent="No USSD care requests received.";say("No incoming requests.");return;}
  rows.forEach(item=>{
   const tr=body.insertRow();
   const add=(value)=>{const td=tr.insertCell();td.textContent=value==null||value===""?"—":String(value);return td;};
   add(new Date(item.created_at).toLocaleString());add(item.phone_number);add(item.care_type);add(item.department_name);add(item.request_reason);add(String(item.status).replaceAll("_"," "));add(item.appointment_at?new Date(item.appointment_at).toLocaleString():"—");add(item.staff_note);
   const td=tr.insertCell(),status=document.createElement("select");
   ["verification_required","identity_verified","accepted","scheduled","rejected","completed","cancelled"].forEach(v=>status.add(new Option(v.replaceAll("_"," "),v)));
   status.value=item.status;
   const appointment=document.createElement("input");appointment.type="datetime-local";appointment.setAttribute("aria-label","Appointment time");
   if(item.appointment_at)appointment.value=new Date(item.appointment_at).toISOString().slice(0,16);
   const note=document.createElement("input");note.maxLength=500;note.placeholder="Staff note";
   const save=document.createElement("button");save.type="button";save.className="logout-button";save.textContent="Save";
   save.addEventListener("click",async()=>{
    if(status.value==="scheduled"&&!appointment.value){say("Choose an appointment date and time before scheduling.",true);return;}
    if(["accepted","scheduled","identity_verified"].includes(status.value)&&!confirm("Confirm that the patient's identity and department eligibility have been checked?"))return;
    save.disabled=true;
    const {error:updateError}=await supabaseClient.rpc("healthos_update_ussd_care_request",{p_request_id:item.id,p_status:status.value,p_appointment_at:appointment.value?new Date(appointment.value).toISOString():null,p_staff_note:note.value.trim()||null});
    save.disabled=false;
    if(updateError){say(friendlyError(updateError),true);return;}
    say("USSD care request updated.");await load();
   });
   td.append(status,appointment,note,save);
  });
  say(rows.length+" incoming USSD care request(s) loaded. Only your authorised clinic/department scope is returned.");
 }
 document.getElementById("refreshUssdCareRequests")?.addEventListener("click",load);
 window.loadUssdCareRequests=load;
})();


// PATIENT PRIVATE BACKBLAZE DOCUMENT STORAGE
(function initPatientPrivateFileStorage(){
 const form=document.getElementById("patientFileUploadForm");
 const input=document.getElementById("patientFileInput");
 const list=document.getElementById("patientFileList");
 const message=document.getElementById("patientFileMessage");
 const button=document.getElementById("patientFileUploadButton");
 if(!form||!input||!list||!message||!button)return;
 const say=(text,error=false)=>{message.textContent=text;message.className="message"+(error?" error":" success");};
 async function refresh(){
  if(!currentUser)return;
  list.replaceChildren();
  const {data,error}=await supabaseClient.from("healthos_patient_files")
   .select("id,object_key,file_name,content_type,size_bytes,created_at")
   .eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(100);
  if(error){say("Could not load your documents: "+friendlyError(error),true);return;}
  if(!data?.length){list.textContent="No documents uploaded yet.";return;}
  data.forEach(file=>{
   const card=document.createElement("article");card.className="stat-card";
   const title=document.createElement("h3");title.textContent=file.file_name;
   const detail=document.createElement("p");detail.textContent=(file.content_type||"File")+" · "+(Number(file.size_bytes)/1024).toFixed(1)+" KB · "+new Date(file.created_at).toLocaleString();
   const download=document.createElement("button");download.type="button";download.className="primary-button";download.textContent="Download";
   download.addEventListener("click",async()=>{
    download.disabled=true;
    try{
     const {data:link,error:linkError}=await supabaseClient.functions.invoke("healthos-b2-storage",{body:{action:"create-download",objectKey:file.object_key,purpose:"patient_document"}});
     if(linkError)throw linkError;
     if(!link?.downloadUrl)throw new Error("Secure download link was not returned.");
     const a=document.createElement("a");a.href=link.downloadUrl;a.download=file.file_name;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
    }catch(e){say("Download failed: "+friendlyError(e),true);}
    finally{download.disabled=false;}
   });
   card.append(title,detail,download);list.appendChild(card);
  });
 }
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const file=input.files?.[0];if(!file||!currentUser)return;
  button.disabled=true;say("Preparing secure upload…");
  try{
   let objectKey="";
   if(file.size<=25*1024*1024){
    const {data:ticket,error:ticketError}=await supabaseClient.functions.invoke("healthos-b2-storage",{
     body:{action:"create-upload",fileName:file.name,contentType:file.type||"application/octet-stream",sizeBytes:file.size,purpose:"patient_document"}
    });
    if(ticketError)throw ticketError;
    if(!ticket?.uploadUrl||!ticket?.objectKey)throw new Error("Storage upload details were not returned.");
    const uploaded=await fetch(ticket.uploadUrl,{method:"PUT",headers:ticket.requiredHeaders||{"Content-Type":file.type},body:file});
    if(!uploaded.ok)throw new Error("Backblaze upload failed (HTTP "+uploaded.status+").");
    objectKey=ticket.objectKey;
   }else{
    let sessionId=null;
    try{
     const {data:start,error:startError}=await supabaseClient.functions.invoke("healthos-b2-storage",{
      body:{action:"initiate-multipart",fileName:file.name,contentType:file.type||"application/octet-stream",sizeBytes:file.size,purpose:"patient_document"}
     });
     if(startError)throw startError;
     if(!start?.sessionId||!start?.objectKey||!start?.partSizeBytes)throw new Error("Secure multipart session was not returned.");
     sessionId=start.sessionId;objectKey=start.objectKey;
     const partSize=start.partSizeBytes,totalParts=Math.ceil(file.size/partSize),parts=[];
     for(let partNumber=1;partNumber<=totalParts;partNumber++){
      const {data:signed,error:signedError}=await supabaseClient.functions.invoke("healthos-b2-storage",{
       body:{action:"sign-part",sessionId,partNumber,purpose:"patient_document"}
      });
      if(signedError)throw signedError;
      if(!signed?.uploadUrl)throw new Error("Secure upload URL missing for part "+partNumber+".");
      const chunk=file.slice((partNumber-1)*partSize,Math.min(partNumber*partSize,file.size));
      const response=await fetch(signed.uploadUrl,{method:"PUT",body:chunk});
      if(!response.ok)throw new Error("Upload part "+partNumber+" failed (HTTP "+response.status+").");
      const etag=response.headers.get("ETag")||response.headers.get("etag");
      if(!etag)throw new Error("B2 did not expose the ETag for part "+partNumber+". Check bucket CORS exposes ETag.");
      parts.push({PartNumber:partNumber,ETag:etag});
      say("Uploading large document… "+Math.round(partNumber/totalParts*100)+"%");
     }
     const {data:completed,error:completeError}=await supabaseClient.functions.invoke("healthos-b2-storage",{
      body:{action:"complete-multipart",sessionId,parts,purpose:"patient_document"}
     });
     if(completeError)throw completeError;
     if(!completed?.success)throw new Error("Backblaze did not confirm multipart completion.");
    }catch(uploadError){
     if(sessionId){
      await supabaseClient.functions.invoke("healthos-b2-storage",{
       body:{action:"abort-multipart",sessionId,purpose:"patient_document"}
      }).catch(()=>{});
     }
     throw uploadError;
    }
   }
   const {error:recordError}=await supabaseClient.from("healthos_patient_files").insert({
    user_id:currentUser.id,object_key:objectKey,file_name:file.name,
    content_type:file.type||"application/octet-stream",size_bytes:file.size
   });
   if(recordError)throw recordError;
   form.reset();say("Document uploaded securely to your private HealthOS storage.");
   await refresh();
  }catch(e){say("Upload failed: "+friendlyError(e),true);}
  finally{button.disabled=false;}
 });
 window.loadPatientPrivateFiles=refresh;
 const originalLoad=window.loadPatientInternationalPayments;
 // Patient portal load sequence invokes this helper after successful profile load.
 if(currentUser)refresh().catch(e=>say(friendlyError(e),true));
})();

// HEALTHOS AI: CLINICIAN-INITIATED MEDICATION / ALLERGY NAME-MATCH SCREEN
(function initMedicationAllergyNameCheck(){
 const $=id=>document.getElementById(id);
 const button=$("runMedicationAllergyCheck");
 if(!button)return;
 const say=(message,error=false)=>{const el=$("clinicalMedicationAllergyCheckMessage");if(el){el.textContent=message;el.className="message"+(error?" error":"");}};
 const normalize=value=>String(value||"").toLocaleLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
 button.addEventListener("click",async()=>{
  const encounterId=$("clinicalVitalsEncounter")?.value||$("scribeEncounterSelect")?.value;
  const candidate=$("clinicalMedicineCandidate")?.value.trim();
  const result=$("clinicalMedicationAllergyCheckResult");
  if(!currentClinic||!currentUser){say("Sign in to an authorised clinic workspace first.",true);return;}
  if(!encounterId){say("Select the patient's clinical encounter first.",true);return;}
  if(!candidate||candidate.length<2){say("Enter the medicine or active ingredient name.",true);return;}
  button.disabled=true;result.textContent="Checking recorded allergy names…";
  try{
   const {data:encounter,error:encounterError}=await supabaseClient.from("clinical_encounters")
    .select("id,patient_id,clinic_id").eq("id",encounterId).eq("clinic_id",currentClinic.id).maybeSingle();
   if(encounterError)throw encounterError;
   if(!encounter){say("The selected encounter could not be verified in this clinic.",true);result.textContent="No check completed.";return;}
   const {data:allergies,error}=await supabaseClient.from("patient_allergies")
    .select("allergen,reaction,severity,status").eq("clinic_id",currentClinic.id).eq("patient_id",encounter.patient_id).limit(200);
   if(error)throw error;
   const active=(allergies||[]).filter(x=>!x.status||["active","confirmed"].includes(String(x.status).toLowerCase()));
   const medicine=normalize(candidate);
   const matches=active.filter(x=>{
    const allergen=normalize(x.allergen);
    return allergen&&(allergen===medicine||allergen.includes(medicine)||medicine.includes(allergen));
   });
   result.replaceChildren();
   const heading=document.createElement("strong");
   heading.textContent=matches.length?"Potential recorded allergy name match — clinician review required":"No direct text match found in recorded active / confirmed allergy names.";
   result.appendChild(heading);
   const list=document.createElement("ul");
   (matches.length?matches:active).forEach(item=>{
    const li=document.createElement("li");
    li.textContent=[item.allergen,item.reaction?"Reaction: "+item.reaction:"Reaction not recorded",item.severity?"Severity: "+item.severity:"Severity unknown"].join(" — ");
    list.appendChild(li);
   });
   if(active.length)result.appendChild(list);
   const note=document.createElement("p");
   note.textContent=matches.length?"Do not interpret this as a definitive allergy diagnosis. Verify the substance, reaction and clinical history before any prescribing or dispensing.":"A negative text match does not rule out allergy, cross-reactivity or other medicine risks. Verify the complete history and consult an approved clinical reference.";
   result.appendChild(note);
   if(!active.length){const empty=document.createElement("p");empty.textContent="No active / confirmed allergy records were returned. This does not mean the patient has no allergies.";result.appendChild(empty);}
   say("Name-match screen completed against "+active.length+" recorded allergy item(s). This is not a prescribing clearance.");
  }catch(error){result.textContent="The allergy name-match screen could not complete. Verify the allergy record directly.";say("Check unavailable: "+(error.message||"permission or data error"),true);}
  finally{button.disabled=false;}
 });
})();


// HEALTHOS AI — TELEMEDICINE DASHBOARD (STEP 1)
async function loadTelemedicineDashboard(){
 const body=document.getElementById("telemedicineRequestsBody");
 const message=document.getElementById("telemedicineDashboardMessage");
 if(!body||!message)return;
 if(!currentUser||!currentClinic){message.textContent="Sign in to an authorised hospital workspace first.";message.className="message error";return;}
 body.replaceChildren();message.textContent="Loading remote consultation requests...";
 try{
  const {data:rows,error}=await supabaseClient.from("healthos_patient_appointment_requests")
   .select("id,patient_user_id,requested_at,reason,visit_type,status")
   .eq("clinic_id",currentClinic.id).in("visit_type",["audio","video"])
   .order("requested_at",{ascending:false}).limit(300);
  if(error)throw error;
  const requests=rows||[];
  const count=status=>requests.filter(r=>r.status===status).length;
  document.getElementById("telemedicineTotal").textContent=requests.length;
  document.getElementById("telemedicinePending").textContent=count("requested");
  document.getElementById("telemedicineAccepted").textContent=count("accepted");
  document.getElementById("telemedicineCompleted").textContent=count("completed");
  if(!requests.length){
   const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No audio or video consultation requests for this hospital.";tr.appendChild(td);body.appendChild(tr);
   message.textContent="No remote consultation requests found.";message.className="message success";return;
  }
  const userIds=[...new Set(requests.map(r=>r.patient_user_id).filter(Boolean))];
  let names=new Map();
  if(userIds.length){
   const {data:profiles,error:profileError}=await supabaseClient.from("healthos_patient_profiles").select("user_id,full_name").in("user_id",userIds);
   if(profileError)throw profileError;
   names=new Map((profiles||[]).map(p=>[p.user_id,p.full_name||"Patient"]));
  }
  requests.forEach(row=>{
   const tr=document.createElement("tr");
   [new Date(row.requested_at).toLocaleString(),names.get(row.patient_user_id)||"Patient",String(row.visit_type||"").toUpperCase(),row.reason||"—",String(row.status||"unknown").replaceAll("_"," ")].forEach(value=>{const td=document.createElement("td");td.textContent=value;tr.appendChild(td);});
   const action=document.createElement("td");
   if(row.status==="accepted"){
    const prepare=document.createElement("button");prepare.type="button";prepare.className="primary-button";prepare.textContent="Prepare session";
    prepare.addEventListener("click",async()=>{
     prepare.disabled=true;prepare.textContent="Preparing...";
     const {data,error:rpcError}=await supabaseClient.rpc("healthos_create_telemedicine_session",{p_request_id:row.id});
     if(rpcError){message.textContent=friendlyError(rpcError);message.className="message error";prepare.disabled=false;prepare.textContent="Prepare session";return;}
     message.textContent="Session record prepared. A configured approved telemedicine provider is still required before the patient can join.";message.className="message success";
     prepare.textContent=data?.session_status==="awaiting_provider"?"Provider connection pending":"Session prepared";
    });
    action.appendChild(prepare);
   }else if(row.status==="requested"){
    action.textContent="Review in Patient Appointment Requests";
   }else action.textContent="No action required";
   tr.appendChild(action);body.appendChild(tr);
  });
  message.textContent=requests.length+" remote request(s) loaded for the active hospital. Patient names are retrieved only through the hospital's permitted profile access.";
  message.className="message success";
 }catch(error){message.textContent=friendlyError(error);message.className="message error";}
}
document.getElementById("telemedicineRefresh")?.addEventListener("click",loadTelemedicineDashboard);
document.querySelectorAll('.sidebar .nav-item[href="#telemedicineDashboard"]').forEach(link=>link.addEventListener("click",()=>void loadTelemedicineDashboard()));


// ============================================================
// HEALTHOS AI: DEPARTMENTAL KNOWLEDGE REVIEW & PUBLISH WORKSPACE
// ============================================================
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const select=$("departmentKnowledgeSelect");
 const message=$("departmentKnowledgeMessage");
 const title=$("knowledgeArticleTitle");
 const summary=$("knowledgeArticleSummary");
 const content=$("knowledgeArticleContent");
 if(!select||!message||!title||!summary||!content)return;
 let drafts=[];
 let selected=null;
 function say(text,error=false){message.textContent=text;message.className=error?"message error":"message";}
 function clearEditor(){
  selected=null;title.value="";summary.value="";content.value="";
  $("knowledgeDepartmentLabel").textContent="—";
  $("knowledgeTypeLabel").textContent="—";
  $("knowledgeStatusLabel").textContent="—";
 }
 async function loadDrafts(){
  if(!currentUser||!currentClinic||!managementVerified||!supabaseClient){
   say("Verify administrator access to manage departmental knowledge.",true);return;
  }
  say("Loading departmental draft articles...");
  select.replaceChildren(new Option("Loading drafts...",""));
  clearEditor();
  const [{data:articles,error:articleError},{data:departments,error:departmentError}]=await Promise.all([
   supabaseClient.from("department_knowledge_articles").select("id,department_id,article_type,title,summary,content,status,review_status,reviewed_by,version").eq("clinic_id",currentClinic.id).eq("status","draft").order("department_id").order("article_type").limit(500),
   supabaseClient.from("clinic_departments").select("id,department_name").eq("clinic_id",currentClinic.id).eq("is_active",true)
  ]);
  if(articleError||departmentError){
   console.error("Department knowledge review load failed",articleError||departmentError);
   say("Could not load draft knowledge. Confirm administrator permissions and database connectivity.",true);
   select.replaceChildren(new Option("Unable to load drafts",""));return;
  }
  const names=new Map((departments||[]).map(d=>[d.id,d.department_name]));
  drafts=(articles||[]).map(a=>({...a,department_name:names.get(a.department_id)||"Department"}));
  select.replaceChildren(new Option(drafts.length? "Choose a draft article":"No draft articles found",""));
  drafts.forEach(a=>select.add(new Option(a.department_name+" — "+a.article_type.replaceAll("_"," ")+" — "+a.title,a.id)));
  say(drafts.length+" draft articles available across your active departments. Review and edit each article before publishing.");
 }
 function showSelected(){
  selected=drafts.find(a=>a.id===select.value)||null;
  if(!selected){clearEditor();return;}
  title.value=selected.title||"";
  summary.value=selected.summary||"";
  content.value=selected.content||"";
  $("knowledgeDepartmentLabel").textContent=selected.department_name;
  $("knowledgeTypeLabel").textContent=selected.article_type.replaceAll("_"," ");
  $("knowledgeStatusLabel").textContent=(selected.review_status||"not_started")+" · draft";
  say("Review the article carefully. Save keeps it as a draft; publish makes it available to authorised staff in this department.");
 }
 async function saveDraft(publish){
  if(!currentUser||!currentClinic||!managementVerified||!selected){
   say("Select a draft and verify administrator access first.",true);return;
  }
  const cleanTitle=title.value.trim(),cleanSummary=summary.value.trim(),cleanContent=content.value.trim();
  if(cleanTitle.length<3||cleanContent.length<10){
   say("Enter an article title and at least 10 characters of guidance content.",true);return;
  }
  const button=$(publish?"publishDepartmentKnowledgeArticle":"saveDepartmentKnowledgeDraft");
  button.disabled=true;
  const now=new Date().toISOString();
  if(publish&&(selected.review_status!=="approved"||!selected.reviewed_by||selected.reviewed_by===currentUser.id)){
   say("Independent review is required before publication. Ask a different authorised clinic owner to approve this article in the Departmental Knowledge Centre.",true);return;
  }
  const update={
   title:cleanTitle,summary:cleanSummary,content:cleanContent,
   updated_by:currentUser.id,updated_at:now,
   version:(Number(selected.version)||1)+1
  };
  if(!publish){
   update.review_status="pending_review";
   update.reviewed_by=null;
   update.reviewed_at=null;
   update.review_notes=null;
  }else{
   update.status="published";
   update.published_at=now;
  }
  const {error}=await supabaseClient.from("department_knowledge_articles").update(update).eq("id",selected.id).eq("clinic_id",currentClinic.id);
  button.disabled=false;
  if(error){
   console.error("Department knowledge save failed",error);
   say("Could not save this article. Check owner permissions and try again.",true);return;
  }
  say(publish?"Article approved and published. Assigned staff in "+selected.department_name+" can now access it.":"Draft changes saved. The article remains unpublished.");
  await loadDrafts();
 }
 $("refreshDepartmentKnowledge")?.addEventListener("click",loadDrafts);
 select.addEventListener("change",showSelected);
 $("saveDepartmentKnowledgeDraft")?.addEventListener("click",()=>saveDraft(false));
 $("publishDepartmentKnowledgeArticle")?.addEventListener("click",()=>saveDraft(true));
 // Load only after the administrator has completed the existing verification flow.
 const start=()=>{if(currentUser&&currentClinic&&managementVerified)loadDrafts();};
 document.addEventListener("healthos:management-verified",start);
 setTimeout(start,1200);
 console.log("HealthOS departmental knowledge review workspace initialized.");
})();
// END HEALTHOS AI: DEPARTMENTAL KNOWLEDGE REVIEW WORKSPACE


// HEALTHOS AI — DEPARTMENTAL EXPENDITURE & EXPENSE CONTROL
(function initDepartmentExpenseControl(){
 "use strict";
 const $=id=>document.getElementById(id);
 const panel=$("departmentExpenseControlPanel");
 if(!panel)return;
 const message=$("departmentExpenseMessage");
 const requestRows=$("departmentExpenseRows");
 const limitRows=$("departmentSpendingLimitRows");
 const requestForm=$("departmentExpenseRequestForm");
 const limitForm=$("departmentSpendingLimitForm");
 let busy=false;
 const say=(text,error=false)=>{if(message){message.textContent=text;message.className=error?"message error":"message";}};
 const money=(amount,currency)=>{try{return new Intl.NumberFormat("en-NG",{style:"currency",currency:currency||"NGN"}).format(Number(amount)||0);}catch(_){return (currency||"")+" "+amount;}};
 async function load(){
  if(busy)return;busy=true;
  try{
   if(!currentUser||!currentClinic||!supabaseClient){say("Sign in to an authorised hospital workspace first.",true);return;}
   say("Loading expenditure requests and spending limits…");
   const [{data:departments,error:deptError},{data:requests,error:reqError},{data:limits,error:limitError}]=await Promise.all([
    supabaseClient.from("clinic_departments").select("id,department_name").eq("clinic_id",currentClinic.id).eq("is_active",true).order("department_name"),
    supabaseClient.from("department_expense_requests").select("id,department_id,requested_by,category,description,vendor_or_payee,requested_amount,approved_amount,currency,evidence_path,status,reviewed_by,paid_by,created_at").eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(150),
    supabaseClient.from("department_spending_limits").select("id,department_id,category,currency,monthly_limit,effective_from,effective_to").eq("clinic_id",currentClinic.id).order("effective_from",{ascending:false}).limit(150)
   ]);
   if(deptError)throw deptError;if(reqError)throw reqError;if(limitError)throw limitError;
   const deptMap=new Map((departments||[]).map(d=>[d.id,d.department_name]));
   ["expenseDepartment","spendingLimitDepartment"].forEach(id=>{
    const select=$(id);if(!select)return;const prior=select.value;
    select.replaceChildren(new Option("Select department",""));
    (departments||[]).forEach(d=>select.add(new Option(d.department_name,d.id)));
    if(prior)select.value=prior;
   });
   requestRows.replaceChildren();
   if(!requests?.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=7;td.textContent="No expense requests recorded.";tr.appendChild(td);requestRows.appendChild(tr);}
   (requests||[]).forEach(row=>{
    const tr=document.createElement("tr");
    [deptMap.get(row.department_id)||"Department",row.category+(row.vendor_or_payee?" / "+row.vendor_or_payee:""),money(row.requested_amount,row.currency),row.approved_amount==null?"—":money(row.approved_amount,row.currency),row.status,row.requested_by+" / "+(row.reviewed_by||"—")+" / "+(row.paid_by||"—")].forEach(value=>{const td=document.createElement("td");td.textContent=String(value);tr.appendChild(td);});
    const action=document.createElement("td");
    if(row.status==="submitted"){
     const approve=document.createElement("button");approve.type="button";approve.className="primary-button";approve.textContent="Approve";
     approve.addEventListener("click",()=>review(row,"approved"));
     const reject=document.createElement("button");reject.type="button";reject.className="secondary-button";reject.textContent="Reject";
     reject.addEventListener("click",()=>review(row,"rejected"));
     action.append(approve,reject);
    }else if(row.status==="approved"){
     const pay=document.createElement("button");pay.type="button";pay.className="primary-button";pay.textContent="Record payment";
     pay.addEventListener("click",()=>recordPayment(row,pay));action.appendChild(pay);
    }else action.textContent="No action";
    tr.appendChild(action);requestRows.appendChild(tr);
   });
   limitRows.replaceChildren();
   if(!limits?.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="No spending limits recorded.";tr.appendChild(td);limitRows.appendChild(tr);}
   (limits||[]).forEach(row=>{const tr=document.createElement("tr");[deptMap.get(row.department_id)||"Department",row.category,row.currency,money(row.monthly_limit,row.currency),row.effective_from].forEach(value=>{const td=document.createElement("td");td.textContent=String(value);tr.appendChild(td);});limitRows.appendChild(tr);});
   say((requests||[]).length+" request(s) and "+(limits||[]).length+" spending limit(s) loaded. Budget limits are monitoring controls; they do not automatically approve or pay requests.");
  }catch(error){console.error("Department expenditure load failed",error);say("Could not load expenditure controls: "+(error.message||"Check access permissions."),true);}
  finally{busy=false;}
 }
 async function review(row,decision){
  if(!currentUser||currentUser.id===row.requested_by){say("The requester cannot review their own request.",true);return;}
  const note=prompt((decision==="approved"?"Approval":"Rejection")+" note (required):");
  if(!note||!note.trim()){say("A review note is required.",true);return;}
  let approvedAmount=null;
  if(decision==="approved"){
   const raw=prompt("Approved amount (maximum requested: "+row.requested_amount+" "+row.currency+"):",String(row.requested_amount));
   if(raw===null)return;approvedAmount=Number(raw);
   if(!Number.isFinite(approvedAmount)||approvedAmount<=0||approvedAmount>Number(row.requested_amount)){say("Enter a valid positive amount no greater than the requested amount.",true);return;}
  }
  const update={status:decision,reviewed_by:currentUser.id,reviewed_at:new Date().toISOString(),review_notes:note.trim(),approved_amount:approvedAmount};
  const {error}=await supabaseClient.from("department_expense_requests").update(update).eq("id",row.id).eq("clinic_id",currentClinic.id).eq("status","submitted");
  if(error){say("Review failed: "+error.message,true);return;}
  say("Request "+decision+". Payment remains a separate action.");await load();
 }
 async function recordPayment(row,button){
  if(!currentUser||currentUser.id===row.requested_by||currentUser.id===row.reviewed_by){say("Requester and approver cannot record this payment.",true);return;}
  const reference=prompt("Enter bank / payment reference to record the completed payment:");
  if(!reference||!reference.trim()){say("Payment reference is required.",true);return;}
  button.disabled=true;
  const {error}=await supabaseClient.from("department_expense_requests").update({status:"paid",paid_by:currentUser.id,paid_at:new Date().toISOString(),payment_reference:reference.trim()}).eq("id",row.id).eq("clinic_id",currentClinic.id).eq("status","approved");
  button.disabled=false;
  if(error){say("Payment recording failed: "+error.message,true);return;}
  say("Payment recorded against the approved request. This records evidence of payment; it does not initiate a bank transfer.");await load();
 }
 requestForm?.addEventListener("submit",async event=>{
  event.preventDefault();const button=$("submitDepartmentExpense");button.disabled=true;
  try{
   if(!currentUser||!currentClinic)throw new Error("Sign in to an authorised clinic first.");
   const payload={clinic_id:currentClinic.id,department_id:$("expenseDepartment").value,requested_by:currentUser.id,category:$("expenseCategory").value.trim(),description:$("expenseDescription").value.trim(),vendor_or_payee:$("expensePayee").value.trim()||null,requested_amount:Number($("expenseAmount").value),currency:$("expenseCurrency").value,evidence_path:$("expenseEvidence").value.trim()||null};
   if(!payload.department_id||!payload.category||!payload.description||!Number.isFinite(payload.requested_amount)||payload.requested_amount<=0)throw new Error("Complete the department, category, description and valid amount.");
   const {error}=await supabaseClient.from("department_expense_requests").insert(payload);if(error)throw error;
   requestForm.reset();say("Expense request submitted. It is awaiting independent approval.");await load();
  }catch(error){say("Submission failed: "+error.message,true);}finally{button.disabled=false;}
 });
 limitForm?.addEventListener("submit",async event=>{
  event.preventDefault();const button=limitForm.querySelector("button[type=submit]");button.disabled=true;
  try{
   if(!currentUser||!currentClinic)throw new Error("Sign in to an authorised clinic first.");
   const payload={clinic_id:currentClinic.id,department_id:$("spendingLimitDepartment").value,category:$("spendingLimitCategory").value.trim(),currency:$("spendingLimitCurrency").value,monthly_limit:Number($("spendingLimitAmount").value),approved_by:currentUser.id};
   if(!payload.department_id||!payload.category||!Number.isFinite(payload.monthly_limit)||payload.monthly_limit<0)throw new Error("Complete the department, category and valid monthly limit.");
   const {error}=await supabaseClient.from("department_spending_limits").insert(payload);if(error)throw error;
   limitForm.reset();say("Monthly spending limit saved.");await load();
  }catch(error){say("Could not save spending limit: "+error.message,true);}finally{button.disabled=false;}
 });
 $("refreshDepartmentExpenses")?.addEventListener("click",load);
 document.querySelectorAll('.sidebar .nav-item[href="#billingReview"]').forEach(link=>link.addEventListener("click",()=>setTimeout(load,250)));
 document.addEventListener("healthos:clinic-ready",load);
 setTimeout(()=>{if(currentUser&&currentClinic)load();},1800);
 console.log("HealthOS departmental expenditure control workspace initialized.");
})();
// END DEPARTMENTAL EXPENDITURE & EXPENSE CONTROL


// HEALTHOS AI — HOSPITAL-WIDE DEPARTMENT PROCUREMENT WORKSPACE
(function initHealthOSDepartmentProcurement(){
 "use strict";
 const $=id=>document.getElementById(id);
 const panel=$("departmentProcurementWorkspace");
 if(!panel)return;
 const form=$("healthosDepartmentProcurementForm"), rows=$("healthosProcRows"), events=$("healthosProcEvents"), message=$("healthosProcMessage");
 let loading=false;
 const say=(value,isError=false)=>{message.textContent=value;message.className=isError?"message error":"message";};
 const money=(v,c)=>{try{return new Intl.NumberFormat("en-NG",{style:"currency",currency:c||"NGN"}).format(Number(v)||0);}catch(_){return (c||"")+" "+v;}};
 const cell=(tr,value)=>{const td=document.createElement("td");td.textContent=String(value??"—");tr.appendChild(td);return td;};
 async function load(){
  if(loading)return;loading=true;
  try{
   if(!currentUser||!currentClinic||!supabaseClient){say("Sign in to an authorised hospital workspace first.",true);return;}
   const clinicId=currentClinic.id;
   const [d,r,e]=await Promise.all([
    supabaseClient.from("clinic_departments").select("id,department_name").eq("clinic_id",clinicId).eq("is_active",true).order("department_name"),
    supabaseClient.from("healthos_department_procurement_requests").select("id,department_id,request_number,category,purpose,currency,requested_total,status,budget_control_status,requested_by,reviewed_by,created_at").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(150),
    supabaseClient.from("healthos_department_procurement_events").select("id,request_id,event_type,actor_id,details,created_at").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(100)
   ]);
   if(d.error)throw d.error;if(r.error)throw r.error;
   const departments=d.data||[], requests=r.data||[], audit=e.error?[]:(e.data||[]);
   const deptMap=new Map(departments.map(x=>[x.id,x.department_name]));
   const select=$("healthosProcDepartment"), previous=select.value;
   select.replaceChildren(new Option("Select department",""));
   departments.forEach(x=>select.add(new Option(x.department_name,x.id)));
   if(previous)select.value=previous;
   rows.replaceChildren();
   if(!requests.length){const tr=document.createElement("tr");cell(tr,"No procurement requests recorded.").colSpan=8;rows.appendChild(tr);}
   requests.forEach(request=>{
    const tr=document.createElement("tr");
    cell(tr,request.request_number);cell(tr,deptMap.get(request.department_id)||"Department");
    cell(tr,request.category+" — "+request.purpose);cell(tr,money(request.requested_total,request.currency));
    cell(tr,request.budget_control_status);cell(tr,request.status);
    cell(tr,request.requested_by+" / "+(request.reviewed_by||"—"));
    const action=cell(tr,"");
    if(request.status==="submitted"){
     const approve=document.createElement("button");approve.type="button";approve.className="primary-button";approve.textContent="Approve";
     approve.addEventListener("click",()=>review(request,"approved"));
     const reject=document.createElement("button");reject.type="button";reject.className="secondary-button";reject.textContent="Reject";
     reject.addEventListener("click",()=>review(request,"rejected"));action.append(approve,reject);
    }else action.textContent="No action";
    rows.appendChild(tr);
   });
   events.replaceChildren();
   if(!audit.length){const tr=document.createElement("tr");cell(tr,e.error?"Audit history is not available to this account.":"No audit events recorded.").colSpan=5;events.appendChild(tr);}
   audit.forEach(event=>{const tr=document.createElement("tr");cell(tr,new Date(event.created_at).toLocaleString("en-NG"));cell(tr,requests.find(x=>x.id===event.request_id)?.request_number||event.request_id);cell(tr,event.event_type);cell(tr,event.actor_id);cell(tr,JSON.stringify(event.details||{}));events.appendChild(tr);});
   say(requests.length+" procurement request(s), "+audit.length+" audit event(s) loaded. Budget flags are controls for review, not proof of misuse.");
  }catch(error){console.error("Department procurement workspace load failed",error);say("Could not load procurement workspace: "+(error.message||"Check access permissions."),true);}
  finally{loading=false;}
 }
 async function review(request,decision){
  if(!currentUser||currentUser.id===request.requested_by){say("The requester cannot approve or reject their own request.",true);return;}
  const note=prompt((decision==="approved"?"Approval":"Rejection")+" note (required):");
  if(!note||!note.trim())return;
  try{
   const {error}=await supabaseClient.rpc("healthos_review_department_procurement_request",{p_clinic_id:currentClinic.id,p_request_id:request.id,p_decision:decision,p_review_notes:note.trim()});
   if(error)throw error;say("Request "+decision+". Any purchase order must be created through the controlled procurement process.");await load();
  }catch(error){say("Review failed: "+error.message,true);}
 }
 form?.addEventListener("submit",async event=>{
  event.preventDefault();const button=$("healthosProcSubmit");button.disabled=true;
  try{
   if(!currentUser||!currentClinic)throw new Error("Sign in to an authorised clinic first.");
   let items;try{items=JSON.parse($("healthosProcItems").value);}catch(_){throw new Error("Item lines must be valid JSON.");}
   if(!Array.isArray(items)||!items.length)throw new Error("Enter at least one item line.");
   const payload={p_clinic_id:currentClinic.id,p_department_id:$("healthosProcDepartment").value,p_request_number:$("healthosProcRequestNumber").value.trim(),p_category:$("healthosProcCategory").value.trim(),p_purpose:$("healthosProcPurpose").value.trim(),p_currency:$("healthosProcCurrency").value,p_items:items};
   if(!payload.p_department_id||!payload.p_request_number||!payload.p_category||!payload.p_purpose)throw new Error("Complete all required request fields.");
   const {data,error}=await supabaseClient.rpc("healthos_create_department_procurement_request",payload);
   if(error)throw error;form.reset();say("Department procurement request submitted. Request ID: "+data);await load();
  }catch(error){say("Submission failed: "+(error.message||"Unknown error"),true);}
  finally{button.disabled=false;}
 });
 $("healthosProcRefresh")?.addEventListener("click",load);
 document.querySelectorAll('.sidebar .nav-item[href="#billingReview"]').forEach(link=>link.addEventListener("click",()=>setTimeout(load,350)));
 document.addEventListener("healthos:clinic-ready",load);
 document.addEventListener("healthos:management-verified",load);
 setTimeout(()=>{if(currentUser&&currentClinic)load();},2200);
 console.log("HealthOS hospital-wide department procurement workspace initialized.");
})();
// END HOSPITAL-WIDE DEPARTMENT PROCUREMENT WORKSPACE

(function initHealthOSDepartmentSourcing(){
 "use strict";
 const $=id=>document.getElementById(id), panel=$("departmentSourcingWorkspace");if(!panel)return;
 const say=(v,bad=false)=>{const n=$("healthosSourcingMessage");n.textContent=v;n.className=bad?"message error":"message";};
 const cell=(tr,v)=>{const td=document.createElement("td");td.textContent=String(v??"—");tr.appendChild(td);return td;};
 const money=(v,c)=>{try{return new Intl.NumberFormat("en-NG",{style:"currency",currency:c||"NGN"}).format(Number(v)||0);}catch(_){return (c||"")+" "+v;}};
 let busy=false,requests=[],rfqs=[],suppliers=[];
 async function load(){
  if(busy)return;busy=true;
  try{
   if(!currentClinic||!currentUser||!supabaseClient){say("Sign in to an authorised clinic workspace first.",true);return;}
   const cid=currentClinic.id;
   const [rq,rf,sp,qt,po,ev,depts]=await Promise.all([
    supabaseClient.from("healthos_department_procurement_requests").select("id,request_number,department_id,requested_total,currency,status,requested_by").eq("clinic_id",cid).order("created_at",{ascending:false}).limit(150),
    supabaseClient.from("healthos_department_quote_requests").select("id,procurement_request_id,quote_request_number,status").eq("clinic_id",cid).order("created_at",{ascending:false}).limit(100),
    supabaseClient.from("pharmacy_suppliers").select("id,supplier_name").eq("clinic_id",cid).eq("is_active",true).eq("verification_status","verified").order("supplier_name"),
    supabaseClient.from("healthos_department_supplier_quotes").select("id,quote_request_id,supplier_id,quote_reference,currency,status,submitted_by,valid_until").eq("clinic_id",cid).order("submitted_at",{ascending:false}).limit(150),
    supabaseClient.from("healthos_department_purchase_orders").select("id,po_number,department_id,supplier_id,procurement_request_id,subtotal,currency,status,approved_by").eq("clinic_id",cid).order("created_at",{ascending:false}).limit(100),
    supabaseClient.from("healthos_department_sourcing_events").select("id,procurement_request_id,event_type,actor_id,details,created_at").eq("clinic_id",cid).order("created_at",{ascending:false}).limit(150),
    supabaseClient.from("clinic_departments").select("id,department_name").eq("clinic_id",cid)
   ]);
   for(const x of [rq,rf,sp,qt,po,depts])if(x.error)throw x.error;
   requests=rq.data||[];rfqs=rf.data||[];suppliers=sp.data||[];
   const reqSel=$("healthosSourceRequest"),oldReq=reqSel.value;reqSel.replaceChildren(new Option("Select approved request",""));
   requests.filter(r=>r.status==="approved"&&!rfqs.some(f=>f.procurement_request_id===r.id)).forEach(x=>reqSel.add(new Option(x.request_number+" — "+money(x.requested_total,x.currency),x.id)));if(oldReq)reqSel.value=oldReq;
   const rfSel=$("healthosQuoteRequestSelect"),oldRf=rfSel.value;rfSel.replaceChildren(new Option("Select open RFQ",""));rfqs.filter(x=>x.status==="open").forEach(x=>rfSel.add(new Option(x.quote_request_number,x.id)));if(oldRf)rfSel.value=oldRf;
   const spSel=$("healthosQuoteSupplier"),oldSp=spSel.value;spSel.replaceChildren(new Option("Select verified supplier",""));suppliers.forEach(x=>spSel.add(new Option(x.supplier_name,x.id)));if(oldSp)spSel.value=oldSp;
   const quoteItems=await supabaseClient.from("healthos_department_supplier_quote_items").select("quote_id,line_total").eq("clinic_id",cid);if(quoteItems.error)throw quoteItems.error;
   const totals=new Map();(quoteItems.data||[]).forEach(x=>totals.set(x.quote_id,(totals.get(x.quote_id)||0)+Number(x.line_total||0)));
   const supplierMap=new Map(suppliers.map(x=>[x.id,x.supplier_name])),rfqMap=new Map(rfqs.map(x=>[x.id,x.quote_request_number]));
   const quoteRows=$("healthosSupplierQuoteRows");quoteRows.replaceChildren();const quoteList=qt.data||[];
   if(!quoteList.length){const tr=document.createElement("tr");cell(tr,"No supplier quotes submitted yet.").colSpan=6;quoteRows.appendChild(tr);}
   quoteList.forEach(q=>{const tr=document.createElement("tr");cell(tr,rfqMap.get(q.quote_request_id)||q.quote_request_id);cell(tr,supplierMap.get(q.supplier_id)||q.supplier_id);cell(tr,q.quote_reference);cell(tr,money(totals.get(q.id)||0,q.currency));cell(tr,"Run comparison");const action=cell(tr,"");
    const cmp=document.createElement("button");cmp.type="button";cmp.className="secondary-button";cmp.textContent="Compare RFQ";cmp.addEventListener("click",()=>compare(q.quote_request_id));action.appendChild(cmp);
    if(q.status==="submitted"){const award=document.createElement("button");award.type="button";award.className="primary-button";award.textContent="Award & create PO";award.addEventListener("click",()=>awardQuote(q));action.appendChild(award);}else action.append(q.status);quoteRows.appendChild(tr);});
   const deptMap=new Map((depts.data||[]).map(x=>[x.id,x.department_name])),poRows=$("healthosDepartmentPoRows");poRows.replaceChildren();
   if(!(po.data||[]).length){const tr=document.createElement("tr");cell(tr,"No department purchase orders created.").colSpan=7;poRows.appendChild(tr);}
   (po.data||[]).forEach(p=>{const tr=document.createElement("tr");cell(tr,p.po_number);cell(tr,deptMap.get(p.department_id)||p.department_id);cell(tr,supplierMap.get(p.supplier_id)||p.supplier_id);cell(tr,requests.find(r=>r.id===p.procurement_request_id)?.request_number||p.procurement_request_id);cell(tr,money(p.subtotal,p.currency));cell(tr,p.status);cell(tr,p.approved_by);poRows.appendChild(tr);});
   const evRows=$("healthosSourcingEvents");evRows.replaceChildren();if(!(ev.data||[]).length){const tr=document.createElement("tr");cell(tr,"No sourcing events recorded.").colSpan=5;evRows.appendChild(tr);}
   (ev.data||[]).forEach(e=>{const tr=document.createElement("tr");cell(tr,new Date(e.created_at).toLocaleString("en-NG"));cell(tr,e.event_type);cell(tr,requests.find(r=>r.id===e.procurement_request_id)?.request_number||e.procurement_request_id);cell(tr,e.actor_id);cell(tr,JSON.stringify(e.details||{}));evRows.appendChild(tr);});
   say(requests.length+" approved request(s), "+rfqs.length+" RFQ(s), "+quoteList.length+" quote(s), "+(po.data||[]).length+" purchase order(s) loaded.");
  }catch(e){console.error("Department sourcing load failed",e);say("Could not load sourcing: "+(e.message||"Check permissions."),true);}finally{busy=false;}
 }
 async function compare(id){
  try{const {data,error}=await supabaseClient.rpc("healthos_compare_department_supplier_quotes",{p_clinic_id:currentClinic.id,p_quote_request_id:id});if(error)throw error;
   const flags=(data?.quotes||[]).flatMap(q=>(q.price_flags||[]).map(f=>q.quote_reference+": "+f.item+" — "+f.flag));
   const dup=(data?.duplicate_invoice_references||[]).map(x=>x.invoice_reference);
   say("Comparison: "+(data?.quote_count||0)+" quotes. Price flags: "+(flags.join("; ")||"none")+". Duplicate invoice refs: "+(dup.join(", ")||"none")+". Flags are indicators, not proof of fraud.",dup.length>0);
  }catch(e){say("Comparison failed: "+e.message,true);}
 }
 async function awardQuote(q){
  if(!currentUser||currentUser.id===q.submitted_by){say("The quote submitter cannot approve the award.",true);return;}
  const po=prompt("Enter a unique purchase order number:");if(!po||!po.trim())return;
  const note=prompt("Enter human award justification / evaluation note:");if(!note||!note.trim())return;
  if(!confirm("Confirm award to this supplier and create an approved department purchase order? This action is audited."))return;
  try{const {data,error}=await supabaseClient.rpc("healthos_award_department_supplier_quote",{p_clinic_id:currentClinic.id,p_quote_id:q.id,p_po_number:po.trim(),p_award_notes:note.trim()});if(error)throw error;say("Award recorded and purchase order created: "+data);await load();}
  catch(e){say("Award failed: "+e.message,true);}
 }
 $("healthosOpenQuoteForm")?.addEventListener("submit",async e=>{e.preventDefault();const b=$("healthosOpenQuoteButton");b.disabled=true;try{const {data,error}=await supabaseClient.rpc("healthos_open_department_quote_request",{p_clinic_id:currentClinic.id,p_procurement_request_id:$("healthosSourceRequest").value,p_quote_request_number:$("healthosQuoteRequestNumber").value.trim(),p_required_by:$("healthosQuoteRequiredBy").value||null});if(error)throw error;say("Quotation request opened: "+data);e.target.reset();await load();}catch(x){say("Could not open quotation request: "+x.message,true);}finally{b.disabled=false;}});
 $("healthosSupplierQuoteForm")?.addEventListener("submit",async e=>{e.preventDefault();const b=$("healthosSubmitSupplierQuote");b.disabled=true;try{let items;try{items=JSON.parse($("healthosSupplierQuoteItems").value);}catch(_){throw new Error("Quote lines must be valid JSON.");}const rfq=rfqs.find(x=>x.id===$("healthosQuoteRequestSelect").value);const req=requests.find(x=>x.id===rfq?.procurement_request_id);if(!req)throw new Error("Approved request context is unavailable; refresh and retry.");const {data,error}=await supabaseClient.rpc("healthos_submit_department_supplier_quote",{p_clinic_id:currentClinic.id,p_quote_request_id:rfq.id,p_supplier_id:$("healthosQuoteSupplier").value,p_quote_reference:$("healthosSupplierQuoteReference").value.trim(),p_supplier_invoice_reference:$("healthosSupplierInvoiceReference").value.trim()||null,p_currency:req.currency,p_valid_until:$("healthosSupplierQuoteValidUntil").value||null,p_items:items});if(error)throw error;say("Supplier quotation recorded: "+data);e.target.reset();await load();}catch(x){say("Quote submission failed: "+x.message,true);}finally{b.disabled=false;}});
 $("healthosSourcingRefresh")?.addEventListener("click",load);
 document.querySelectorAll('.sidebar .nav-item[href="#billingReview"]').forEach(a=>a.addEventListener("click",()=>setTimeout(load,500)));
 document.addEventListener("healthos:clinic-ready",load);document.addEventListener("healthos:management-verified",load);setTimeout(()=>{if(currentUser&&currentClinic)load();},2600);
 console.log("HealthOS department sourcing workspace initialized.");
})();
// END DEPARTMENT SUPPLIER SOURCING & PURCHASE ORDER WORKSPACE



/* HEALTHOS AI: HOSPITAL OWNER REGISTRATION */
(function initialiseHospitalOwnerRegistration() {
    const form = document.getElementById("hospitalOwnerRegistrationForm");
    const message = document.getElementById("hospitalOwnerRegistrationMessage");
    const locationButton = document.getElementById("hospitalUseLocation");
    const navLink = document.getElementById("openHospitalRegistration");
    const panel = document.getElementById("hospitalOwnerRegistration");
    if (!form || !message || !panel) return;

    function showRegistrationMessage(text, isError) {
        message.textContent = text;
        message.className = "message " + (isError ? "error" : "success");
    }

    if (navLink) navLink.addEventListener("click", function(event) {
        event.preventDefault();
        if (!currentUser || !currentClinic || !currentClinic.id) {
            showDashboardMessage("Sign in to your hospital owner workspace before opening registration.", "error");
            return;
        }
        document.querySelectorAll(".main-content > section").forEach(section => {
            if (section.id !== "hospitalOwnerRegistration") section.hidden = true;
        });
        panel.hidden = false;
        panel.scrollIntoView({behavior:"smooth", block:"start"});
    });

    if (locationButton) locationButton.addEventListener("click", function() {
        if (!navigator.geolocation) {
            showRegistrationMessage("Location is unavailable in this browser. Enter coordinates manually.", true);
            return;
        }
        locationButton.disabled = true;
        navigator.geolocation.getCurrentPosition(position => {
            form.elements.latitude.value = position.coords.latitude.toFixed(6);
            form.elements.longitude.value = position.coords.longitude.toFixed(6);
            locationButton.disabled = false;
            showRegistrationMessage("Location captured. Please confirm the hospital address is correct.", false);
        }, () => {
            locationButton.disabled = false;
            showRegistrationMessage("Location permission was not granted. You can enter coordinates manually.", true);
        }, {enableHighAccuracy:true, timeout:15000, maximumAge:60000});
    });

    form.addEventListener("submit", async function(event) {
        event.preventDefault();
        if (!supabaseClient || !currentUser || !currentClinic || !currentClinic.id) {
            showRegistrationMessage("Sign in to the correct hospital owner workspace first.", true);
            return;
        }
        const button = form.querySelector('button[type="submit"]');
        const data = new FormData(form);
        const requiredTypes = ["facility_licence","registration_certificate","owner_identity","proof_of_address"];
        const files = {};
        for (const type of requiredTypes) {
            const file = form.elements[type].files[0];
            if (!file) { showRegistrationMessage("All four verification documents are required.", true); return; }
            if (file.size > 10 * 1024 * 1024) { showRegistrationMessage("Each document must be 10 MB or smaller.", true); return; }
            if (!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type)) {
                showRegistrationMessage("Use PDF, JPG, PNG or WEBP documents only.", true); return;
            }
            files[type] = file;
        }
        const value = name => String(data.get(name) || "").trim();
        const lat = value("latitude"), lng = value("longitude");
        const payload = {
            clinic_id: currentClinic.id,
            submitted_by: currentUser.id,
            official_legal_name: value("official_legal_name"),
            registered_entity_name: value("registered_entity_name") || null,
            hospital_category: value("hospital_category"),
            ownership_type: value("ownership_type"),
            registration_number: value("registration_number"),
            licensing_authority: value("licensing_authority"),
            licence_number: value("licence_number"),
            licence_expiry_date: value("licence_expiry_date") || null,
            country_code: value("country_code").toUpperCase(),
            state: value("state"),
            local_government_area: value("local_government_area"),
            city: value("city"),
            full_address: value("full_address"),
            postal_code: value("postal_code") || null,
            latitude: lat ? Number(lat) : null,
            longitude: lng ? Number(lng) : null,
            official_phone: value("official_phone"),
            official_email: value("official_email"),
            emergency_phone: value("emergency_phone") || null,
            website_url: value("website_url") || null,
            status: "draft"
        };
        if ((payload.latitude === null) !== (payload.longitude === null)) {
            showRegistrationMessage("Enter both latitude and longitude, or leave both blank.", true); return;
        }
        button.disabled = true;
        button.textContent = "Uploading documents...";
        try {
            const {data: application, error: applicationError} = await supabaseClient
                .from("healthos_hospital_registration_applications")
                .insert(payload).select("id").single();
            if (applicationError) throw applicationError;

            for (const type of requiredTypes) {
                const file = files[type];
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
                const objectPath = currentClinic.id + "/" + application.id + "/" + type + "_" + Date.now() + "_" + safeName;
                const {error: uploadError} = await supabaseClient.storage
                    .from("hospital-verification-private")
                    .upload(objectPath, file, {upsert:false, contentType:file.type});
                if (uploadError) throw uploadError;
                const {error: metadataError} = await supabaseClient
                    .from("healthos_hospital_verification_documents")
                    .insert({
                        application_id: application.id,
                        clinic_id: currentClinic.id,
                        document_type: type,
                        storage_path: objectPath,
                        original_file_name: file.name,
                        mime_type: file.type,
                        file_size_bytes: file.size,
                        uploaded_by: currentUser.id
                    });
                if (metadataError) throw metadataError;
            }
            const {data: submitted, error: submitError} = await supabaseClient.rpc(
                "healthos_submit_hospital_registration",
                {p_application_id: application.id}
            );
            if (submitError) throw submitError;
            showRegistrationMessage("Application submitted successfully. Status: SUBMITTED. Your hospital will not appear in public discovery until verification is approved.", false);
            form.reset();
            form.elements.country_code.value = "NG";
        } catch (error) {
            showRegistrationMessage("Registration could not be completed: " + (error.message || "Please contact support."), true);
        } finally {
            button.disabled = false;
            button.textContent = "Submit hospital for verification";
        }
    });
})();



// Nursing workspace: uses existing clinical encounters/vitals permissions and the audited handover register.
(function initNursingWorkspace(){
 const $=id=>document.getElementById(id);
 const setMessage=(t,isError=false)=>{const el=$("nursingWorkspaceMessage");if(el){el.textContent=t;el.className="message"+(isError?" error":" success");}};
 const esc=t=>String(t??"—");
 let encounters=[],staff=[];
 const number=id=>$(id).value===""?null:Number($(id).value);
 async function load(){
  if(!supabaseClient||!currentClinic?.id||!currentUser?.id){setMessage("Sign in to an authorised hospital staff account.",true);return;}
  setMessage("Loading authorised patient encounters, team members and handover records...");
  try{
   const clinicId=currentClinic.id;
   const [e,p,s,h,v,t]=await Promise.all([
    supabaseClient.from("clinical_encounters").select("id,patient_id,encounter_number,encounter_type,status,started_at").eq("clinic_id",clinicId).in("status",["open","in_progress"]).order("started_at",{ascending:false}).limit(250),
    supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id",clinicId).limit(500),
    supabaseClient.from("staff_profiles").select("user_id,full_name,department,professional_role").eq("clinic_id",clinicId).eq("employment_status","active").order("full_name").limit(300),
    supabaseClient.from("nursing_shift_handovers").select("id,shift_code,outgoing_staff_user_id,incoming_staff_user_id,handover_summary,pending_items,recorded_at").eq("clinic_id",clinicId).order("recorded_at",{ascending:false}).limit(50),
    supabaseClient.from("patient_vitals").select("id,recorded_at").eq("clinic_id",clinicId).gte("recorded_at",new Date(new Date().setHours(0,0,0,0)).toISOString()).limit(500),
    supabaseClient.rpc("get_my_staff_tasks",{p_clinic_id:clinicId})
   ]);
   for(const x of [e,p,s,h,v,t])if(x.error)throw x.error;
   encounters=e.data||[];staff=s.data||[];
   const patients=new Map((p.data||[]).map(x=>[x.id,[x.patient_number,x.first_name,x.last_name].filter(Boolean).join(" — ")]));
   const sel=$("nursingEncounterSelect"),old=sel.value;sel.replaceChildren(new Option("Select an open patient encounter",""));
   encounters.forEach(x=>sel.add(new Option((patients.get(x.patient_id)||"Patient")+" · "+(x.encounter_number||"Encounter")+" · "+x.status,x.id)));
   if(encounters.some(x=>x.id===old))sel.value=old;
   const incoming=$("nursingIncomingStaff"),oldStaff=incoming.value;incoming.replaceChildren(new Option("Not specified",""));
   staff.filter(x=>x.user_id!==currentUser.id).forEach(x=>incoming.add(new Option((x.full_name||"Staff member")+(x.department?" — "+x.department:""),x.user_id)));
   if(staff.some(x=>x.user_id===oldStaff))incoming.value=oldStaff;
   $("nursingOpenEncounters").textContent=encounters.length;
   $("nursingVitalsToday").textContent=(v.data||[]).length;
   $("nursingHandoversToday").textContent=(h.data||[]).filter(x=>new Date(x.recorded_at)>=new Date(new Date().setHours(0,0,0,0))).length;
   const body=$("nursingHandoverRows");body.replaceChildren();
   if(!(h.data||[]).length){const r=body.insertRow();const c=r.insertCell();c.colSpan=6;c.textContent="No handover records are available in your authorised scope.";}
   const names=new Map(staff.map(x=>[x.user_id,x.full_name]));
   (h.data||[]).forEach(x=>{const r=body.insertRow();[new Date(x.recorded_at).toLocaleString(),x.shift_code,names.get(x.outgoing_staff_user_id)||"Staff account",names.get(x.incoming_staff_user_id)||"Not specified",x.handover_summary,x.pending_items||"None recorded"].forEach(y=>{const c=r.insertCell();c.textContent=esc(y);});});
   const taskList=$("nursingTasksList");taskList.replaceChildren();
   const tasks=Array.isArray(t.data?.tasks)?t.data.tasks:[];
   if(!tasks.length){const p=document.createElement("p");p.className="muted";p.textContent="No active assigned staff tasks were returned.";taskList.append(p);}
   tasks.forEach(x=>{
    const card=document.createElement("article");card.className="stat-card";
    const title=document.createElement("h4");title.textContent=x.task_title||"Staff task";
    const meta=document.createElement("p");meta.textContent=(x.priority||"normal").toUpperCase()+" · "+String(x.task_status||"").replaceAll("_"," ")+" · "+(x.due_at?new Date(x.due_at).toLocaleString():"No deadline");
    const desc=document.createElement("p");desc.textContent=x.task_description||"No further instructions.";
    const evidenceInfo=document.createElement("p");evidenceInfo.className="muted";evidenceInfo.textContent="Evidence recorded: "+(x.evidence_count||0)+(x.requires_evidence?" · Evidence required before submission":"");
    card.append(title,meta,desc,evidenceInfo);
    const evidenceBox=document.createElement("textarea");evidenceBox.rows=2;evidenceBox.maxLength=5000;evidenceBox.placeholder="Record task evidence, action taken or completion reference";
    const evidenceButton=document.createElement("button");evidenceButton.type="button";evidenceButton.className="secondary-button";evidenceButton.textContent="Save evidence";
    evidenceButton.addEventListener("click",async()=>{
     const note=evidenceBox.value.trim();if(note.length<3){setMessage("Enter at least 3 characters of task evidence.",true);return;}
     evidenceButton.disabled=true;
     const {error}=await supabaseClient.rpc("add_my_staff_task_evidence",{p_clinic_id:currentClinic.id,p_task_id:x.id,p_evidence_type:"note",p_evidence_text:note,p_source_reference:null});
     if(error){setMessage(error.message,true);evidenceButton.disabled=false;return;}
     setMessage("Task evidence saved with your staff identity and timestamp.");await load();
    });
    card.append(evidenceBox,evidenceButton);
    const actions=document.createElement("div");actions.style.display="flex";actions.style.flexWrap="wrap";actions.style.gap="8px";
    const addAction=(status,label)=>{
     const action=document.createElement("button");action.type="button";action.className="secondary-button";action.textContent=label;
     action.addEventListener("click",async()=>{
      let notes=null;if(status==="blocked"){notes=prompt("Explain why this task is blocked:");if(!notes||notes.trim().length<3){setMessage("A reason is required to mark a task blocked.",true);return;}}
      if(status==="submitted"&&!confirm("Submit this task for supervisor review?"))return;
      action.disabled=true;
      const {error}=await supabaseClient.rpc("update_my_staff_task_status",{p_clinic_id:currentClinic.id,p_task_id:x.id,p_new_status:status,p_notes:notes});
      if(error){setMessage(error.message,true);action.disabled=false;return;}
      setMessage("Task status updated. The action and staff identity were recorded.");await load();
     });
     actions.append(action);
    };
    if(x.task_status==="assigned")addAction("accepted","Accept task");
    if(x.task_status==="accepted")addAction("in_progress","Start task");
    if(["accepted","in_progress"].includes(x.task_status))addAction("blocked","Report blocked");
    if(["accepted","in_progress","blocked"].includes(x.task_status))addAction("submitted","Submit for review");
    if(actions.childNodes.length)card.append(actions);
    if(Array.isArray(x.evidence)&&x.evidence.length){
     const evidenceList=document.createElement("details");const summary=document.createElement("summary");summary.textContent="View saved evidence";evidenceList.append(summary);
     x.evidence.forEach(ev=>{const p=document.createElement("p");p.textContent=(ev.evidence_text||ev.source_reference||ev.evidence_type)+" · "+new Date(ev.captured_at||ev.created_at).toLocaleString();evidenceList.append(p);});
     card.append(evidenceList);
    }
    taskList.append(card);
   });
   setMessage("Nursing workspace refreshed. Patient and handover data shown only when the database authorises access.");
  }catch(err){console.error("Nursing workspace load failed",err);setMessage(err.message||"Unable to load nursing workspace. Check your active department assignment and clinical-record permissions.",true);}
 }
 $("nursingRefreshButton")?.addEventListener("click",()=>void load());
 $("nursingVitalsForm")?.addEventListener("submit",async ev=>{
  ev.preventDefault();if(!currentClinic?.id||!currentUser?.id)return;
  const encounter=encounters.find(x=>x.id===$("nursingEncounterSelect").value);
  if(!encounter){setMessage("Select an open patient encounter before recording observations.",true);return;}
  const ids=["nursingTemperature","nursingSystolic","nursingDiastolic","nursingPulse","nursingRespiratory","nursingOxygen","nursingWeight","nursingHeight","nursingPain"];
  if(ids.every(id=>$(id).value==="")){setMessage("Enter at least one observation.",true);return;}
  const button=$("nursingSaveVitals");button.disabled=true;
  const {error}=await supabaseClient.from("patient_vitals").insert({clinic_id:currentClinic.id,encounter_id:encounter.id,patient_id:encounter.patient_id,temperature_c:number("nursingTemperature"),systolic_bp:number("nursingSystolic"),diastolic_bp:number("nursingDiastolic"),pulse_bpm:number("nursingPulse"),respiratory_rate:number("nursingRespiratory"),oxygen_saturation:number("nursingOxygen"),weight_kg:number("nursingWeight"),height_cm:number("nursingHeight"),pain_score:number("nursingPain"),notes:$("nursingObservationNotes").value.trim()||null,recorded_by:currentUser.id});
  button.disabled=false;if(error){setMessage(error.message,true);return;}
  $("nursingVitalsForm").reset();setMessage("Patient observations saved with your staff account and timestamp.");await load();
 });
 $("nursingHandoverForm")?.addEventListener("submit",async ev=>{
  ev.preventDefault();if(!currentClinic?.id||!currentUser?.id)return;
  const summary=$("nursingHandoverSummary").value.trim();if(summary.length<10){setMessage("Enter a handover summary of at least 10 characters.",true);return;}
  const button=$("nursingSaveHandover");button.disabled=true;
  const {error}=await supabaseClient.from("nursing_shift_handovers").insert({clinic_id:currentClinic.id,shift_code:$("nursingShiftCode").value,outgoing_staff_user_id:currentUser.id,incoming_staff_user_id:$("nursingIncomingStaff").value||null,handover_summary:summary,pending_items:$("nursingPendingItems").value.trim()||null,recorded_by:currentUser.id});
  button.disabled=false;if(error){setMessage(error.message,true);return;}
  $("nursingHandoverForm").reset();setMessage("Shift handover recorded with the authenticated outgoing staff account and server timestamp.");await load();
 });
 document.querySelectorAll('.sidebar .nav-item').forEach(link=>link.addEventListener("click",()=>{if((link.getAttribute("href")||"")==="#staffWorkspace")void load();}));
 window.loadHealthOSNursingWorkspace=load;
})();


// ICU workspace: authorised admissions, bed transfers and discharges use audited database RPCs.
(function initICUWorkspace(){
 const $=id=>document.getElementById(id);
 const message=(text,isError=false)=>{const el=$("icuWorkspaceMessage");if(el){el.textContent=text;el.className="message"+(isError?" error":" success");}};
 const put=(id,value)=>{const el=$(id);if(el)el.textContent=String(value??"—");};
 const cell=(row,value)=>{const td=row.insertCell();td.textContent=String(value??"—");return td;};
 const fmt=value=>value?new Date(value).toLocaleString():"—";
 const rpc=async(name,args)=>{const {data,error}=await supabaseClient.rpc(name,args);if(error)throw error;return data;};
 const vitalSummary=v=>[
  v.temperature_c==null?null:"Temp "+v.temperature_c+" °C",
  v.systolic_bp==null&&v.diastolic_bp==null?null:"BP "+(v.systolic_bp??"—")+"/"+(v.diastolic_bp??"—"),
  v.pulse_bpm==null?null:"Pulse "+v.pulse_bpm,
  v.oxygen_saturation==null?null:"SpO₂ "+v.oxygen_saturation+"%"
 ].filter(Boolean).join(" · ")||"No observation recorded";
 let icuBeds=[],patients=[],admissions=[],activeNurseAssignments=[],patientMap=new Map(),bedMap=new Map();
 const isICU=bed=>/\bicu\b|intensive\s*care/i.test([bed.ward_name,bed.bed_type].filter(Boolean).join(" "));
 function populateSelect(id,items,label,emptyLabel,selected){
  const el=$(id);if(!el)return;el.replaceChildren(new Option(emptyLabel,""));
  items.forEach(item=>el.add(new Option(label(item),item.id)));
  if(selected&&items.some(x=>x.id===selected))el.value=selected;
 }
 function updateHandoverNurseOptions(){
  const admissionId=$("icuHandoverAdmission")?.value;
  const assigned=activeNurseAssignments.filter(x=>x.admission_id===admissionId);
  const mine=assigned.filter(x=>x.staff_user_id===currentUser?.id).map(x=>({id:x.nurse_assignment_id,staff_name:x.staff_name,professional_role:x.professional_role}));
  const others=assigned.filter(x=>x.staff_user_id!==currentUser?.id).map(x=>({id:x.nurse_assignment_id,staff_name:x.staff_name,professional_role:x.professional_role}));
  populateSelect("icuHandoverOutgoing",mine,n=>n.staff_name+" · "+n.professional_role,"No active assignment for your account");
  populateSelect("icuHandoverIncoming",others,n=>n.staff_name+" · "+n.professional_role,"Any assigned nurse may accept");
 }

 async function loadMedicationAdministration(){
  const orderSelect=$("icuMedicationOrder"),rows=$("icuMedicationAdministrationRows"),status=$("icuMedicationMessage");
  if(!orderSelect||!rows)return;
  const setStatus=text=>{if(status)status.textContent=text;};
  try{
   const patientIds=[...new Set(admissions.map(a=>a.patient_id))];
   if(!patientIds.length){
    populateSelect("icuMedicationOrder",[],()=>"", "No active ICU medication orders");
    rows.replaceChildren();const tr=rows.insertRow();const td=tr.insertCell();td.colSpan=8;td.textContent="No active ICU admissions to match medication orders.";
    setStatus("No active ICU admissions.");
    return;
   }
   const {data:orders,error:orderError}=await supabaseClient.from("medication_orders")
    .select("id,patient_id,medicine_name,dose_value,dose_unit,route,frequency,instructions,status,prescribed_at")
    .eq("clinic_id",currentClinic.id).in("patient_id",patientIds).eq("status","active")
    .order("prescribed_at",{ascending:false}).limit(300);
   if(orderError)throw orderError;
   const activeOrders=orders||[];
   const previous=orderSelect.value;
   populateSelect("icuMedicationOrder",activeOrders,o=>(patientMap.get(o.patient_id)||"Patient")+" · "+o.medicine_name+" · "+o.dose_value+" "+o.dose_unit+" · "+o.route+" · "+o.frequency,"No active ICU medication orders",previous);
   const orderIds=activeOrders.map(o=>o.id);
   let records=[];
   if(orderIds.length){
    const {data,error}=await supabaseClient.from("medication_administration_records")
     .select("id,medication_order_id,scheduled_for,administration_status,administered_dose,administered_unit,administered_route,reason,recorded_by,recorded_at")
     .eq("clinic_id",currentClinic.id).in("medication_order_id",orderIds)
     .order("scheduled_for",{ascending:false}).limit(100);
    if(error)throw error;records=data||[];
   }
   const orderMap=new Map(activeOrders.map(o=>[o.id,o]));
   rows.replaceChildren();
   if(!records.length){const tr=rows.insertRow();const td=tr.insertCell();td.colSpan=8;td.textContent="No administration outcomes recorded for active ICU medication orders.";}
   records.forEach(record=>{
    const order=orderMap.get(record.medication_order_id),tr=rows.insertRow();
    [
     fmt(record.scheduled_for),patientMap.get(order?.patient_id)||"Patient",
     order?.medicine_name||"Medication order",
     order?(order.dose_value+" "+order.dose_unit+" · "+order.route):"—",
     record.administration_status,
     record.administration_status==="administered"?(record.administered_dose+" "+record.administered_unit+" · "+record.administered_route):"—",
     record.reason||"—",fmt(record.recorded_at)
    ].forEach(value=>cell(tr,value));
   });
   setStatus("Medication orders and administration history loaded within your authorised clinical-record access.");
  }catch(error){
   console.warn("ICU medication administration panel could not load",error);
   populateSelect("icuMedicationOrder",[],()=>"", "Medication records unavailable for this account");
   rows.replaceChildren();const tr=rows.insertRow();const td=tr.insertCell();td.colSpan=8;td.textContent="Medication administration records could not be loaded. Confirm clinical-record read permission with the hospital administrator.";
   setStatus(error.message||"Medication records are restricted or temporarily unavailable.");
  }
 }


 async function loadEquipmentRegister(){
  const assetRows=$("icuEquipmentRows"),eventRows=$("icuEquipmentEventRows");
  if(!assetRows||!eventRows)return;
  const {data:assets,error:assetError}=await supabaseClient.from("icu_equipment_assets")
   .select("id,asset_tag,equipment_type,manufacturer,model,serial_number,location_note,asset_status,last_inspected_at,next_inspection_due,next_maintenance_due")
   .eq("clinic_id",currentClinic.id).order("asset_tag",{ascending:true}).limit(500);
  if(assetError)throw assetError;
  const list=assets||[],previous=$("icuEquipmentEventAsset")?.value;
  populateSelect("icuEquipmentEventAsset",list,a=>a.asset_tag+" · "+a.equipment_type.replaceAll("_"," "),"No equipment registered",previous);
  assetRows.replaceChildren();
  if(!list.length){const tr=assetRows.insertRow();const td=tr.insertCell();td.colSpan=8;td.textContent="No ICU equipment assets have been registered.";}
  list.forEach(a=>{
   const tr=assetRows.insertRow();
   [a.asset_tag,a.equipment_type.replaceAll("_"," "),[a.manufacturer,a.model].filter(Boolean).join(" / ")||"—",a.serial_number||"—",a.location_note||"—",a.asset_status.replaceAll("_"," "),a.next_inspection_due||"Not set",a.next_maintenance_due||"Not set"].forEach(v=>cell(tr,v));
  });
  const assetIds=list.map(a=>a.id);
  let events=[];
  if(assetIds.length){
   const {data,error}=await supabaseClient.from("icu_equipment_events")
    .select("id,asset_id,event_type,event_status,event_note,performed_at,recorded_by")
    .eq("clinic_id",currentClinic.id).in("asset_id",assetIds).order("performed_at",{ascending:false}).limit(150);
   if(error)throw error;events=data||[];
  }
  const names=new Map(list.map(a=>[a.id,a.asset_tag]));
  eventRows.replaceChildren();
  if(!events.length){const tr=eventRows.insertRow();const td=tr.insertCell();td.colSpan=6;td.textContent="No equipment activity has been recorded.";}
  events.forEach(e=>{
   const tr=eventRows.insertRow();
   [fmt(e.performed_at),names.get(e.asset_id)||"Equipment",e.event_type.replaceAll("_"," "),e.event_status.replaceAll("_"," "),e.event_note,staffNames.get(e.recorded_by)||"Authorised staff account"].forEach(v=>cell(tr,v));
  });
 }
 async function load(){
  if(!supabaseClient||!currentClinic?.id||!currentUser?.id){message("Sign in to an authorised hospital staff account.",true);return;}
  message("Loading ICU beds, active admissions and authorised observation records...");
  const button=$("icuRefreshButton");if(button)button.disabled=true;
  try{
   const clinicId=currentClinic.id;
   const [bedResult,admissionResult,patientResult,transferResult]=await Promise.all([
    supabaseClient.from("hospital_beds").select("id,bed_number,ward_name,bed_type,status").eq("clinic_id",clinicId).limit(1000),
    supabaseClient.from("patient_admissions").select("id,patient_id,bed_id,admission_number,admission_reason,admitted_at,status").eq("clinic_id",clinicId).eq("status","admitted").order("admitted_at",{ascending:false}).limit(1000),
    supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id",clinicId).limit(1000),
    supabaseClient.from("icu_patient_transfers").select("id,patient_id,from_bed_id,to_bed_id,transfer_reason,transferred_by,transferred_at").eq("clinic_id",clinicId).order("transferred_at",{ascending:false}).limit(100)
   ]);
   for(const result of [bedResult,admissionResult,patientResult,transferResult])if(result.error)throw result.error;
   icuBeds=(bedResult.data||[]).filter(isICU);
   bedMap=new Map(icuBeds.map(b=>[b.id,b]));
   admissions=(admissionResult.data||[]).filter(a=>a.bed_id&&bedMap.has(a.bed_id));
   patients=patientResult.data||[];
   const transfers=transferResult.data||[];
   const [nursingData,encounterResult,scheduleResult,handoverResult,supervisorData]=await Promise.all([
    rpc("healthos_icu_nursing_workspace",{p_clinic_id:clinicId}),
    supabaseClient.from("clinical_encounters").select("id,patient_id,encounter_number,encounter_type,status,created_at").eq("clinic_id",clinicId).in("status",["open","in_progress"]).order("created_at",{ascending:false}).limit(1000),
    supabaseClient.from("icu_observation_schedules").select("id,admission_id,encounter_id,interval_minutes,schedule_reason,next_due_at,status,starts_at,ends_at").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(500),
    supabaseClient.from("nursing_shift_handovers").select("id,admission_id,shift_code,outgoing_staff_user_id,incoming_staff_user_id,outgoing_nurse_assignment_id,incoming_nurse_assignment_id,handover_summary,pending_items,recorded_at,handover_status,accepted_by,accepted_at").eq("clinic_id",clinicId).not("admission_id","is",null).order("recorded_at",{ascending:false}).limit(200),
    rpc("healthos_icu_supervisor_overview",{p_clinic_id:clinicId})
   ]);
   if(encounterResult.error)throw encounterResult.error;
   if(scheduleResult.error)throw scheduleResult.error;
   if(handoverResult.error)throw handoverResult.error;
   const oversight=supervisorData||{};
   const oversightSummary=oversight.summary||{};
   const activeSchedules=scheduleResult.data||[];
   const openEncounters=encounterResult.data||[];

   const eligibleNurses=nursingData?.eligible_nurses||[];
   activeNurseAssignments=nursingData?.active_assignments||[];
   patientMap=new Map(patients.map(p=>[p.id,[p.patient_number,p.first_name,p.last_name].filter(Boolean).join(" · ")||"Patient"]));
   put("icuTotalBeds",icuBeds.length);
   put("icuOccupiedBeds",icuBeds.filter(b=>b.status==="occupied").length);
   put("icuAvailableBeds",icuBeds.filter(b=>b.status==="available").length);
   put("icuActiveAdmissions",admissions.length);
   populateSelect("icuAdmissionPatient",patients,p=>patientMap.get(p.id),"Select patient");
   populateSelect("icuAdmissionBed",icuBeds.filter(b=>b.status==="available"),b=>b.bed_number+" · "+b.ward_name,"Select available ICU bed");
   populateSelect("icuNurseAdmission",admissions,a=>(patientMap.get(a.patient_id)||"Patient")+" · "+(a.admission_number||"Admission"),"Select ICU patient admission");
   populateSelect("icuNurseStaff",eligibleNurses,n=>n.full_name+" · "+(n.professional_role||"Nurse")+" · "+(n.department_name||n.department||"Department"),"Select active nurse");
   populateSelect("icuHandoverAdmission",admissions,a=>(patientMap.get(a.patient_id)||"Patient")+" · "+(a.admission_number||"Admission"),"Select ICU admission");
   updateHandoverNurseOptions();
   const icuAdmissionIds=new Set(admissions.map(x=>x.id));
   const schedulesForActive=activeSchedules.filter(x=>icuAdmissionIds.has(x.admission_id));
   const activeEncounterIds=new Set(admissions.map(x=>x.patient_id));
   populateSelect("icuObservationAdmission",admissions,x=>(patientMap.get(x.patient_id)||"Patient")+" · "+(x.admission_number||"Admission"),"Select ICU admission");
   populateSelect("icuObservationEncounter",openEncounters.filter(x=>activeEncounterIds.has(x.patient_id)),x=>(patientMap.get(x.patient_id)||"Patient")+" · "+(x.encounter_number||x.encounter_type||"Encounter"),"Select open encounter");
   const nowMs=Date.now();
   const dueSchedules=schedulesForActive.filter(x=>x.status==="active"&&new Date(x.next_due_at).getTime()<=nowMs&&(!x.ends_at||new Date(x.ends_at).getTime()>=nowMs));
   populateSelect("icuObservationDueSchedule",dueSchedules,x=>{
    const due=new Date(x.next_due_at);
    return (patientMap.get(admissions.find(ad=>ad.id===x.admission_id)?.patient_id)||"Patient")+" · due "+due.toLocaleString();
   },dueSchedules.length?"Select due observation":"No observations are due yet");
   const scheduleRows=$("icuObservationScheduleRows");
   if(scheduleRows){scheduleRows.replaceChildren();if(!schedulesForActive.length){const tr=scheduleRows.insertRow();const td=tr.insertCell();td.colSpan=5;td.textContent="No observation schedules created."; }
    schedulesForActive.forEach(x=>{const tr=scheduleRows.insertRow();[
     patientMap.get(admissions.find(ad=>ad.id===x.admission_id)?.patient_id)||"Patient",
     x.interval_minutes+" minutes",x.schedule_reason,fmt(x.next_due_at),x.status
    ].forEach(v=>cell(tr,v));});
   }

   const patientIds=[...new Set(admissions.map(a=>a.patient_id))];
   let vitals=[];
   if(patientIds.length){
    const {data,error}=await supabaseClient.from("patient_vitals")
     .select("id,patient_id,temperature_c,systolic_bp,diastolic_bp,pulse_bpm,respiratory_rate,oxygen_saturation,recorded_by,recorded_at")
     .eq("clinic_id",clinicId).in("patient_id",patientIds).order("recorded_at",{ascending:false}).limit(500);
    if(error)throw error;vitals=data||[];
   }
   const latest=new Map();vitals.forEach(v=>{if(!latest.has(v.patient_id))latest.set(v.patient_id,v);});
   const staffIds=[...new Set([...vitals.map(v=>v.recorded_by),...transfers.map(t=>t.transferred_by)].filter(Boolean))];
   let staffNames=new Map();
   if(staffIds.length){
    const staffResult=await supabaseClient.from("staff_profiles").select("user_id,full_name").eq("clinic_id",clinicId).in("user_id",staffIds);
    if(!staffResult.error)staffNames=new Map((staffResult.data||[]).map(s=>[s.user_id,s.full_name]));
   }
   const admissionRows=$("icuAdmissionsRows");admissionRows.replaceChildren();
   if(!admissions.length){const tr=admissionRows.insertRow();const td=tr.insertCell();td.colSpan=7;td.textContent=icuBeds.length?"No active admissions are linked to configured ICU beds.":"No beds labelled ICU or Intensive Care are configured in the bed register.";}
   admissions.forEach(a=>{
    const bed=bedMap.get(a.bed_id),v=latest.get(a.patient_id),tr=admissionRows.insertRow();
    [patientMap.get(a.patient_id)||"Patient record",a.admission_number,bed?.bed_number,bed?.ward_name,fmt(a.admitted_at),v?vitalSummary(v):"No observation recorded"].forEach(value=>cell(tr,value));
    const actionCell=tr.insertCell();
    const transfer=document.createElement("button");transfer.type="button";transfer.className="secondary-button";transfer.textContent="Transfer";
    transfer.addEventListener("click",async()=>{
     const destinations=icuBeds.filter(b=>b.status==="available"&&b.id!==a.bed_id);
     if(!destinations.length){message("No other available ICU bed is currently recorded.",true);return;}
     const options=destinations.map((b,i)=>(i+1)+". "+b.bed_number+" · "+b.ward_name).join("\n");
     const choice=prompt("Choose destination ICU bed by number:\n"+options);
     if(choice===null)return;const idx=Number(choice)-1;
     if(!Number.isInteger(idx)||idx<0||idx>=destinations.length){message("Invalid destination bed selection.",true);return;}
     const note=prompt("Enter the clinical/operational reason for transfer:");
     if(!note||!note.trim()){message("A transfer reason is required.",true);return;}
     await runAction(transfer,()=>rpc("healthos_icu_transfer_patient",{p_clinic_id:clinicId,p_admission_id:a.id,p_new_bed_id:destinations[idx].id,p_transfer_note:note.trim()}),"Patient transferred. Bed and admission changes were recorded in the security audit log.");
    });
    const discharge=document.createElement("button");discharge.type="button";discharge.className="secondary-button";discharge.textContent="Discharge";
    discharge.addEventListener("click",async()=>{
     const note=prompt("Enter the authorised discharge note:");
     if(!note||!note.trim()){message("A discharge note is required.",true);return;}
     if(!confirm("Confirm discharge for "+(patientMap.get(a.patient_id)||"this patient")+"?"))return;
     await runAction(discharge,()=>rpc("healthos_icu_discharge_patient",{p_clinic_id:clinicId,p_admission_id:a.id,p_discharge_note:note.trim()}),"Discharge recorded. The bed was released and the change was added to the security audit log.");
    });
    actionCell.append(transfer,discharge);
   });
   const nurseRows=$("icuNurseAssignmentRows");
   if(nurseRows){
    nurseRows.replaceChildren();
    if(!activeNurseAssignments.length){const tr=nurseRows.insertRow();const td=tr.insertCell();td.colSpan=6;td.textContent="No active ICU nurse assignments recorded.";}
    activeNurseAssignments.forEach(x=>{
     const tr=nurseRows.insertRow();
     [patientMap.get(admissions.find(a=>a.id===x.admission_id)?.patient_id)||"Patient record",x.staff_name,x.professional_role,fmt(x.assigned_at),x.assignment_note].forEach(value=>cell(tr,value));
     const td=tr.insertCell();const end=document.createElement("button");end.type="button";end.className="secondary-button";end.textContent="End assignment";
     end.addEventListener("click",async()=>{
      const note=prompt("Reason for ending this nurse assignment:");
      if(!note||note.trim().length<5){message("A reason of at least 5 characters is required.",true);return;}
      if(!confirm("End this ICU nurse assignment?"))return;
      await runAction(end,()=>rpc("healthos_icu_end_nurse_assignment",{p_clinic_id:clinicId,p_assignment_id:x.id,p_note:note.trim()}),"Nurse assignment ended and audited.");
     });td.append(end);
    });
   }
   const handoverRows=$("icuHandoverRows");
   if(handoverRows){
    handoverRows.replaceChildren();
    const userNames=new Map((eligibleNurses||[]).map(n=>[n.staff_user_id,n.full_name]));
    const allHandovers=handoverResult.data||[];
    if(!allHandovers.length){const tr=handoverRows.insertRow();const td=tr.insertCell();td.colSpan=9;td.textContent="No patient-specific ICU handovers have been recorded.";} 
    allHandovers.forEach(h=>{
     const tr=handoverRows.insertRow();
     [fmt(h.recorded_at),(patientMap.get(admissions.find(a=>a.id===h.admission_id)?.patient_id)||"Patient")+" · "+(admissions.find(a=>a.id===h.admission_id)?.admission_number||"Admission"),h.shift_code,userNames.get(h.outgoing_staff_user_id)||"Outgoing nurse",userNames.get(h.incoming_staff_user_id)||"Any assigned nurse",h.handover_summary,h.pending_items||"None recorded",h.handover_status==="accepted"?"Accepted · "+fmt(h.accepted_at):"Awaiting acceptance"].forEach(value=>cell(tr,value));
     const action=tr.insertCell();
     const canAccept=h.handover_status==="pending"&&activeNurseAssignments.some(x=>x.admission_id===h.admission_id&&x.staff_user_id===currentUser.id&&(!h.incoming_nurse_assignment_id||x.nurse_assignment_id===h.incoming_nurse_assignment_id));
     if(canAccept){const accept=document.createElement("button");accept.type="button";accept.className="secondary-button";accept.textContent="Accept handover";accept.addEventListener("click",async()=>{if(!confirm("Accept clinical handover responsibility for this ICU admission?"))return;await runAction(accept,()=>rpc("healthos_icu_accept_shift_handover",{p_clinic_id:clinicId,p_handover_id:h.id}),"ICU handover accepted. Acceptance identity and timestamp were audited.");});action.append(accept);}else action.textContent=h.handover_status==="accepted"?"Accepted":"—";
    });
   }
   put("icuEscalationObservations",oversightSummary.overdue_observations??0);
   put("icuEscalationHandovers",oversightSummary.unaccepted_handovers??0);
   put("icuEscalationTasks",oversightSummary.overdue_tasks??0);
   put("icuEscalationOpen",oversightSummary.open_escalations??0);
   put("icuOutstandingTaskCount",oversightSummary.outstanding_tasks??0);
   const escalationRows=$("icuEscalationRows");
   if(escalationRows){
    escalationRows.replaceChildren();
    const escalations=Array.isArray(oversight.escalations)?oversight.escalations:[];
    if(!escalations.length){const tr=escalationRows.insertRow();const td=tr.insertCell();td.colSpan=5;td.textContent="No active ICU escalations were detected at this refresh.";}
    escalations.forEach(item=>{
     const tr=escalationRows.insertRow();
     cell(tr,fmt(item.first_detected_at));cell(tr,item.detail||item.source_type);cell(tr,item.severity);cell(tr,item.status);
     const actionCell=tr.insertCell();
     if(item.status==="open"){
      const acknowledge=document.createElement("button");acknowledge.type="button";acknowledge.className="secondary-button";acknowledge.textContent="Acknowledge";
      acknowledge.addEventListener("click",async()=>{await runAction(acknowledge,()=>rpc("healthos_icu_update_supervisor_escalation",{p_clinic_id:clinicId,p_escalation_id:item.id,p_action:"acknowledge",p_note:null}),"Escalation acknowledged by the authorised supervisor.");});
      actionCell.append(acknowledge);
     }
     if(item.status!=="resolved"){
      const resolve=document.createElement("button");resolve.type="button";resolve.className="secondary-button";resolve.textContent="Resolve";
      resolve.addEventListener("click",async()=>{
       const note=prompt("Record the corrective action and outcome (at least 5 characters):");
       if(!note||note.trim().length<5){message("A resolution note of at least 5 characters is required.",true);return;}
       if(!confirm("Confirm that this escalation has been addressed?"))return;
       await runAction(resolve,()=>rpc("healthos_icu_update_supervisor_escalation",{p_clinic_id:clinicId,p_escalation_id:item.id,p_action:"resolve",p_note:note.trim()}),"Escalation resolution recorded with supervisor identity and reason.");
      });
      actionCell.append(resolve);
     }
    });
   }
   const outstandingRows=$("icuOutstandingTaskRows");
   if(outstandingRows){
    outstandingRows.replaceChildren();
    const outstanding=Array.isArray(oversight.outstanding_tasks)?oversight.outstanding_tasks:[];
    if(!outstanding.length){const tr=outstandingRows.insertRow();const td=tr.insertCell();td.colSpan=6;td.textContent="No outstanding tasks are currently linked to active ICU nurse responsibilities.";}
    outstanding.forEach(task=>{
     const tr=outstandingRows.insertRow();
     [task.task_title,task.nurse_name,(task.admission_number||"Admission")+" · "+(task.bed_number||"Bed"),task.priority,String(task.task_status||"").replaceAll("_"," "),fmt(task.due_at)].forEach(value=>cell(tr,value));
    });
   }
   const vitalsRows=$("icuVitalsRows");vitalsRows.replaceChildren();
   if(!vitals.length){const tr=vitalsRows.insertRow();const td=tr.insertCell();td.colSpan=8;td.textContent="No observations are available for current ICU admissions in the authorised clinical-record scope.";}
   vitals.slice(0,100).forEach(v=>{
    const tr=vitalsRows.insertRow();
    [fmt(v.recorded_at),patientMap.get(v.patient_id)||"Patient record",v.temperature_c==null?"—":v.temperature_c+" °C",
     v.systolic_bp==null&&v.diastolic_bp==null?"—":(v.systolic_bp??"—")+"/"+(v.diastolic_bp??"—"),
     v.pulse_bpm==null?"—":v.pulse_bpm,v.respiratory_rate==null?"—":v.respiratory_rate,
     v.oxygen_saturation==null?"—":v.oxygen_saturation+"%",staffNames.get(v.recorded_by)||"Authorised staff account"].forEach(value=>cell(tr,value));
   });
   const transferRows=$("icuTransferRows");if(transferRows){transferRows.replaceChildren();if(!transfers.length){const tr=transferRows.insertRow();const td=tr.insertCell();td.colSpan=6;td.textContent="No ICU transfers have been recorded.";}transfers.forEach(t=>{const tr=transferRows.insertRow();const from=bedResult.data.find(b=>b.id===t.from_bed_id),to=bedResult.data.find(b=>b.id===t.to_bed_id);[fmt(t.transferred_at),patientMap.get(t.patient_id)||"Patient record",from?.bed_number||"Bed record",to?.bed_number||"Bed record",t.transfer_reason,staffNames.get(t.transferred_by)||"Authorised staff account"].forEach(value=>cell(tr,value));});}
   await loadMedicationAdministration();
   await loadEquipmentRegister();
   await loadEmergencyResponse();
   message("ICU records loaded. Admission, transfer and discharge actions are checked by the database and recorded in the tamper-evident audit log.");
  }catch(error){console.error("ICU workspace load failed",error);message(error.message||"Unable to load ICU records. Check clinic membership and permissions.",true);}
  finally{if(button)button.disabled=false;}
 }
 async function runAction(button,fn,success){
  button.disabled=true;
  try{await fn();message(success);await load();return true;}
  catch(error){message(error.message||"ICU action failed. No successful completion was confirmed.",true);button.disabled=false;return false;}
 }

 $("icuObservationScheduleForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const admissionId=$("icuObservationAdmission")?.value,encounterId=$("icuObservationEncounter")?.value;
  const interval=Number($("icuObservationInterval")?.value),reason=$("icuObservationReason")?.value.trim();
  if(!admissionId||!encounterId||!Number.isInteger(interval)||interval<1||interval>10080||reason.length<5){message("Select an active ICU admission, its open encounter, an authorised interval and a clinical reason.",true);return;}
  const button=$("icuCreateObservationSchedule");
  const ok=await runAction(button,()=>rpc("healthos_icu_create_observation_schedule",{
   p_clinic_id:currentClinic.id,p_admission_id:admissionId,p_encounter_id:encounterId,
   p_interval_minutes:interval,p_schedule_reason:reason,p_starts_at:new Date().toISOString(),p_ends_at:null
  }),"Observation schedule created under the authorised clinical account.");
  if(ok)$("icuObservationScheduleForm").reset();
 });
 $("icuScheduledObservationForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const scheduleId=$("icuObservationDueSchedule")?.value;
  if(!scheduleId){message("Select an observation schedule.",true);return;}
  const number=id=>{const value=$(id)?.value.trim();return value===""?null:Number(value);};
  const values={
   p_clinic_id:currentClinic.id,p_schedule_id:scheduleId,
   p_temperature_c:number("icuObsTemperature"),p_systolic_bp:number("icuObsSystolic"),
   p_diastolic_bp:number("icuObsDiastolic"),p_pulse_bpm:number("icuObsPulse"),
   p_respiratory_rate:number("icuObsRespiratory"),p_oxygen_saturation:number("icuObsOxygen"),
   p_pain_score:number("icuObsPain"),p_notes:$("icuObsNotes")?.value.trim()||null,
   p_completion_note:$("icuObsCompletionNote")?.value.trim()||null,
   p_weight_kg:null,p_height_cm:null
  };
  const button=$("icuSaveScheduledObservation");button.disabled=true;
  try{
   await rpc("healthos_icu_record_scheduled_observation",values);
   $("icuScheduledObservationForm").reset();
   message("Observation recorded in the clinical record. The nurse, completion time and schedule update were audited.");
   await load();
  }catch(error){message(error.message||"Observation was not confirmed. Check nurse assignment, due time and measured values.",true);}
  finally{button.disabled=false;}
 });

 $("icuNurseAssignmentForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const admissionId=$("icuNurseAdmission")?.value,nurseAssignmentId=$("icuNurseStaff")?.value,note=$("icuNurseAssignmentNote")?.value.trim();
  if(!admissionId||!nurseAssignmentId||!note){message("Select an admission, nurse and provide an assignment note.",true);return;}
  const button=$("icuAssignNurseButton");
  const ok=await runAction(button,()=>rpc("healthos_icu_assign_nurse",{p_clinic_id:currentClinic.id,p_admission_id:admissionId,p_nurse_assignment_id:nurseAssignmentId,p_note:note}),"Nurse assigned to ICU patient. The assignment is recorded in the security audit log.");
  if(ok)$("icuNurseAssignmentForm").reset();
 });
 $("icuHandoverAdmission")?.addEventListener("change",updateHandoverNurseOptions);
 $("icuShiftHandoverForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const admissionId=$("icuHandoverAdmission")?.value;
  const outgoing=$("icuHandoverOutgoing")?.value;
  const incoming=$("icuHandoverIncoming")?.value||null;
  const summary=$("icuHandoverSummary")?.value.trim();
  const pending=$("icuHandoverPending")?.value.trim()||null;
  if(!admissionId||!outgoing||!summary||summary.length<10){message("Select your active ICU assignment and enter a patient-specific handover summary.",true);return;}
  const button=$("icuSaveHandoverButton");
  const ok=await runAction(button,()=>rpc("healthos_icu_record_shift_handover",{p_clinic_id:currentClinic.id,p_admission_id:admissionId,p_outgoing_nurse_assignment_id:outgoing,p_incoming_nurse_assignment_id:incoming,p_shift_code:$("icuHandoverShift").value,p_handover_summary:summary,p_pending_items:pending}),"Patient-specific ICU handover recorded. The incoming assigned nurse must accept it to complete the responsibility transfer.");
  if(ok){$("icuShiftHandoverForm").reset();updateHandoverNurseOptions();}
 });
 
 $("icuMedicationStatus")?.addEventListener("change",()=>{
  const administered=$("icuMedicationStatus").value==="administered";
  ["icuMedicationDose","icuMedicationUnit","icuMedicationRoute"].forEach(id=>{const field=$(id);if(field)field.required=administered;});
 });
 $("icuMedicationAdministrationForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const orderId=$("icuMedicationOrder")?.value;
  const scheduledValue=$("icuMedicationScheduledFor")?.value;
  const status=$("icuMedicationStatus")?.value;
  const doseText=$("icuMedicationDose")?.value.trim();
  const unit=$("icuMedicationUnit")?.value.trim();
  const route=$("icuMedicationRoute")?.value.trim();
  const reason=$("icuMedicationReason")?.value.trim()||null;
  if(!orderId||!scheduledValue){message("Select an active ICU medication order and scheduled time.",true);return;}
  const scheduledFor=new Date(scheduledValue);
  if(Number.isNaN(scheduledFor.getTime())||scheduledFor.getTime()>Date.now()+5*60*1000){message("Enter a valid scheduled administration time that is not in the future.",true);return;}
  if(status==="administered"&&(!doseText||Number(doseText)<=0||!unit||!route)){message("For an administered dose, enter the actual dose, unit and route used.",true);return;}
  if(status!=="administered"&&(!reason||reason.length<5)){message("A reason of at least 5 characters is required when a dose is withheld or omitted.",true);return;}
  const button=$("icuMedicationSaveButton");
  const ok=await runAction(button,()=>rpc("healthos_record_medication_administration",{
   p_clinic_id:currentClinic.id,p_medication_order_id:orderId,p_scheduled_for:scheduledFor.toISOString(),
   p_administration_status:status,p_administered_dose:status==="administered"?Number(doseText):null,
   p_administered_unit:status==="administered"?unit:null,p_administered_route:status==="administered"?route:null,
   p_reason:reason
  }),"Medication administration outcome recorded by the authorised nursing workflow.");
  if(ok){$("icuMedicationAdministrationForm").reset();$("icuMedicationScheduledFor").value=new Date().toISOString().slice(0,16);}
 });


 $("icuEquipmentRegisterForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const dateValue=id=>$(id)?.value?new Date($(id).value+"T23:59:59").toISOString():null;
  const tag=$("icuEquipmentTag").value.trim();
  if(!tag){message("Enter the hospital asset tag.",true);return;}
  const button=$("icuEquipmentRegisterButton");
  const ok=await runAction(button,()=>rpc("healthos_icu_register_equipment",{
   p_clinic_id:currentClinic.id,p_asset_tag:tag,p_equipment_type:$("icuEquipmentType").value,
   p_manufacturer:$("icuEquipmentManufacturer").value.trim()||null,p_model:$("icuEquipmentModel").value.trim()||null,
   p_serial_number:$("icuEquipmentSerial").value.trim()||null,p_location_note:$("icuEquipmentLocation").value.trim()||null,
   p_notes:$("icuEquipmentNotes").value.trim()||null,p_next_inspection_due:dateValue("icuEquipmentInspectionDue"),
   p_next_maintenance_due:dateValue("icuEquipmentMaintenanceDue")
  }),"Equipment registered. Registration and audit history have been recorded.");
  if(ok)$("icuEquipmentRegisterForm").reset();
 });
 $("icuEquipmentEventForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const assetId=$("icuEquipmentEventAsset").value,note=$("icuEquipmentEventNote").value.trim();
  const timeValue=$("icuEquipmentEventTime").value;
  if(!assetId||note.length<5||!timeValue){message("Select equipment, event date/time and enter the event details.",true);return;}
  const performedAt=new Date(timeValue);
  if(Number.isNaN(performedAt.getTime())||performedAt.getTime()>Date.now()+5*60*1000){message("Enter a valid event time that is not in the future.",true);return;}
  const button=$("icuEquipmentEventButton");
  const ok=await runAction(button,()=>rpc("healthos_icu_record_equipment_event",{
   p_clinic_id:currentClinic.id,p_asset_id:assetId,p_event_type:$("icuEquipmentEventType").value,
   p_event_note:note,p_event_status:$("icuEquipmentEventStatus").value,p_event_details:{source:"icu_equipment_workspace"},
   p_performed_at:performedAt.toISOString(),p_new_asset_status:$("icuEquipmentNewStatus").value||null,
   p_next_inspection_due:null,p_next_maintenance_due:null
  }),"Equipment event recorded with staff identity and audit history.");
  if(ok){$("icuEquipmentEventForm").reset();$("icuEquipmentEventTime").value=new Date().toISOString().slice(0,16);}
 });

 $("icuEmergencyIncidentForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!currentClinic?.id){message("Select an active hospital first.",true);return;}
  const patientId=$("icuEmergencyPatient").value||null,admissionId=$("icuEmergencyAdmission").value||null,equipmentId=$("icuEmergencyEquipment").value||null;
  const occurred=new Date($("icuEmergencyOccurredAt").value);
  if(Number.isNaN(occurred.getTime())||occurred.getTime()>Date.now()+5*60*1000){message("Enter a valid incident date and time.",true);return;}
  if(admissionId&&!admissions.some(a=>a.id===admissionId&&(!patientId||a.patient_id===patientId))){message("The selected admission does not match the selected patient.",true);return;}
  const b=$("icuEmergencyReportButton");
  const ok=await runAction(b,()=>rpc("healthos_icu_report_emergency",{p_clinic_id:currentClinic.id,p_patient_id:patientId,p_admission_id:admissionId,p_equipment_asset_id:equipmentId,p_incident_type:$("icuEmergencyType").value,p_severity:$("icuEmergencySeverity").value,p_description:$("icuEmergencyDescription").value.trim(),p_occurred_at:occurred.toISOString()}),"Emergency incident reported and added to the audited response register.");
  if(ok){$("icuEmergencyIncidentForm").reset();$("icuEmergencyOccurredAt").value=new Date().toISOString().slice(0,16);}
 });
 $("icuEmergencyResponseForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const incidentId=$("icuEmergencyResponseIncident").value,action=$("icuEmergencyResponseAction").value,note=$("icuEmergencyResponseNote").value.trim(),assigned=$("icuEmergencyAssignedStaff").value||null;
  if(!incidentId||note.length<3){message("Select an open incident and enter the response note.",true);return;}
  if(action==="assign"&&!assigned){message("Select an active staff account to assign responsibility.",true);return;}
  const b=$("icuEmergencyResponseButton");
  const ok=await runAction(b,()=>rpc("healthos_icu_update_emergency_incident",{p_clinic_id:currentClinic.id,p_incident_id:incidentId,p_action:action,p_action_note:note,p_assigned_to:action==="assign"?assigned:null}),"Emergency response action recorded in the accountability history.");
  if(ok){$("icuEmergencyResponseNote").value="";$("icuEmergencyAssignedStaff").value="";}
 });

 $("icuRefreshButton")?.addEventListener("click",()=>void load());
 $("icuAdmissionForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!currentClinic?.id){message("Select an active hospital first.",true);return;}
  const patientId=$("icuAdmissionPatient").value,bedId=$("icuAdmissionBed").value;
  const admissionNumber=$("icuAdmissionNumber").value.trim(),reason=$("icuAdmissionReason").value.trim();
  if(!patientId||!bedId||!admissionNumber||!reason){message("Complete all required admission fields.",true);return;}
  const button=$("icuAdmitButton");
  const succeeded=await runAction(button,()=>rpc("healthos_icu_admit_patient",{p_clinic_id:currentClinic.id,p_patient_id:patientId,p_bed_id:bedId,p_admission_number:admissionNumber,p_admission_reason:reason}),"Patient admitted to the selected ICU bed. Bed allocation and admission were audited.");
  if(succeeded)$("icuAdmissionForm").reset();
 });
 document.querySelectorAll(".sidebar .nav-item").forEach(link=>link.addEventListener("click",()=>{if((link.getAttribute("href")||"")==="#staffWorkspace")void load();}));
 window.loadHealthOSICUWorkspace=load;
})();

// Laboratory workspace: actions are routed through the existing audited database RPCs.
(function initLaboratoryWorkspace(){
 const $=id=>document.getElementById(id);
 const message=(text,error=false)=>{const el=$("laboratoryWorkspaceMessage");if(el){el.textContent=text;el.className="message"+(error?" error":" success");}};
 const esc=v=>String(v??"—");
 const cell=(row,value)=>{const td=row.insertCell();td.textContent=esc(value);return td;};
 let requests=[],specimens=[],results=[],catalogue=[],patients=[],testMap=new Map();
 const call=async(name,args)=>{const {data,error}=await supabaseClient.rpc(name,args);if(error)throw error;return data;};
 async function load(){
  if(!supabaseClient||!currentClinic?.id||!currentUser?.id){message("Sign in to an authorised hospital staff account.",true);return;}
  message("Loading laboratory requests, specimen custody and result queue...");
  try{
   const clinic=currentClinic.id;
   const [r,s,t,p,c]=await Promise.all([
    supabaseClient.from("laboratory_test_requests").select("id,patient_id,test_catalogue_id,request_reference,priority,status,requested_by,requested_at,authorised_by,authorised_at").eq("clinic_id",clinic).order("requested_at",{ascending:false}).limit(300),
    supabaseClient.from("laboratory_specimens").select("id,request_id,barcode,specimen_type,status,collected_by,collected_at,received_by,received_at,rejection_reason").eq("clinic_id",clinic).order("created_at",{ascending:false}).limit(300),
    supabaseClient.from("laboratory_test_results").select("id,request_id,specimen_id,status,entered_by,entered_at,validated_by,validated_at,released_by,released_at,is_critical,critical_note").eq("clinic_id",clinic).order("created_at",{ascending:false}).limit(300),
    supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id",clinic).limit(500),
    supabaseClient.from("laboratory_test_catalogue").select("id,test_code,test_name,specimen_type,default_price,currency").eq("clinic_id",clinic).eq("is_active",true).order("test_name").limit(500)
   ]);
   for(const x of [r,s,t,p,c])if(x.error)throw x.error;
   requests=r.data||[];specimens=s.data||[];results=t.data||[];patients=p.data||[];catalogue=c.data||[];
   const pmap=new Map(patients.map(x=>[x.id,[x.patient_number,x.first_name,x.last_name].filter(Boolean).join(" — ")]));
   testMap=new Map(catalogue.map(x=>[x.id,x]));
   const reqMap=new Map(requests.map(x=>[x.id,x]));
   const name=x=>testMap.get(x.test_catalogue_id)?.test_name||"Test";
   $("labPendingCount").textContent=requests.filter(x=>x.status==="requested").length;
   $("labAwaitingReceiptCount").textContent=specimens.filter(x=>x.status==="collected").length;
   $("labProcessingCount").textContent=specimens.filter(x=>x.status==="processing").length;
   $("labValidationCount").textContent=results.filter(x=>x.status==="submitted").length;
   const rb=$("labRequestsRows");rb.replaceChildren();
   if(!requests.length){const tr=rb.insertRow();const td=tr.insertCell();td.colSpan=7;td.textContent="No laboratory requests found.";}
   requests.forEach(x=>{const tr=rb.insertRow();[x.request_reference,pmap.get(x.patient_id)||"Patient",name(x),x.priority,new Date(x.requested_at).toLocaleString(),x.status].forEach(v=>cell(tr,v));const td=tr.insertCell();if(x.status==="requested"&&x.requested_by!==currentUser.id){const approve=document.createElement("button");approve.type="button";approve.className="primary-button";approve.textContent="Authorise";approve.addEventListener("click",()=>runAction(approve,async()=>call("laboratory_authorise_test_request",{p_request_id:x.id}),"Request authorised."));const reject=document.createElement("button");reject.type="button";reject.className="secondary-button";reject.textContent="Reject";reject.addEventListener("click",()=>{const reason=prompt("Enter a reason for rejecting this laboratory request:");if(reason&&reason.trim())runAction(reject,async()=>call("laboratory_reject_test_request",{p_request_id:x.id,p_reason:reason.trim()}),"Request rejected.");});td.append(approve,reject);}else td.textContent=x.status==="requested"?"Requester cannot authorise own request":"—";});
   const authorised=requests.filter(x=>x.status==="authorised"&&!specimens.some(s=>s.request_id===x.id));
   const cs=$("labCollectRequest"),old=cs.value;cs.replaceChildren(new Option("Select authorised request",""));
   authorised.forEach(x=>cs.add(new Option(x.request_reference+" · "+(pmap.get(x.patient_id)||"Patient")+" · "+name(x),x.id)));
   if(authorised.some(x=>x.id===old))cs.value=old;
   const sb=$("labSpecimensRows");sb.replaceChildren();
   if(!specimens.length){const tr=sb.insertRow();const td=tr.insertCell();td.colSpan=6;td.textContent="No specimens recorded.";}
   specimens.forEach(x=>{const rq=reqMap.get(x.request_id);const tr=sb.insertRow();[x.barcode,rq?.request_reference||"Request",x.specimen_type,x.status,x.collected_at?new Date(x.collected_at).toLocaleString():"—",x.received_at?new Date(x.received_at).toLocaleString():"—"].forEach(v=>cell(tr,v));});
   const processing=specimens.filter(x=>x.status==="processing");
   const rs=$("labResultSpecimen"),oldSpec=rs.value;rs.replaceChildren(new Option("Select processing specimen",""));
   processing.forEach(x=>rs.add(new Option(x.barcode+" · "+(reqMap.get(x.request_id)?.request_reference||"Request"),x.barcode)));
   if(processing.some(x=>x.barcode===oldSpec))rs.value=oldSpec;
   const tb=$("labResultsRows");tb.replaceChildren();
   if(!results.length){const tr=tb.insertRow();const td=tr.insertCell();td.colSpan=6;td.textContent="No result records found.";}
   results.forEach(x=>{const tr=tb.insertRow();const specimen=specimens.find(s=>s.id===x.specimen_id);[reqMap.get(x.request_id)?.request_reference||"Request",specimen?.barcode||"Specimen",new Date(x.entered_at).toLocaleString(),x.is_critical?"YES":"No",x.status].forEach(v=>cell(tr,v));const td=tr.insertCell();if(x.status==="submitted"&&x.entered_by!==currentUser.id){const b=document.createElement("button");b.type="button";b.className="primary-button";b.textContent="Validate";b.addEventListener("click",()=>runAction(b,async()=>call("laboratory_validate_result",{p_result_id:x.id}),"Result validated."));td.appendChild(b);}else if(x.status==="validated"&&x.validated_by!==currentUser.id){const b=document.createElement("button");b.type="button";b.className="primary-button";b.textContent="Release";b.addEventListener("click",()=>{if(!confirm("Release this validated result to the clinical record?"))return;runAction(b,async()=>call("laboratory_release_result",{p_result_id:x.id}),"Result released.");});td.appendChild(b);}else td.textContent="—";});
   message("Laboratory workspace loaded. Workflow actions are checked and audited by the database.");
  }catch(err){console.error("Laboratory workspace load failed",err);message(err.message||"Could not load laboratory workspace. Check your hospital access.",true);}
 }
 async function runAction(button,fn,success){button.disabled=true;try{await fn();message(success);await load();}catch(e){message(e.message||"Action failed.",true);button.disabled=false;}}
 $("laboratoryRefreshButton")?.addEventListener("click",()=>void load());
 $("labCollectForm")?.addEventListener("submit",async ev=>{ev.preventDefault();const id=$("labCollectRequest").value;if(!id){message("Select an authorised test request.",true);return;}const b=$("labCollectButton");await runAction(b,async()=>{const {data,error}=await supabaseClient.rpc("laboratory_collect_specimen",{p_request_id:id,p_specimen_type:$("labSpecimenType").value.trim(),p_handling_notes:$("labHandlingNotes").value.trim()||null});if(error)throw error;$("labBarcode").value=data?.[0]?.specimen_barcode||"";$("labCollectForm").reset();message("Specimen collected. Generated barcode: "+($("labBarcode").value||"see specimen register"));}, "Specimen collected.");});
 async function barcodeAction(button,rpc,args,success){const barcode=$("labBarcode").value.trim();if(!barcode){message("Enter or scan a specimen barcode.",true);return;}await runAction(button,()=>call(rpc,{p_barcode:barcode,...args}),success);}
 $("labReceiveButton")?.addEventListener("click",()=>void barcodeAction($("labReceiveButton"),"laboratory_receive_specimen",{},"Specimen receipt confirmed."));
 $("labStartButton")?.addEventListener("click",()=>void barcodeAction($("labStartButton"),"laboratory_start_processing",{},"Specimen processing started."));
 $("labRejectButton")?.addEventListener("click",()=>{const reason=$("labRejectReason").value.trim();if(!reason){message("A rejection reason is required.",true);return;}void barcodeAction($("labRejectButton"),"laboratory_reject_specimen",{p_reason:reason},"Specimen rejected with a recorded reason.");});
 $("labResultForm")?.addEventListener("submit",async ev=>{ev.preventDefault();const barcode=$("labResultSpecimen").value;if(!barcode){message("Select a specimen currently in processing.",true);return;}let data;try{data=JSON.parse($("labResultData").value);}catch{message("Result data must be valid JSON.",true);return;}if(!data||Array.isArray(data)||typeof data!=="object"||!Object.keys(data).length){message("Enter a non-empty JSON object for the result.",true);return;}const critical=$("labIsCritical").checked;const note=$("labCriticalNote").value.trim();if(critical&&!note){message("Critical results require an escalation note.",true);return;}await runAction($("labSubmitResultButton"),()=>call("laboratory_submit_result",{p_barcode:barcode,p_result_data:data,p_interpretation:$("labInterpretation").value.trim()||null,p_result_notes:$("labResultNotes").value.trim()||null,p_is_critical:critical,p_critical_note:note||null}),"Result submitted for independent validation.");$("labResultForm").reset();});
 document.querySelectorAll(".sidebar .nav-item").forEach(link=>link.addEventListener("click",()=>{if((link.getAttribute("href")||"")==="#staffWorkspace")void load();}));
 
window.loadHealthOSLaboratoryWorkspace=load;
})();

// Radiology workspace: clinic-scoped data and server-enforced workflow permissions.
(function initRadiologyWorkspace(){
 const $=id=>document.getElementById(id);
 const msg=(s,e=false)=>{const el=$("radiologyMessage");if(el){el.textContent=s;el.className="message"+(e?" error":" success");}};
 const rpc=async(name,args)=>{const {data,error}=await supabaseClient.rpc(name,args);if(error)throw error;return data;};
 let requests=[],reports=[],patients=[];
 const cell=(tr,v)=>{const td=tr.insertCell();td.textContent=String(v??"—");return td;};
 async function load(){
  if(!supabaseClient||!currentClinic?.id||!currentUser?.id){msg("Sign in to an authorised hospital staff account.",true);return;}
  msg("Loading radiology worklist...");
  try{
   const clinic=currentClinic.id;
   const [r,p,t]=await Promise.all([
    supabaseClient.from("radiology_imaging_requests").select("id,patient_id,request_reference,modality,body_region,priority,status,requested_by,created_at,accession_number").eq("clinic_id",clinic).order("created_at",{ascending:false}).limit(300),
    supabaseClient.from("patients").select("id,patient_number,first_name,last_name").eq("clinic_id",clinic).limit(500),
    supabaseClient.from("radiology_reports").select("id,request_id,findings,impression,critical_finding,status,entered_by,verified_by").eq("clinic_id",clinic).order("created_at",{ascending:false}).limit(300)
   ]);
   for(const x of [r,p,t])if(x.error)throw x.error;
   requests=r.data||[];patients=p.data||[];reports=t.data||[];
   const names=new Map(patients.map(x=>[x.id,[x.patient_number,x.first_name,x.last_name].filter(Boolean).join(" · ")]));
   $("radPending").textContent=requests.filter(x=>x.status==="requested").length;
   $("radActive").textContent=requests.filter(x=>["authorised","scheduled","in_progress"].includes(x.status)).length;
   $("radVerify").textContent=reports.filter(x=>x.status==="submitted").length;
   $("radCritical").textContent=reports.filter(x=>x.critical_finding&&x.status!=="released").length;
   const ps=$("radPatient"),old=ps.value;ps.replaceChildren(new Option("Select patient",""));patients.forEach(x=>ps.add(new Option(names.get(x.id),x.id)));if(patients.some(x=>x.id===old))ps.value=old;
   const body=$("radRequestsRows");body.replaceChildren();
   if(!requests.length){const tr=body.insertRow();const td=tr.insertCell();td.colSpan=7;td.textContent="No imaging requests recorded.";}
   requests.forEach(x=>{const tr=body.insertRow();[x.request_reference,names.get(x.patient_id)||"Patient",x.modality,x.body_region,x.priority,x.status].forEach(v=>cell(tr,v));const td=tr.insertCell();
    const button=(label,action,args)=>{const b=document.createElement("button");b.type="button";b.className="secondary-button";b.textContent=label;b.addEventListener("click",()=>act(b,()=>rpc(action,args),label+" completed."));td.appendChild(b);};
    if(x.status==="requested"&&x.requested_by!==currentUser.id)button("Authorise","radiology_authorise_request",{p_request_id:x.id});
    if(x.status==="authorised")button("Schedule","radiology_update_workflow",{p_request_id:x.id,p_action:"schedule",p_accession:null});
    if(x.status==="scheduled")button("Start study","radiology_update_workflow",{p_request_id:x.id,p_action:"start",p_accession:null});
    if(x.status==="in_progress"){const b=document.createElement("button");b.type="button";b.className="secondary-button";b.textContent="Complete study";b.addEventListener("click",()=>{const accession=prompt("Enter the imaging accession / study reference:");if(accession&&accession.trim())act(b,()=>rpc("radiology_update_workflow",{p_request_id:x.id,p_action:"complete",p_accession:accession.trim()}),"Study marked complete.");});td.appendChild(b);}
    if(!td.childNodes.length)td.textContent="—";
   });
   const sel=$("radReportRequest"),oldReq=sel.value;sel.replaceChildren(new Option("Select completed study",""));requests.filter(x=>x.status==="study_completed").forEach(x=>sel.add(new Option(x.request_reference+" · "+x.modality,x.id)));if(requests.some(x=>x.id===oldReq&&x.status==="study_completed"))sel.value=oldReq;
   const rb=$("radReportsRows");rb.replaceChildren();
   if(!reports.length){const tr=rb.insertRow();const td=tr.insertCell();td.colSpan=5;td.textContent="No radiology reports recorded.";}
   reports.forEach(x=>{const tr=rb.insertRow();[requests.find(r=>r.id===x.request_id)?.request_reference||"Request",x.impression,x.critical_finding?"YES":"No",x.status].forEach(v=>cell(tr,v));const td=tr.insertCell();
    const b=document.createElement("button");b.type="button";b.className="primary-button";
    if(x.status==="submitted"&&x.entered_by!==currentUser.id){b.textContent="Verify";b.addEventListener("click",()=>act(b,()=>rpc("radiology_verify_report",{p_report_id:x.id}),"Report verified."));td.appendChild(b);}
    else if(x.status==="verified"&&x.verified_by!==currentUser.id){b.textContent="Release";b.addEventListener("click",()=>{if(confirm("Release this verified report to the clinical workflow?"))act(b,()=>rpc("radiology_release_report",{p_report_id:x.id}),"Report released.");});td.appendChild(b);}
    else td.textContent="—";
   });
   msg("Radiology worklist loaded. All workflow actions are permission-checked and audited in the database.");
  }catch(e){console.error("Radiology workspace",e);msg(e.message||"Could not load radiology workspace.",true);}
 }
 async function act(b,fn,success){b.disabled=true;try{await fn();msg(success);await load();}catch(e){msg(e.message||"Action failed.",true);b.disabled=false;}}
 $("radiologyRefreshButton")?.addEventListener("click",()=>void load());
 $("radRequestForm")?.addEventListener("submit",async ev=>{ev.preventDefault();const b=$("radCreateButton");await act(b,async()=>{const encounter=$("radEncounter").value.trim()||null;if(encounter&&!/^[0-9a-f-]{36}$/i.test(encounter))throw new Error("Encounter ID must be a valid UUID.");await rpc("radiology_create_request",{p_clinic_id:currentClinic.id,p_patient_id:$("radPatient").value,p_encounter_id:encounter,p_modality:$("radModality").value,p_body_region:$("radBodyRegion").value.trim(),p_indication:$("radIndication").value.trim(),p_priority:$("radPriority").value});$("radRequestForm").reset();},"Imaging request submitted.");});
 $("radReportForm")?.addEventListener("submit",async ev=>{ev.preventDefault();const critical=$("radCritical").value==="true",note=$("radCriticalNote").value.trim();if(critical&&!note){msg("Critical findings require an escalation note.",true);return;}const b=$("radSubmitReport");await act(b,async()=>{await rpc("radiology_submit_report",{p_request_id:$("radReportRequest").value,p_findings:$("radFindings").value.trim(),p_impression:$("radImpression").value.trim(),p_critical:critical,p_critical_note:note||null});$("radReportForm").reset();},"Report submitted for independent verification.");});
 document.querySelectorAll(".sidebar .nav-item").forEach(a=>a.addEventListener("click",()=>{if((a.getAttribute("href")||"")==="#staffWorkspace")void load();}));
 window.loadHealthOSRadiologyWorkspace=load;
})();


// STAGE 3I-E: HOSPITAL-WIDE ESCALATION MONITORING (ADMIN ONLY)
(function initHospitalEscalationMonitoring() {
    const byId = (id) => document.getElementById(id);
    const message = byId("hospitalEscalationMonitorMessage");
    const rows = byId("hospitalEscalationMonitorRows");
    const refresh = byId("refreshHospitalEscalationMonitor");
    if (!message || !rows || !refresh || refresh.dataset.bound === "1") return;
    refresh.dataset.bound = "1";

    function setMessage(text, isError) {
        message.textContent = text;
        message.className = isError ? "message error" : "message";
    }
    function addCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = value == null || value === "" ? "—" : String(value);
        row.appendChild(cell);
        return cell;
    }
    function setCount(id, value) {
        const node = byId(id);
        if (node) node.textContent = String(Number(value || 0));
    }
    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
    }
    function renderHistory(container, events) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "View event history (" + events.length + ")";
        details.appendChild(summary);
        const list = document.createElement("ol");
        events.forEach((event) => {
            const item = document.createElement("li");
            const heading = document.createElement("strong");
            heading.textContent = String(event.action || "event").replaceAll("_", " ").toUpperCase();
            item.appendChild(heading);
            item.appendChild(document.createTextNode(" — " + formatDate(event.created_at)));
            if (event.notes) {
                const note = document.createElement("p");
                note.textContent = event.notes;
                item.appendChild(note);
            }
            list.appendChild(item);
        });
        if (!events.length) {
            const item = document.createElement("li");
            item.textContent = "No additional event history recorded.";
            list.appendChild(item);
        }
        details.appendChild(list);
        container.appendChild(details);
    }

    async function load() {
        if (!currentClinic || !currentClinic.id) {
            setMessage("Select an active hospital before loading escalation monitoring.", true);
            return;
        }
        refresh.disabled = true;
        rows.replaceChildren();
        setMessage("Loading hospital-wide escalation records. Server-side administrator permissions are being checked.", false);
        try {
            const status = byId("hospitalEscalationStatus")?.value || null;
            const severity = byId("hospitalEscalationSeverity")?.value || null;
            const { data, error } = await supabaseClient.rpc("get_department_task_escalation_monitoring", {
                p_clinic_id: currentClinic.id,
                p_status: status,
                p_severity: severity,
                p_limit: 200
            });
            if (error) throw error;
            const counts = data?.counts || {};
            setCount("hospitalEscOpen", counts.open);
            setCount("hospitalEscAcknowledged", counts.acknowledged);
            setCount("hospitalEscCritical", counts.critical);
            setCount("hospitalEscUrgent", counts.urgent);
            setCount("hospitalEscResolved", counts.resolved);

            const items = Array.isArray(data?.items) ? data.items : [];
            if (!items.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 6;
                cell.textContent = "No escalation records match the selected filters.";
                row.appendChild(cell);
                rows.appendChild(row);
            }
            items.forEach((item) => {
                const row = document.createElement("tr");
                addCell(row, String(item.severity || "normal").toUpperCase() + " / " + String(item.status || "—").toUpperCase());
                addCell(row, (item.department_name || "Unassigned department") + (item.unit_name ? " / " + item.unit_name : ""));
                addCell(row, (item.task_title || "Untitled task") + (item.task_status ? " (" + item.task_status.replaceAll("_", " ") + ")" : ""));
                addCell(row, item.reason || item.source || "—");
                addCell(row, formatDate(item.created_at));

                const actionCell = document.createElement("td");
                renderHistory(actionCell, Array.isArray(item.events) ? item.events : []);
                const actionBar = document.createElement("div");
                actionBar.style.display = "flex";
                actionBar.style.flexWrap = "wrap";
                actionBar.style.gap = ".4rem";
                actionBar.style.marginTop = ".5rem";

                if (item.status === "open") {
                    const acknowledge = document.createElement("button");
                    acknowledge.type = "button";
                    acknowledge.className = "secondary-button";
                    acknowledge.textContent = "Acknowledge";
                    acknowledge.addEventListener("click", async () => {
                        acknowledge.disabled = true;
                        try {
                            const result = await supabaseClient.rpc("acknowledge_department_task_escalation", {
                                p_clinic_id: currentClinic.id,
                                p_escalation_id: item.id,
                                p_notes: "Acknowledged from the hospital escalation monitor."
                            });
                            if (result.error) throw result.error;
                            await load();
                        } catch (error) {
                            setMessage(error.message || "Could not acknowledge escalation.", true);
                            acknowledge.disabled = false;
                        }
                    });
                    actionBar.appendChild(acknowledge);
                }
                if (item.status === "open" || item.status === "acknowledged") {
                    const resolve = document.createElement("button");
                    resolve.type = "button";
                    resolve.className = "primary-button";
                    resolve.textContent = "Resolve";
                    resolve.addEventListener("click", async () => {
                        const notes = window.prompt("Enter the resolution notes (at least 5 characters).");
                        if (notes === null) return;
                        if (notes.trim().length < 5) {
                            setMessage("Resolution notes must contain at least 5 characters.", true);
                            return;
                        }
                        resolve.disabled = true;
                        try {
                            const result = await supabaseClient.rpc("resolve_department_task_escalation", {
                                p_clinic_id: currentClinic.id,
                                p_escalation_id: item.id,
                                p_resolution_notes: notes.trim()
                            });
                            if (result.error) throw result.error;
                            await load();
                        } catch (error) {
                            setMessage(error.message || "Could not resolve escalation.", true);
                            resolve.disabled = false;
                        }
                    });
                    actionBar.appendChild(resolve);
                }
                if (actionBar.childElementCount) actionCell.appendChild(actionBar);
                row.appendChild(actionCell);
                rows.appendChild(row);
            });
            setMessage("Loaded " + items.length + " escalation record(s). Hospital-wide administrator scope confirmed by the server. Last refreshed: " + formatDate(data?.generated_at) + ".", false);
        } catch (error) {
            rows.replaceChildren();
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "Escalation records are unavailable for this account or hospital.";
            row.appendChild(cell);
            rows.appendChild(row);
            setMessage(error.message || "Could not load hospital escalation monitoring.", true);
            ["hospitalEscOpen","hospitalEscAcknowledged","hospitalEscCritical","hospitalEscUrgent","hospitalEscResolved"].forEach((id) => setCount(id, "—"));
        } finally {
            refresh.disabled = false;
        }
    }

    refresh.addEventListener("click", () => void load());
    byId("hospitalEscalationStatus")?.addEventListener("change", () => void load());
    byId("hospitalEscalationSeverity")?.addEventListener("change", () => void load());
    window.loadHospitalEscalationMonitor = load;
})();
// END STAGE 3I-E HOSPITAL ESCALATION MONITORING


// STAGE 3I-F: ESCALATION RESPONSE PERFORMANCE AND ACCOUNTABILITY
(function initEscalationResponsePerformance() {
    const $ = (id) => document.getElementById(id);
    const refresh = $("refreshEscalationPerformance");
    const message = $("escalationPerformanceMessage");
    if (!refresh || !message || refresh.dataset.bound === "1") return;
    refresh.dataset.bound = "1";
    const departmentRows = $("escalationDepartmentPerformanceRows");
    const repeatedRows = $("escalationRepeatedTaskRows");
    const criticalRows = $("escalationCriticalRows");

    function status(text, isError) {
        message.textContent = text;
        message.className = isError ? "message error" : "message";
    }
    function cell(row, value) {
        const td = document.createElement("td");
        td.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
        row.appendChild(td);
    }
    function emptyRow(body, columns, text) {
        body.replaceChildren();
        const row = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = columns;
        td.textContent = text;
        row.appendChild(td);
        body.appendChild(row);
    }
    function minutes(value) {
        if (value === null || value === undefined || value === "") return "—";
        const number = Number(value);
        if (!Number.isFinite(number)) return "—";
        if (number >= 1440) return (number / 1440).toFixed(1) + " days";
        if (number >= 60) return (number / 60).toFixed(1) + " hours";
        return number.toFixed(1) + " min";
    }
    function percentage(numerator, denominator) {
        const n = Number(numerator || 0), d = Number(denominator || 0);
        return d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "—";
    }
    function set(id, value) {
        const node = $(id);
        if (node) node.textContent = value === null || value === undefined ? "—" : String(value);
    }
    function date(value) {
        if (!value) return "—";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
    }

    async function load() {
        if (!currentClinic || !currentClinic.id) {
            status("Select an active hospital before loading performance reports.", true);
            return;
        }
        refresh.disabled = true;
        status("Calculating department response performance and repeat escalation patterns...", false);
        try {
            const days = Number($("escalationPerformanceDays")?.value || 30);
            const { data, error } = await supabaseClient.rpc("get_department_escalation_performance", {
                p_clinic_id: currentClinic.id,
                p_days: days,
                p_limit: 100
            });
            if (error) throw error;
            const totals = data?.totals || {};
            set("escalationAvgAck", minutes(totals.avg_ack_minutes));
            set("escalationAvgResolution", minutes(totals.avg_resolution_minutes));
            set("escalationAckTarget", percentage(totals.acknowledged_within_30m, totals.total));
            set("escalationResolutionTarget", percentage(totals.resolved_within_4h, totals.total));
            set("escalationCriticalOpen", totals.unresolved_critical || 0);

            const departments = Array.isArray(data?.departments) ? data.departments : [];
            departmentRows.replaceChildren();
            if (!departments.length) emptyRow(departmentRows, 8, "No department escalation records found for this period.");
            departments.forEach((item) => {
                const row = document.createElement("tr");
                cell(row, item.department_name);
                cell(row, item.total);
                cell(row, item.open);
                cell(row, item.acknowledged);
                cell(row, item.resolved);
                cell(row, minutes(item.avg_ack_minutes));
                cell(row, minutes(item.avg_resolution_minutes));
                cell(row, item.unresolved_critical);
                departmentRows.appendChild(row);
            });

            const repeated = Array.isArray(data?.repeated_tasks) ? data.repeated_tasks : [];
            repeatedRows.replaceChildren();
            if (!repeated.length) emptyRow(repeatedRows, 5, "No task has been escalated more than once during this period.");
            repeated.forEach((item) => {
                const row = document.createElement("tr");
                cell(row, item.task_title);
                cell(row, (item.department_name || "—") + (item.unit_name ? " / " + item.unit_name : ""));
                cell(row, item.escalation_count);
                cell(row, item.open_count);
                cell(row, date(item.last_raised_at));
                repeatedRows.appendChild(row);
            });

            const critical = Array.isArray(data?.unresolved_critical) ? data.unresolved_critical : [];
            criticalRows.replaceChildren();
            if (!critical.length) emptyRow(criticalRows, 5, "No unresolved critical escalations are currently recorded.");
            critical.forEach((item) => {
                const row = document.createElement("tr");
                cell(row, item.task_title);
                cell(row, (item.department_name || "—") + (item.unit_name ? " / " + item.unit_name : ""));
                cell(row, item.status);
                cell(row, minutes(item.minutes_open));
                cell(row, item.reason || item.source);
                criticalRows.appendChild(row);
            });

            status("Performance report loaded for the last " + days + " days. " +
                (totals.total || 0) + " escalation record(s) analysed. Acknowledgement and resolution percentages use all escalations in the reporting period as the denominator. Generated: " + date(data?.generated_at) + ".", false);
        } catch (error) {
            console.error("Escalation response performance report failed", error);
            status(error.message || "Performance report could not be loaded. Confirm administrator access and try again.", true);
            emptyRow(departmentRows, 8, "Performance data unavailable.");
            emptyRow(repeatedRows, 5, "Repeated escalation data unavailable.");
            emptyRow(criticalRows, 5, "Critical escalation data unavailable.");
        } finally {
            refresh.disabled = false;
        }
    }

    refresh.addEventListener("click", () => void load());
    $("escalationPerformanceDays")?.addEventListener("change", () => void load());
    window.loadEscalationResponsePerformance = load;
})();
// END STAGE 3I-F ESCALATION RESPONSE PERFORMANCE
