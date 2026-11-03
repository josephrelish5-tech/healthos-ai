// HealthOS AI
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
    if (viewId === "dashboard" && !managementVerified) {
        showOnly(currentUser ? "verification" : "auth");
        return;
    }

    const mainContent = document.getElementById("dashboard");
    if (!mainContent) return;

    const allowedViews = ["dashboard", "staffManagement", "patients", "appointments", "whatsappIntake", "adminVoiceTranslator", "patientRecordSharing", "ussdDiagnostics", "multiFacilityManagement", "patientConnectionRequests", "globalReferrals", "internationalPayments", "telemedicineDashboard", "aiAnalytics", "patientFlow", "clinicalRecords", "clinicalScribe", "serviceCapture", "billing", "posReconciliation", "pharmacy", "reports"];
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
        ":scope > .welcome, :scope > #dashboardMessage, :scope > .stats-grid, " +
        ":scope > #adminStaffDashboard, :scope > #patients, :scope > #appointments, " +
        ":scope > #whatsappIntake, :scope > #adminVoiceTranslator, :scope > #patientRecordSharing, :scope > #ussdDiagnostics, :scope > #multiFacilityManagement, :scope > #patientConnectionRequests, :scope > #globalReferrals, :scope > #telemedicineDashboard, :scope > #aiAnalytics, :scope > #patientFlow, :scope > #clinicalRecords, :scope > #serviceCapture, :scope > #billing, :scope > #posReconciliation, " +
        ":scope > #pharmacy, :scope > #reports"
    );
    pageElements.forEach(element => {
        const isOverview = element.matches(".welcome, #dashboardMessage, .stats-grid");
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
    if (viewId === "patientConnectionRequests" && typeof window.loadPatientConnectionRequests === "function") window.loadPatientConnectionRequests().catch(error => console.error("Patient connection requests refresh failed:", error));
    if (viewId === "globalReferrals") { loadGlobalReferralOptions().catch(error => { const m=document.getElementById("globalReferralMessage"); if(m){m.textContent=friendlyError(error);m.className="message error";} }); loadGlobalReferralInbox(); }
    if (viewId === "internationalPayments" && currentClinic && managementVerified) loadInternationalPaymentWorkspace(currentClinic).catch(error => console.error("International payment workspace failed:",error));
    if (viewId === "telemedicineDashboard" && typeof loadTelemedicineDashboard === "function") loadTelemedicineDashboard();
    if (viewId === "aiAnalytics" && typeof window.loadAIAnalytics === "function") window.loadAIAnalytics().catch(error => console.error("AI analytics refresh failed:", error));
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

// Display only the requested HealthOS AI workspace.
function showOnly(screen) {
    authPanel.hidden = screen !== "auth";
        const recoveryPanel = document.getElementById("passwordRecoveryPanel");
    if (recoveryPanel) recoveryPanel.hidden = screen !== "passwordRecovery";
    clinicSetup.hidden = screen !== "clinic";
    appPanel.hidden = screen !== "dashboard";
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
        ? "Create your HealthOS AI account"
        : "Welcome to HealthOS AI";

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
        : "New to HealthOS AI?";

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

    return true;
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
        await verifyManagementAccess(password);
        
        managementVerified = true;
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
            "HealthOS AI management verification failed:",
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
        "HealthOS AI staff presence tracking started."
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

const searchHospitalsButton = document.getElementById("searchHospitalsButton");
if (searchHospitalsButton) searchHospitalsButton.addEventListener("click", async () => {
    const target = document.getElementById("patientHospitalResults");
    const message = document.getElementById("hospitalSearchMessage");
    const country = document.getElementById("hospitalSearchCountry").value.trim().toUpperCase();
    const city = document.getElementById("hospitalSearchCity").value.trim();
    target.replaceChildren();
    if (!country || !/^[A-Z]{2}$/.test(country) || !city) {
        message.textContent = "Enter a two-letter country code and city to search.";
        message.className = "message error";
        return;
    }
    searchHospitalsButton.disabled = true;
    message.textContent = "Searching verified hospitals...";
    message.className = "message";
    try {
        const { data, error } = await supabaseClient
            .from("healthos_hospital_directory")
            .select("clinic_id, public_name, city, country_code, specialties")
            .eq("country_code", country)
            .ilike("city", city)
            .eq("verification_status", "verified")
            .eq("accepting_patient_requests", true)
            .order("public_name")
            .limit(50);
        if (error) throw error;
        if (!data || !data.length) {
            message.textContent = "No verified hospitals accepting patient requests were found in that city.";
            return;
        }
        message.textContent = data.length + " verified hospital listing(s) found.";
        data.forEach(hospital => {
            const card = document.createElement("article");
            card.className = "stat-card";
            const title = document.createElement("h3");
            title.textContent = hospital.public_name;
            const location = document.createElement("p");
            location.textContent = hospital.city + ", " + hospital.country_code;
            const specialties = document.createElement("p");
            specialties.textContent = (hospital.specialties || []).join(", ") || "Specialties not listed";
            const button = document.createElement("button");
            button.type = "button";
            button.className = "primary-button";
            button.textContent = "Request connection";
            button.addEventListener("click", async () => {
                button.disabled = true;
                const { error: requestError } = await supabaseClient
                    .from("healthos_patient_hospital_links")
                    .upsert({ patient_user_id: currentUser.id, clinic_id: hospital.clinic_id, status: "pending" }, { onConflict: "patient_user_id,clinic_id", ignoreDuplicates: true });
                if (requestError) {
                    setPatientAuthMessage(friendlyError(requestError), "error");
                    button.disabled = false;
                    return;
                }
                button.textContent = "Request submitted";
                await loadPatientHospitalLinks();
            });
            card.append(title, location, specialties, button);
            target.appendChild(card);
        });
    } catch (error) {
        message.textContent = friendlyError(error);
        message.className = "message error";
    } finally {
        searchHospitalsButton.disabled = false;
    }
});

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
                    if (selectedAssignment) void loadDepartmentAppointmentInbox(selectedAssignment.department_id);
                });

                const initialAssignment =
                    assignments.find(function (assignment) {
                        return assignment.assignment_id === contextSelect.value;
                    }) || assignments[0];
                displayStaffAssignmentContext(initialAssignment);
                if (initialAssignment) void loadDepartmentAppointmentInbox(initialAssignment.department_id);
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
            "HealthOS AI workspace lookup failed:",
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
            "HealthOS AI staff dashboard loading failed:",
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
        await loadDepartmentTaskEscalations(clinic);
    } catch (error) {
        console.error("Department performance report failed:", error);
        message.textContent =
            error.message ||
            "Department performance could not be loaded. Check the report permissions.";
        message.className = "message error";
    }
}

 
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
            "HealthOS AI: Staff activity table failed:",
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
            "HealthOS AI: Billing dashboard elements are missing."
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
                .select("id, created_at, transaction_at, payment_provider, transaction_reference, invoice_reference, payment_method, amount, captured_department, acceptance_status, reconciliation_status")
                .eq("clinic_id", clinic.id)
                .order("created_at", { ascending: false })
                .limit(100);

        if (departmentPaymentsError) {
            throw departmentPaymentsError;
        }

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
                        unallocated_bank_credit: "Positive bank deposit has no exact invoice or accepted receipt reference"
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
            "HealthOS AI billing data loading failed:",
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
                "HealthOS AI transaction save failed:",
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
                    "HealthOS AI staff registration failed:",
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
            "HealthOS AI connection check failed:",
            error
        );

        connectionStatus.classList.remove("success");
        connectionStatus.classList.add("error");
    
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

