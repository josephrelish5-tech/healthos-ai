// HealthOS AI
// Account creation and sign-in using Supabase.
// Use fictional demonstration information only.

const SUPABASE_URL =
    "https://berfmuhqfuwcgpnqxrtm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_UIhbdxfxl8jsU9KnIE93pg_HTEsU39C";

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
const logoutButton = document.getElementById("logoutButton");

let isSignUpMode = false;
let supabaseClient = null;

// Display messages to the user.
function showMessage(message, type = "") {
    authMessage.textContent = message;
    authMessage.className =
        "message" + (type ? " " + type : "");
}

// Switch between sign-in and account creation.
function setMode(signUp) {
    isSignUpMode = signUp;

    authHeading.textContent = signUp
        ? "Create your HealthOS AI account"
        : "Welcome to HealthOS AI";

    authDescription.textContent = signUp
        ? "Create an account to begin setting up your healthcare workspace."
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

    showMessage("");
}

// Convert technical errors into clearer messages.
function friendlyAuthError(error) {
    const message = error?.message ||
        "Something went wrong. Please try again.";

    if (/invalid login credentials/i.test(message)) {
        return "Email or password is incorrect. If you have no account, choose Create an account.";
    }

    if (/user already registered/i.test(message)) {
        return "This email may already be registered. Try signing in or use another email.";
    }

    if (/password should be at least/i.test(message)) {
        return "Please use a password with at least 8 characters.";
    }

    if (/email not confirmed/i.test(message)) {
        return "Please check your email and confirm your account before signing in.";
    }

    if (/failed to fetch|networkerror|fetch failed/i.test(message)) {
        return "Could not connect. Check your internet connection and try again.";
    }

    if (/email rate limit exceeded|rate limit/i.test(message)) {
        return "Too many attempts. Please wait a while before trying again.";
    }

    return message;
}

// Connect the website to Supabase.
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

        const { error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        connectionStatus.textContent =
            "Connected to account service";

        connectionStatus.classList.remove("error");
        connectionStatus.classList.add("success");

    } catch (error) {
        connectionStatus.textContent =
            "Account connection needs attention";

        showMessage(
            friendlyAuthError(error),
            "error"
        );
    }
}

// Make Create an account / Sign in clickable.
authModeToggle.addEventListener("click", function () {
    setMode(!isSignUpMode);
});

// Handle account creation and sign-in.
authForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage(
            "The account service is not ready. Refresh the page and try again.",
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

    showMessage(
        isSignUpMode
            ? "Creating your account..."
            : "Checking your sign-in details..."
    );

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

            if (data.session) {
                showMessage(
                    "Your account has been created. Next, we will set up your clinic workspace.",
                    "success"
                );
            } else {
                showMessage(
                    "Your account request was received. Check your email for a confirmation link. Confirm your email, then return here to sign in.",
                    "success"
                );
            }

        } else {
            const { error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                throw error;
            }

            showMessage(
                "Sign-in successful. Your account is connected.",
                "success"
            );
        }

    } catch (error) {
        showMessage(
            friendlyAuthError(error),
            "error"
        );

    } finally {
        authSubmit.disabled = false;

        authSubmit.textContent = isSignUpMode
            ? "Create account"
            : "Sign in";
    }
});

// Sign out safely.
logoutButton.addEventListener("click", async function () {
    if (!supabaseClient) {
        return;
    }

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        showMessage(
            friendlyAuthError(error),
            "error"
        );
        return;
    }

    showMessage(
        "You have signed out. You can sign in again.",
        "success"
    );

    setMode(false);
});

// Start the website.
setMode(false);
checkConnection();
