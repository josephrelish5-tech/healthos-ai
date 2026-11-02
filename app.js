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

    const allowedViews = ["dashboard", "staffManagement", "patients", "appointments", "serviceCapture", "billing", "posReconciliation", "pharmacy", "reports"];
    if (!allowedViews.includes(viewId)) {
        alert("This page is not available yet.");
        return;
    }

    const requestedPanel = viewId === "dashboard" ? mainContent :
        document.getElementById(viewId === "staffManagement" ? "adminStaffDashboard" : viewId);
    if (!requestedPanel) {
        alert("This workspace page could not be found.");
        return;
    }

    const pageElements = mainContent.querySelectorAll(
        ":scope > .welcome, :scope > #dashboardMessage, :scope > .stats-grid, " +
        ":scope > #adminStaffDashboard, :scope > #patients, :scope > #appointments, " +
        ":scope > #serviceCapture, :scope > #billing, :scope > #posReconciliation, " +
        ":scope > #pharmacy, :scope > #reports"
    );
    pageElements.forEach(element => {
        const isOverview = element.matches(".welcome, #dashboardMessage, .stats-grid");
        element.hidden = viewId === "dashboard" ? !isOverview : element !== requestedPanel;
    });

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

    if (viewId === "serviceCapture") loadServiceCaptureModule().catch(error => console.error("Service Capture module loading failed:", error));
    if (viewId === "posReconciliation" && typeof window.loadBankStatementImports === "function") window.loadBankStatementImports().catch(error => console.error("Bank statement panel failed:", error));
    if (viewId === "billing" && currentClinic && managementVerified) loadBillingData(currentClinic).catch(error => console.error("Department payment review refresh failed:", error));
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
    // HEALTHOS AI: AUTOMATIC ADMIN STAFF DASHBOARD REFRESH
if (window.healthOSAdminStaffRefresh) {
    clearInterval(window.healthOSAdminStaffRefresh);
}

window.healthOSAdminStaffRefresh = setInterval(async function () {
    if (currentUser && currentClinic && managementVerified) {
        await loadAdminStaffDashboard(currentClinic);
        await loadDepartmentPerformanceDashboard(currentClinic);
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
async function openWorkspace(user) {
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
                });

                const initialAssignment =
                    assignments.find(function (assignment) {
                        return assignment.assignment_id === contextSelect.value;
                    }) || assignments[0];
                displayStaffAssignmentContext(initialAssignment);
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
    } catch (error) {
        console.error("Department performance report failed:", error);
        message.textContent =
            error.message ||
            "Department performance could not be loaded. Check the report permissions.";
        message.className = "message error";
    }
}

 
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
            const row = document.createElement("p");
            row.textContent = item.department_name + (item.unit_name ? " / " + item.unit_name : "") +
                " — " + item.role.replaceAll("_", " ") + ": " + item.manager_name +
                " (" + item.status + ", " + item.effective_from +
                (item.effective_to ? " to " + item.effective_to : " onward") + ")";
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
// Guided staff workflow — prototype version
// ============================================================