// Start HealthOS AI.
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
 let pendingSection=null,staffContext=null;
 const routes=[
 {owner:"Reception / Patient Access",aliases:["reception","front desk","patient access","admissions","medical records"],section:"patients",terms:["register patient","new patient","patient registration","patient demographics","patient file","patient details"],guide:"Open Patient Management and complete the required patient registration fields. Check for an existing patient before creating a duplicate record. Save only after confirming the details."},
 {owner:"Reception / Appointment Desk",aliases:["reception","front desk","appointment","patient access"],section:"appointments",terms:["appointment","schedule","booking","reschedule","appointment list","cancel appointment"],guide:"Open Appointments. Select the correct patient, date and time, enter the reason, then save. Confirm the appointment appears in the appointment list. Follow hospital policy before cancelling or changing an existing booking."},
 {owner:"Patient Flow / Admissions",aliases:["reception","admissions","nursing","patient flow"],section:"patientFlow",terms:["queue","waiting patient","triage queue","admission","bed allocation","patient flow"],guide:"Open Patient Flow to review the queue and admission workflow. Verify the patient's identity and the authorised clinical/admission decision before changing queue or bed status. Emergency triage must follow the hospital's clinical escalation protocol."},
 {owner:"Clinical / Nursing",aliases:["clinical","nursing","doctor","medical","emergency","outpatient","inpatient"],section:"clinicalRecords",terms:["clinical record","clinical note","encounter","vitals","patient assessment","medical history","consultation note","observations"],guide:"Open Clinical Records. Select the correct patient and encounter, document findings and observations, and save the note for the required review. Confirm entries against the source record; do not enter another patient's information."},
 {owner:"Clinical / Medical Scribe",aliases:["clinical","nursing","doctor","medical"],section:"clinicalScribe",terms:["medical scribe","scribe","transcribe","voice note","clinical dictation"],guide:"Open the Medical Scribe workspace. Obtain required patient consent, select the correct encounter, capture or enter the clinician's dictation, review the generated draft, correct errors and obtain clinician confirmation before it becomes part of the record."},
 {owner:"Clinical / Decision Support",aliases:["clinical","nursing","doctor","medical","emergency"],section:"clinicalDecisionSupportWorkspace",terms:["clinical decision support","risk review","clinical risk","allergy safety","medication allergy","vital trend","clinical alert"],guide:"Open Clinical Decision Support and record the clinical context, findings and risk factors. Treat prompts as decision-support information only. A licensed clinician must independently assess the patient and document the clinical decision. Activate emergency pathways immediately when needed."},
 {owner:"Pharmacy",aliases:["pharmacy","pharmacist","dispensary"],section:"pharmacy",terms:["medicine stock","drug inventory","pharmacy inventory","medicine batch","expiry","low stock","barcode","dispensing","prescription stock"],guide:"Open Pharmacy Inventory. Search for the medicine, confirm the correct product and batch, enter quantity and expiry details, and save. Check expiry and stock alerts before dispensing. Stock adjustments and dispensing must follow authorised pharmacy controls."},
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
  const {data:profile,error}=await supabaseClient.from("staff_profiles").select("id,department,professional_role,employment_status").eq("clinic_id",currentClinic.id).eq("user_id",currentUser.id).limit(1).maybeSingle();
  if(error||!profile||profile.employment_status&&profile.employment_status!=="active")return null;
  const departments=new Set(profile.department?[profile.department]:[]);
  const {data:assignments}=await supabaseClient.from("staff_department_assignments").select("department_id").eq("clinic_id",currentClinic.id).eq("staff_profile_id",profile.id).eq("assignment_status","active");
  const ids=[...new Set((assignments||[]).map(a=>a.department_id).filter(Boolean))];
  if(ids.length){const {data:deptRows}=await supabaseClient.from("clinic_departments").select("department_name").eq("clinic_id",currentClinic.id).eq("is_active",true).in("id",ids);(deptRows||[]).forEach(d=>departments.add(d.department_name));}
  return {profileId:profile.id,departments:[...departments],role:profile.professional_role||""};
 }
 function routeMatch(q){const words=normalize(q);return routes.map(r=>({...r,score:r.terms.reduce((n,t)=>{const term=normalize(t);return n+(words.includes(term)?term.split(" ").length:0);},0)})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score)[0]||null;}
 function departmentOwns(departments,route){if(route.aliases.includes("all departments"))return true;return departments.some(dep=>{const d=normalize(dep);return route.aliases.some(a=>d===normalize(a)||d.includes(normalize(a))||normalize(a).includes(d)&&d.length>3);});}
 async function handleRequest(q){
  if(!String(q||"").trim()){show("What do you need help with?","Type a task, a question about how to use HealthOS, or the name of a workspace.");return;}
  if(!staffContext)staffContext=await loadStaffContext();
  if(!staffContext||!staffContext.departments.length){show("Department access not identified","I could not verify an active staff department or assignment. Ask your administrator to complete your staff profile and department assignments. I cannot reveal departmental information until your access context is confirmed.");return;}
  const match=routeMatch(q);
  if(match&&!departmentOwns(staffContext.departments,match)){show("This information belongs to another department","Your authorised department assignment(s): "+staffContext.departments.join(", ")+". This request belongs to "+match.owner+". I can’t provide that department’s work instructions or open its restricted workspace. Contact that department or request an authorised additional assignment.");return;}
  if(typeof window.healthOSDepartmentKnowledgeSearch==="function"){
   const knowledge=await window.healthOSDepartmentKnowledgeSearch(q);
   if(knowledge&&knowledge.length){
    const article=knowledge[0];
    const departmentName=article._departmentName||departmentsLabel(article.department_id);
    const source="\\n\\nSOURCE: "+article.title+" · "+departmentName+" · Version "+article.version+" · Approved knowledge article.";
    const alternatives=knowledge.length>1?"\\n\\nRELATED APPROVED ARTICLES:\\n"+knowledge.slice(1,4).map((x,i)=>(i+1)+". "+x.title+" (v"+x.version+")").join("\\n"):"";
    show("Knowledge Centre · "+article.title,(article.summary?article.summary+"\\n\\n":"")+article.content+source+alternatives,article.workspace_section_id||null,"Open linked workspace");
    return;
   }
  }
  if(!match){show("No approved article matched","I couldn't find an approved departmental article for that question. Try different keywords or ask your department administrator to add an approved FAQ or work instruction. I can guide you through registered HealthOS workflows, but I cannot search private patient records or other departments' restricted information.");return;}
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
                .select("id,supplier_name,contact_person,phone,email,is_active")
                .eq("clinic_id", context.clinicId)
                .order("supplier_name");
            if (supplierResult.error) throw supplierResult.error;
            const suppliers = supplierResult.data || [];
            procurementSupplierSelect.replaceChildren();
            const supplierPlaceholder = document.createElement("option");
            supplierPlaceholder.value = "";
            supplierPlaceholder.textContent = "Select an active supplier";
            procurementSupplierSelect.appendChild(supplierPlaceholder);
            suppliers.filter(s => s.is_active).forEach(s => {
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
                    cell.colSpan = 4;
                    cell.textContent = "No suppliers registered yet.";
                    row.appendChild(cell);
                    supplierBody.appendChild(row);
                } else {
                    suppliers.forEach(s => {
                        const row = document.createElement("tr");
                        [s.supplier_name, s.contact_person || "—", s.phone || "—", s.is_active ? "Active" : "Inactive"]
                            .forEach(v => addPharmacyCell(row, v));
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
            await loadPharmacyReceiveOrderItems();
            showProcurementMessage("Procurement workspace loaded.", false);
        } catch (error) {
            console.error("Pharmacy procurement load error:", error);
            showProcurementMessage(error.message || "Unable to load procurement workspace.", true);
        }
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
                    created_by: context.userId
                };
                if (payload.supplier_name.length < 2) throw new Error("Enter a valid supplier name.");
                const result = await supabaseClient.from("pharmacy_suppliers").insert(payload);
                if (result.error) throw result.error;
                procurementSupplierForm.reset();
                showProcurementMessage("Supplier registered successfully.", false);
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
                const result = await supabaseClient.rpc("receive_pharmacy_purchase_order_item", {
                    p_clinic_id: context.clinicId,
                    p_purchase_order_item_id: procurementItemSelect.value,
                    p_receipt_number: document.getElementById("pharmacyGoodsReceiptNumber").value.trim(),
                    p_batch_number: document.getElementById("pharmacyGoodsBatchNumber").value.trim(),
                    p_expiry_date: document.getElementById("pharmacyGoodsExpiryDate").value,
                    p_quantity: quantity,
                    p_delivery_note_reference: document.getElementById("pharmacyDeliveryNote").value.trim() || null,
                    p_notes: document.getElementById("pharmacyGoodsReceiptNotes").value.trim() || null
                });
                if (result.error) throw result.error;
                procurementReceiveForm.reset();
                showProcurementMessage("Goods received. A new inventory batch and receipt record have been created.", false);
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
            const [inventoryResult, locationResult, adjustmentResult, transferResult] = await Promise.all([
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
                    .eq("clinic_id", c.clinicId).order("created_at", {ascending:false}).limit(100)
            ]);
            for (const r of [inventoryResult,locationResult,adjustmentResult,transferResult]) if (r.error) throw r.error;
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
            say("Stock controls loaded. Existing batches are assigned to their stock locations.",false);
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
   audioStatus("Transcript and AI note draft prepared. Listen/read the source, correct the transcript and personally edit the note before saving.");
   scribeMessage("AI-assisted draft prepared for clinician review only. Nothing has been signed or added to the medical record.");
  }catch(error){audioStatus("Secure transcription failed. No audio was saved in HealthOS AI. Please try again or enter an approved transcript manually.");}
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
                .then(() => console.info("HealthOS AI offline application shell registered."))
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
  $s("patientShareCodePanel").hidden=false;
  say("Patient-authorised access code created. It will not be shown again after leaving this screen.");
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
   supabaseClient.from("appointments").select("id,scheduled_at,status").eq("clinic_id",clinicId).gte("scheduled_at",todayStart.toISOString()).lt("scheduled_at",isoTomorrow).limit(3000),
   supabaseClient.from("billing_transactions").select("invoice_amount,amount_paid,payment_status,transaction_date").eq("clinic_id",clinicId).order("transaction_date",{ascending:false}).limit(5000),
   supabaseClient.from("service_events").select("id,quantity,unit_price,event_status,performed_at").eq("clinic_id",clinicId).gte("performed_at",todayStart.toISOString()).lt("performed_at",isoTomorrow).in("event_status",["performed","verified"]).limit(3000),
   supabaseClient.from("patient_queue").select("id,priority,status").eq("clinic_id",clinicId).not("status","in","(completed,cancelled)").limit(3000),
   supabaseClient.from("hospital_beds").select("id,status").eq("clinic_id",clinicId).limit(3000),
   supabaseClient.from("pharmacy_inventory").select("id,medicine_name,quantity,reorder_level,expiry_date").eq("clinic_id",clinicId).limit(5000),
   supabaseClient.from("clinical_encounters").select("id,status,started_at").eq("clinic_id",clinicId).gte("started_at",todayStart.toISOString()).lt("started_at",isoTomorrow).limit(3000)
  ]);
  const failed=results.find(r=>r.error);if(failed)throw failed.error;
  const patients=results[0].count||0,appointments=results[1].data||[],billing=results[2].data||[],services=results[3].data||[],queue=results[4].data||[],beds=results[5].data||[],stock=results[6].data||[],encounters=results[7].data||[];
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
  set("aiPatientsTotal",num(patients));set("aiAppointmentsToday",num(appointments.length));set("aiRevenueToday",money(collectedToday));
  set("aiOutstanding",money(outstanding));set("aiServicesToday",num(services.length));set("aiQueueWaiting",num(waiting.length));
  set("aiBedsOccupied",num(occupied));set("aiLowStock",num(low.length));
  const trend=$("aiRevenueTrendBody");trend.replaceChildren();
  for(let offset=6;offset>=0;offset--){
   const day=new Date(todayStart);day.setDate(day.getDate()-offset);const key=dateKey(day);
   const rows=billing.filter(x=>x.transaction_date&&dateKey(x.transaction_date)===key);
   const invoiced=rows.reduce((n,x)=>n+Number(x.invoice_amount||0),0),paid=rows.reduce((n,x)=>n+Number(x.amount_paid||0),0);
   const tr=trend.insertRow();cell(tr,day.toLocaleDateString());cell(tr,num(rows.length));cell(tr,money(invoiced));cell(tr,money(paid));cell(tr,money(Math.max(0,invoiced-paid)));
  }
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
