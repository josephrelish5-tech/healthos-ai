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
  
    if (viewId !== "dashboard") {
        managementVerified = false;
    }
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
                    "staff_id, full_name, department, professional_role, employment_status"
                )
                .eq("user_id", user.id)
                .eq("clinic_id", clinic.id)
                .maybeSingle();

        if (profileError) throw profileError;

        if (!staffProfile) {
            throw new Error(
                "Your clinic membership exists, but your staff profile " +
                "has not been registered. Ask your clinic administrator " +
                "to create your staff profile."
            );
        }

        if (staffProfile.employment_status !== "active") {
            throw new Error(
                "Your staff profile is not active. Contact your clinic administrator."
            );
        }

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

        const areas =
            workAreas[staffProfile.professional_role] ||
            ["Contact your administrator for assigned work areas"];

        areas.forEach(function (area) {
            const card = document.createElement("article");
            card.className = "stat-card";

            const heading = document.createElement("h3");
            heading.textContent = area;

            const description = document.createElement("p");
            description.className = "muted";
            description.textContent =
                "Assigned work area. Access controls are being connected.";

            card.append(heading, description);
            links.appendChild(card);
        });

        currentClinic = clinic;
        currentUserLabel.textContent = staffProfile.full_name;

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
                                email: email,
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
    });
}

// END HEALTHOS AI: OPEN AND CLOSE STAFF REGISTRATION
// Connect to Supabase.
async function checkConnection() {
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

        connectionStatus.textContent =
            "Connected to account service";

        connectionStatus.classList.remove("error");
        connectionStatus.classList.add("success");

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        if (data.session && data.session.user) {
            await openWorkspace(data.session.user);
        } else {
            currentUser = null;
            showOnly("auth");
        }
    } catch (error) {
        connectionStatus.textContent =
            "Account connection needs attention";

        connectionStatus.classList.remove("success");
        connectionStatus.classList.add("error");

        showOnly("auth");
        showAuthMessage(friendlyError(error), "error");
    }
}

// Switch between sign-in and account creation.
authModeToggle.addEventListener("click", function () {
    setMode(!isSignUpMode);
});

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
        const { error } =
            await supabaseClient.auth.signOut();

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

        const { data, error } = await supabaseClient
            .from("service_events")
            .select(
                "id, service_name_snapshot, quantity, unit_price, event_status, billing_transaction_id, performed_at, created_at"
            )
            .eq("clinic_id", currentClinic.id)
            .in("event_status", ["performed", "verified"])
            .order("created_at", { ascending: false })
            .limit(500);

        if (error) throw error;

        const candidates = (data || []).filter(
            record => !record.billing_transaction_id
        );

        if (candidates.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
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

        candidates.forEach(record => {
            const row = document.createElement("tr");

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
                "Needs human review"
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            table.appendChild(row);
        });

        serviceCaptureMessage(
            "serviceAuditMessage",
            candidates.length +
                " service record(s) need billing-link review. Verify before invoicing.",
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
    document.getElementById("refreshServiceAudit");

if (refreshServiceAuditButton) {
    refreshServiceAuditButton.addEventListener("click", async () => {
        refreshServiceAuditButton.disabled = true;

        try {
            await loadServiceAudit();
        } finally {
            refreshServiceAuditButton.disabled = false;
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

        showAppointmentMessage(
            friendlyError(error),
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