(function initializeHealthOSStaffAssistant() {
    const form = document.getElementById("staffAssistantForm");
    const input = document.getElementById("staffAssistantInput");
    const response = document.getElementById("staffAssistantResponse");
    const responseTitle = document.getElementById("staffAssistantResponseTitle");
    const responseText = document.getElementById("staffAssistantResponseText");
    const actionButton = document.getElementById("staffAssistantActionButton");

    if (!form || !input || !response || !responseTitle || !responseText || !actionButton) {
        console.warn("HealthOS Staff Assistant: Required HTML elements were not found.");
        return;
    }
    // HEALTHOS AI: FLOATING ASSISTANT OPEN/CLOSE CONTROLS

    const assistantPanel = document.getElementById("staffAssistant");
    const assistantLauncher = document.getElementById("staffAssistantLauncher");
    const assistantCloseButton = document.getElementById("staffAssistantClose");

    function setAssistantOpen(isOpen) {
        if (!assistantPanel || !assistantLauncher) {
            console.warn("HealthOS AI: Assistant panel or launcher not found.");
            return;
        }

        assistantPanel.hidden = !isOpen;
        assistantLauncher.setAttribute("aria-expanded", String(isOpen));

        if (isOpen && input) {
            input.focus();
        }

        if (!isOpen) {
            assistantLauncher.focus();
        }
    }

    if (assistantLauncher) {
        assistantLauncher.addEventListener("click", function() {
            setAssistantOpen(true);
        });
    }

    if (assistantCloseButton) {
        assistantCloseButton.addEventListener("click", function() {
            setAssistantOpen(false);
        });
    }

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && assistantPanel && !assistantPanel.hidden) {
            setAssistantOpen(false);
        }
    });

    // END FLOATING ASSISTANT CONTROLS
    let pendingSection = null;

    function showResponse(title, message, sectionId = null, buttonLabel = "Open task") {
        responseTitle.textContent = title;
        responseText.textContent = message;
        response.hidden = false;

        pendingSection = sectionId;
        actionButton.hidden = !sectionId;

        if (sectionId) {
            actionButton.textContent = buttonLabel;
        }

        response.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    
function openSection(sectionId, sectionName) {
    const section = document.getElementById(sectionId);

    if (!section) {
        setAssistantOpen(false);

        alert(
            sectionName +
            " is not available yet. This section needs to be connected."
        );

        return;
    }

    // Find the page containing the requested section.
    const targetPanel = section.closest(".panel");

    // Open the correct dashboard page.
    if (
        targetPanel &&
        typeof window.showHealthOSView === "function"
    ) {
        window.showHealthOSView(targetPanel.id);
    }

    // Close the floating assistant.
    setAssistantOpen(false);

    // Scroll to the requested section.
    requestAnimationFrame(function() {
        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    console.log(
        "HealthOS AI opened: " + sectionName
    );
}

    function handleRequest(request) {
        const text = request.toLowerCase().trim();

        if (!text) {
            showResponse(
                "Tell me what you need",
                "For example, ask me to record a completed service or review billing."
            );
            return;
        }

        if (
            text.includes("service") ||
            text.includes("procedure") ||
            text.includes("treatment") ||
            text.includes("consultation") ||
            text.includes("record a performed")
        ) {
            openSection("serviceCapture", "Service Capture");
            return;
        }

        if (
            text.includes("billing") ||
            text.includes("invoice") ||
            text.includes("payment") ||
            text.includes("unpaid") ||
            text.includes("revenue")
        ) {
            openSection("billing", "Billing");
            return;
        }

        if (
            text.includes("patient") ||
            text.includes("register") ||
            text.includes("find a patient")
        ) {
            const patientForm = document.getElementById("patientForm");

            if (patientForm) {
                openSection("patientForm", "Patient Registration");
            } else {
                showResponse(
                    "Patient management",
                    "The patient registration workflow is not connected to this assistant yet. I will not claim a patient has been registered or found."
                );
            }
            return;
        }

        if (
            text.includes("appointment") ||
            text.includes("schedule") ||
            text.includes("booking")
        ) {
            const appointmentForm = document.getElementById("appointmentForm");

            if (appointmentForm) {
                openSection("appointmentForm", "Appointments");
            } else {
                showResponse(
                    "Appointment management",
                    "The appointment workflow is not connected to this assistant yet. No appointment has been created or changed."
                );
            }
            return;
        }

        if (
            text.includes("help") ||
            text.includes("what can you do") ||
            text.includes("how can you help")
        ) {
            showResponse(
                "Here is how I can help",
                "I can guide you to Service Capture and Billing. Patient registration and appointment management may not be connected yet. This prototype uses simple keyword matching; it is not yet a full AI system."
            );
            return;
        }

        showResponse(
            "Let me guide you",
            "I did not recognise that request. Try asking about recording a service, reviewing billing, registering a patient, or managing appointments."
        );
    }

    form.addEventListener("submit", function(event) {
        event.preventDefault();
        handleRequest(input.value);
    });

    document.querySelectorAll("[data-assistant-action]").forEach(function(button) {
        button.addEventListener("click", function() {
            const task = button.dataset.assistantAction;

            const requests = {
                patient: "register a patient",
                appointment: "manage appointments",
                service: "record a performed service",
                billing: "review billing",
                help: "what can you help me do"
            };

            handleRequest(requests[task] || "help");
        });
    });

    actionButton.addEventListener("click", function() {
        if (!pendingSection) return;

        const section = document.getElementById(pendingSection);

        if (!section) {
            showResponse(
                "Task not available",
                "That section could not be found. Please refresh the dashboard."
            );
            return;
        }

        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    console.log("HealthOS Staff Assistant initialized successfully.");
})();
 
// ============================================================
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
    const bucket = "pos-receipt-evidence";
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
            .select("id,created_at,payment_provider,transaction_reference,amount,ocr_status,source_file_path,payment_method,invoice_reference,capture_channel,acceptance_status,captured_department,uploaded_by,accepted_by,accepted_at,reconciliation_status")
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
                    const { data: signed, error: signedError } =
                        await supabaseClient.storage.from(bucket).createSignedUrl(record.source_file_path, 60);
                    if (signedError) {
                        setMessage("Could not open evidence: " + signedError.message, "error");
                        return;
                    }
                    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
                });
                td.appendChild(openButton);
                const status = document.createElement("small");
                status.textContent = " OCR: " + (record.ocr_status || "pending");
                td.appendChild(status);
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
                path = currentClinic.id + "/" + currentUser.id + "/" + crypto.randomUUID() + "." + extension;
                digest = await hashFile(file);
                const { error: uploadError } = await supabaseClient.storage.from(bucket)
                    .upload(path, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
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
                    size_bytes: file ? file.size : null
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
            .select("id,created_at,bank_or_provider,account_label,period_start,period_end,import_status,row_count")
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

            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "statement.csv";
            const storagePath = currentClinic.id + "/" + currentUser.id + "/" +
                crypto.randomUUID() + "-" + safeName;
            const { error: uploadError } = await supabaseClient.storage
                .from(bucket)
                .upload(storagePath, file, { contentType: "text/csv", upsert: false });
            if (uploadError) throw uploadError;

            setImportMessage("Statement uploaded securely. Importing and validating CSV rows…");
            const { data: importResult, error: functionError } = await supabaseClient.functions.invoke(
                "import-bank-statement",
                {
                    body: {
                        clinic_id: currentClinic.id,
                        storage_path: storagePath,
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
  if(!selectedEncounter){const r=body.insertRow();cell(r,"Select an encounter to view safety alerts.");return;}
  const {data,error}=await supabaseClient.from("clinical_decision_support_alerts")
   .select("id,rule_code,severity,observed_value,alert_message,status,created_at,review_note")
   .eq("clinic_id",currentClinic.id).eq("encounter_id",selectedEncounter)
   .order("created_at",{ascending:false}).limit(100);
  if(error){safetyMessage(error.message,true);const r=body.insertRow();cell(r,"Could not load safety alerts.");return;}
  if(!data.length){const r=body.insertRow();cell(r,"No rule-based safety alerts for this encounter. This does not mean the patient is clinically clear.");return;}
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
  if(!transcript||!edited){scribeMessage("Enter the transcript and the clinician-reviewed note.",true);return;}
  const button=scribeForm.querySelector('button[type="submit"]');button.disabled=true;
  const {error}=await supabaseClient.from("clinical_scribe_drafts").insert({
   clinic_id:currentClinic.id,encounter_id:encounter.id,patient_id:encounter.patient_id,
   clinician_id:currentUser.id,source_type:"manual_transcript",consent_confirmed:true,
   consent_confirmed_at:new Date().toISOString(),transcript_text:transcript,
   clinician_edited_note:edited,note_type:$c("scribeNoteType").value
  });
  button.disabled=false;
  if(error){scribeMessage(error.message,true);return;}
  $c("scribeTranscript").value="";$c("scribeEditedNote").value="";$c("scribeConsent").checked=false;
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
