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
// HEALTHOS AI: SEPARATE DASHBOARD VIEWS



function showHealthOSView(viewId) {

        // Require fresh verification whenever the management dashboard is opened.
    if (viewId === "dashboard" && !managementVerified) {
        showOnly(currentUser ? "verification" : "auth");
        return;
    }

    const mainContent = document.getElementById("dashboard");

    if (!mainContent) return;

    const allowedViews = [
        "dashboard",
        "patients",
        "appointments",
        "serviceCapture",
        "billing",
        "pharmacy",
        "reports"
    ];

    if (!allowedViews.includes(viewId)) {
        alert("This page is not available yet.");
        return;
    }

    const isDashboard = viewId === "dashboard";

// Keep management verification active while the authorised user
// navigates between modules. Verification is reset on sign-out,
// workspace re-entry, or when verification is explicitly cancelled.

// Check that the requested page exists before changing views.
    // Check that the requested page exists before changing views.
    const requestedPanel = isDashboard
        ? mainContent
        : document.getElementById(viewId);

    if (!requestedPanel) {
        alert(
            viewId === "pharmacy"
                ? "The Pharmacy page has not been created yet."
                : viewId === "reports"
                    ? "The Reports page has not been created yet."
                    : "This page could not be found."
        );
        return;
    }

    // Show the overview only on the Dashboard page.
    mainContent.querySelectorAll(
        ":scope > .welcome, :scope > .stats-grid, :scope > #dashboardMessage"
    ).forEach(element => {
        element.hidden = !isDashboard;
    });

    // Hide every existing module except the selected page.
    allowedViews
        .filter(id => id !== "dashboard")
        .forEach(id => {
            const panel = document.getElementById(id);

            if (panel) {
                panel.hidden = id !== viewId;
            }
        });

    // Highlight the selected sidebar link.
    document.querySelectorAll(".sidebar .nav-item").forEach(link => {
        const active =
            link.getAttribute("href") === "#" + viewId;

        link.classList.toggle("active", active);

        if (active) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    // Display the selected page.
    requestedPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
        // Load Service Capture data whenever its page opens.
    if (viewId === "serviceCapture") {
        loadServiceCaptureModule().catch(error => {
            console.error(
                "Service Capture module loading failed:",
                error
            );
        });
    }
}

// Connect the sidebar to the page navigation.
document.querySelectorAll(".sidebar .nav-item").forEach(link => {
    link.addEventListener("click", function(event) {
        const viewId = (this.getAttribute("href") || "")
            .replace(/^#/, "");

        if (!viewId) return;

        event.preventDefault();
        showHealthOSView(viewId);

        if (window.location.hash !== "#" + viewId) {
            history.replaceState(null, "", "#" + viewId);
        }
    });
});

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
    // HEALTHOS AI: AUTOMATIC ADMIN STAFF DASHBOARD REFRESH
if (window.healthOSAdminStaffRefresh) {
    clearInterval(window.healthOSAdminStaffRefresh);
}

window.healthOSAdminStaffRefresh = setInterval(async function () {
    if (currentUser && currentClinic && managementVerified) {
        await loadAdminStaffDashboard(currentClinic);
    }
}, 15000);
// END HEALTHOS AI: AUTOMATIC ADMIN STAFF DASHBOARD REFRESH    
// HEALTHOS AI: LOAD STAFF SHIFT OPTIONS
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
    }
};

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
                ]
            };

            const permittedRoles = permittedRolesByArea[area] || [];

            if (
                !permittedRoles.includes(
                    staffProfile.professional_role
                )
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

    loadingCell.colSpan = 6;
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

                cell.textContent = value;

                if (index === 3) {
                    cell.style.fontWeight = "600";
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

        billingFindingCountElement.textContent =
            String(findings ? findings.length : 0);

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

                message.textContent =
                    error.message ||
                    "Staff registration failed. Please try again.";

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
    openStaffRegistrationButton.addEventListener("click", function () {
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

        (findings || []).forEach(finding => {
            if (
                finding.service_event_id &&
                !findingsByService.has(finding.service_event_id)
            ) {
                findingsByService.set(
                    finding.service_event_id,
                    finding
                );
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

                cell.colSpan = 5;
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

                cell.colSpan = 5;
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

                                const payload = {
                    clinic_id: context.clinicId,
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
                }
            });
        }
    );

    // Make the loader available for controlled internal use.
    window.loadHealthOSPharmacyInventory =
        loadPharmacyInventory;

    console.log(
        "HealthOS Pharmacy inventory module initialized."
    );
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
