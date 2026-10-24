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
const logoutButton = document.getElementById("logoutButton");
const currentUserLabel = document.getElementById("currentUserLabel");
const currentClinicLabel = document.getElementById("currentClinicLabel");
const dashboardMessage = document.getElementById("dashboardMessage");

let supabaseClient = null;
let isSignUpMode = false;
let currentUser = null;
let currentClinic = null;
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
function showOnly(screen) {
    authPanel.hidden = screen !== "auth";
    clinicSetup.hidden = screen !== "clinic";
    appPanel.hidden = screen !== "dashboard";

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

// Find the signed-in user's clinic.
async function openWorkspace(user) {
    currentUser = user;

    currentUserLabel.textContent =
        user.email || "Signed-in user";

    logoutButton.hidden = false;

    showOnly("clinic");

    showClinicMessage(
        "Sign-in successful. Checking your clinic workspace..."
    );

    try {
        if (!supabaseClient) {
            throw new Error(
                "Account service is not ready. Please refresh and sign in again."
            );
        }

        const { data: clinics, error } = await supabaseClient
            .from("clinics")
            .select("id, name")
            .eq("owner_user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1);

        if (error) {
            throw error;
        }

        if (clinics && clinics.length > 0) {
            showDashboard(clinics[0]);
            return;
        }

        clinicNameInput.value = "";

        showOnly("clinic");

        showClinicMessage(
            "Your account is connected! Enter your clinic name below and click Create clinic workspace.",
            "success"
        );

        clinicNameInput.focus();

    } catch (error) {
        console.error(
            "HealthOS AI workspace lookup failed:",
            error
        );

        showOnly("clinic");

        showClinicMessage(
            "Your account signed in, but we could not load your clinic workspace: " +
            friendlyError(error),
            "error"
        );
    }
}

// Open the dashboard after a clinic is found or created.
function showDashboard(clinic) {
    showOnly("dashboard");
currentClinic = clinic;
    currentClinicLabel.textContent = clinic.name;

    showDashboardMessage(
        "Your clinic workspace is connected. Dashboard features are still under development."
    );

    loadBillingData(clinic);
}
// Load billing transactions and revenue findings for this clinic.
async function loadBillingData(clinic) {
    const transactionsBody =
        document.getElementById("transactionsBody");

    const totalRevenueElement =
        document.getElementById("totalRevenue");

    const outstandingBalanceElement =
        document.getElementById("outstandingBalance");

    const billingFindingCountElement =
        document.getElementById("billingFindingCount");

    const transactionCountElement =
        document.getElementById("transactionCount");

    if (
        !transactionsBody ||
        !totalRevenueElement ||
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

        let totalRevenue = 0;
        let outstandingBalance = 0;

        (transactions || []).forEach(function (transaction) {
            const invoiceAmount =
                Number(transaction.invoice_amount) || 0;

            const amountPaid =
                Number(transaction.amount_paid) || 0;

            const status = transaction.payment_status;

            if (
                status !== "void" &&
                status !== "refunded"
            ) {
                totalRevenue += amountPaid;
            }

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

        totalRevenueElement.textContent =
            money.format(totalRevenue);

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

// ------------------------------------------------------------
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
        loadServiceAudit()
    ]);
}

// ============================================================
// END SERVICE CAPTURE MODULE
// ============================================================
