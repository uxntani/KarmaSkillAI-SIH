/* =========================================================
   KarmaSkill AI
   Frontend State Management
   ========================================================= */

const AppState = {
    // -----------------------------------------------------
    // API
    // -----------------------------------------------------
    apiBaseUrl: "http://localhost:8000",

    // -----------------------------------------------------
    // Demo users
    // These are temporary for the SIH prototype.
    // Real authentication can replace this later.
    // -----------------------------------------------------
    // Demo users / Accounts
    // Loaded dynamically from backend employees
    // -----------------------------------------------------
    demoUsers: {
        "1": {
            id: 1,
            name: "Rahul Sharma",
            email: "rahul.sharma@gov.in",
            department: "Statistics Department",
            role: "Statistical Officer",
            experience: 4,
            type: "employee"
        },
        admin: {
            id: null,
            name: "KarmaSkill Admin",
            email: "admin@karmaskill.gov.in",
            department: "Administration",
            role: "Administrator",
            experience: null,
            type: "admin"
        }
    },

    // -----------------------------------------------------
    // Current active account key
    // -----------------------------------------------------
    activeAccount: "1",

    // -----------------------------------------------------
    // Current page
    // -----------------------------------------------------
    currentPage: "dashboard",

    // -----------------------------------------------------
    // Cached API data
    // -----------------------------------------------------
    data: {
        employee: null,
        employees: [],
        competencies: [],
        roles: [],
        gapAnalysis: null,
        recommendations: [],
        assessments: [],
        courses: [],
        materials: [],
        dashboard: null,
        quizzes: [],
        currentQuiz: null
    },

    // -----------------------------------------------------
    // UI state
    // -----------------------------------------------------
    ui: {
        sidebarOpen: false,
        loading: false,
        toastTimeout: null
    }
};


/* =========================================================
   ACCOUNT MANAGEMENT
   ========================================================= */

/**
 * Register employee list into demo users.
 */
function setEmployeesList(employees) {
    if (!Array.isArray(employees)) return;

    AppState.data.employees = employees;

    employees.forEach(emp => {
        AppState.demoUsers[String(emp.id)] = {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            department: emp.department,
            role: emp.role,
            experience: emp.experience,
            type: "employee"
        };
    });

    // Backwards-compatible "employee" alias pointing to first employee
    if (employees.length > 0) {
        AppState.demoUsers["employee"] = AppState.demoUsers[String(employees[0].id)];
    }
}

/**
 * Get the currently active demo account.
 */
function getActiveAccount() {
    return AppState.demoUsers[AppState.activeAccount] || AppState.demoUsers["1"] || AppState.demoUsers["employee"];
}


/**
 * Check whether the current account is Admin.
 */
function isAdmin() {
    return AppState.activeAccount === "admin";
}


/**
 * Switch between Employee and Admin demo accounts.
 */
function switchAccount(accountKey) {
    const key = String(accountKey);

    if (!AppState.demoUsers[key]) {
        console.error("Invalid account key:", accountKey);
        return;
    }

    AppState.activeAccount = key;

    // Reset page when account changes
    AppState.currentPage = isAdmin()
        ? "admin"
        : "dashboard";

    // Clear previously cached personal data
    AppState.data.employee = null;
    AppState.data.gapAnalysis = null;
    AppState.data.recommendations = [];
    AppState.data.assessments = [];
    AppState.data.dashboard = null;
    AppState.data.currentQuiz = null;

    console.log(
        `Switched to account: ${key}`
    );

    // Notify the rest of the application
    window.dispatchEvent(
        new CustomEvent("accountChanged", {
            detail: getActiveAccount()
        })
    );
}


/* =========================================================
   PAGE MANAGEMENT
   ========================================================= */

/**
 * Change the active page.
 */
function navigateTo(page) {

    const validPages = [
        "dashboard",
        "assessments",
        "learning",
        "progress",
        "recommendations",
        "profile",
        "admin"
    ];

    if (!validPages.includes(page)) {
        console.warn("Unknown page:", page);
        return;
    }

    // Employee should not access admin page
    if (page === "admin" && !isAdmin()) {
        console.warn("Admin page requires admin account.");
        return;
    }

    AppState.currentPage = page;

    window.dispatchEvent(
        new CustomEvent("pageChanged", {
            detail: page
        })
    );
}


/**
 * Get current page.
 */
function getCurrentPage() {
    return AppState.currentPage;
}


/* =========================================================
   DATA MANAGEMENT
   ========================================================= */

/**
 * Store data returned by the backend.
 */
function setData(key, value) {

    if (!(key in AppState.data)) {
        console.warn(
            `Unknown AppState.data key: ${key}`
        );
        return;
    }

    AppState.data[key] = value;
}


/**
 * Get cached data.
 */
function getData(key) {

    if (!(key in AppState.data)) {
        console.warn(
            `Unknown AppState.data key: ${key}`
        );
        return null;
    }

    return AppState.data[key];
}


/**
 * Clear all cached backend data.
 */
function clearCachedData() {

    AppState.data.employee = null;
    AppState.data.employees = [];
    AppState.data.competencies = [];
    AppState.data.roles = [];
    AppState.data.gapAnalysis = null;
    AppState.data.recommendations = [];
    AppState.data.assessments = [];
    AppState.data.dashboard = null;
    AppState.data.quizzes = [];
    AppState.data.currentQuiz = null;
}


/* =========================================================
   UI STATE
   ========================================================= */

/**
 * Set loading state.
 */
function setLoading(isLoading) {

    AppState.ui.loading = isLoading;

    window.dispatchEvent(
        new CustomEvent("loadingChanged", {
            detail: isLoading
        })
    );
}


/**
 * Check loading state.
 */
function isLoading() {
    return AppState.ui.loading;
}


/**
 * Toggle mobile sidebar.
 */
function toggleSidebar() {

    AppState.ui.sidebarOpen =
        !AppState.ui.sidebarOpen;

    window.dispatchEvent(
        new CustomEvent("sidebarChanged", {
            detail: AppState.ui.sidebarOpen
        })
    );
}


/**
 * Close mobile sidebar.
 */
function closeSidebar() {

    AppState.ui.sidebarOpen = false;

    window.dispatchEvent(
        new CustomEvent("sidebarChanged", {
            detail: false
        })
    );
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

/**
 * Save the selected demo account.
 *
 * This is only for maintaining the demo state
 * after page refresh.
 */
function saveAccountState() {

    localStorage.setItem(
        "karmaskill_active_account",
        AppState.activeAccount
    );
}


/**
 * Restore selected account.
 */
function restoreAccountState() {

    const savedAccount =
        localStorage.getItem(
            "karmaskill_active_account"
        );

    if (
        savedAccount &&
        AppState.demoUsers[savedAccount]
    ) {
        AppState.activeAccount = savedAccount;

        AppState.currentPage =
            savedAccount === "admin"
                ? "admin"
                : "dashboard";
    }
}


/**
 * Initialize application state.
 */
function initializeState() {

    restoreAccountState();

    console.log(
        "KarmaSkill AI state initialized.",
        {
            account: AppState.activeAccount,
            page: AppState.currentPage
        }
    );
}


/* =========================================================
   EVENT HELPERS
   ========================================================= */

/**
 * Change account and persist it.
 */
function setActiveAccount(accountType) {

    switchAccount(accountType);
    saveAccountState();
}


/* =========================================================
   INITIALIZE
   ========================================================= */

initializeState();