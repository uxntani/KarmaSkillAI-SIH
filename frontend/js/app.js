/* =========================================================
   KarmaSkill AI - Main Application Controller
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(value, decimals = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(decimals) : "0";
}

function showToast(message, type = "info") {
    const container = $("#toast-container");
    if (!container) {
        console.log(message);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${escapeHTML(message)}</span>
        <button type="button" aria-label="Close">×</button>
    `;

    container.appendChild(toast);
    toast.querySelector("button").onclick = () => toast.remove();

    setTimeout(() => {
        if (toast.isConnected) toast.remove();
    }, 4000);
}

function setApplicationLoading(active) {
    setLoading(active);
    const loading = $(".initial-loading");
    if (loading) loading.classList.toggle("hidden", !active);
}

/* =========================================================
   MODAL CONTROLLER
   ========================================================= */

function openModal(title, htmlContent) {
    const modal = $("#appModal");
    const modalTitle = $("#modalTitle");
    const modalBody = $("#modalBody");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = htmlContent;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    const modal = $("#appModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function setupModal() {
    const modal = $("#appModal");
    const closeBtn = $("#modalCloseButton");
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }
    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeModal();
        });
    }
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
    });
}

function updateAccountUI() {
    const account = getActiveAccount();
    if (!account) return;

    const name = $("#header-user-name");
    const role = $("#header-user-role");
    const avatar = $("#header-avatar");
    const selector = $("#accountSelector");

    if (name) name.textContent = account.name;
    if (role) role.textContent = account.role;

    if (avatar) {
        const initials = account.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0].toUpperCase())
            .join("");
        avatar.textContent = initials || "?";
    }

    if (selector) selector.value = AppState.activeAccount;
}

function updateNavigationUI() {
    const page = getCurrentPage();

    $$(".nav-item[data-page]").forEach(item => {
        item.classList.toggle("active", item.dataset.page === page);
    });
}

function setupSidebar() {
    const button = $("#mobile-menu-button");
    const sidebar = $("#sidebar");

    if (button) {
        button.addEventListener("click", () => {
            if (sidebar) sidebar.classList.toggle("open");
        });
    }

    $$(".nav-item[data-page]").forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();

            const page = item.dataset.page;
            if (page === "admin" && !isAdmin()) {
                showToast("Switch to the Admin account first.", "warning");
                return;
            }

            navigateTo(page);
            if (sidebar) sidebar.classList.remove("open");
        });
    });
}

async function populateAccountSwitcher() {
    try {
        const employees = await API.getEmployees();
        if (Array.isArray(employees) && employees.length > 0) {
            setEmployeesList(employees);

            const selector = $("#accountSelector");
            if (selector) {
                selector.innerHTML = employees.map(emp => `
                    <option value="${emp.id}">${escapeHTML(emp.name)} (${escapeHTML(emp.role)})</option>
                `).join("") + `
                    <option value="admin">KarmaSkill Admin</option>
                `;
                selector.value = AppState.activeAccount;
            }
        }
    } catch (error) {
        console.warn("Could not load employees for account switcher", error);
    }
}

function setupAccountSwitcher() {
    const selector = $("#accountSelector");
    if (!selector) return;

    selector.addEventListener("change", async event => {
        const selectedKey = event.target.value;

        if (!AppState.demoUsers[selectedKey]) {
            showToast("Invalid demo account.", "error");
            return;
        }

        setActiveAccount(selectedKey);
        updateAccountUI();
        updateNavigationUI();

        if (selectedKey === "admin") {
            renderPage("admin");
        } else {
            await loadEmployeeData();
            await renderPage(getCurrentPage());
        }
    });
}

function setupStaticActions() {
    const logout = document.querySelector('[data-action="logout"]');

    if (logout) {
        logout.addEventListener("click", () => {
            showToast(
                "Logout is simulated. Use the account switcher on the top right to change accounts.",
                "info"
            );
        });
    }

    const settings = document.querySelector('[data-page="settings"]');

    if (settings) {
        settings.addEventListener("click", () => {
            showToast("Settings module is active in production mode.", "info");
        });
    }
}

async function initializeBackendStatus() {
    const connected = await checkBackendConnection();

    let indicator = document.querySelector(".backend-status");

    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "backend-status";
        indicator.style.cssText =
            "position:fixed;bottom:14px;right:14px;z-index:9999;padding:8px 14px;border-radius:20px;font:600 12px Inter,sans-serif;background:#fff;border:1px solid #e5e7eb;box-shadow:0 4px 15px rgba(0,0,0,.08);display:flex;align-items:center;gap:6px;";
        document.body.appendChild(indicator);
    }

    indicator.innerHTML = connected
        ? `<span style="color:#10b981;font-size:14px">●</span> Backend Connected`
        : `<span style="color:#ef4444;font-size:14px">●</span> Backend Offline`;

    indicator.style.color = connected ? "#065f46" : "#991b1b";

    return connected;
}

async function loadEmployeeData() {
    if (isAdmin()) return;

    const id = getCurrentEmployeeId();
    if (!id) return;

    setApplicationLoading(true);

    try {
        const [employee, gap, recommendations, assessments] =
            await Promise.all([
                API.getEmployee(id),
                API.getEmployeeGapAnalysis(id),
                API.getEmployeeRecommendations(id),
                API.getEmployeeAssessments(id)
            ]);

        setData("employee", employee);
        setData("gapAnalysis", gap);
        setData("recommendations", recommendations?.recommendations || []);
        setData("assessments", assessments || []);
    } catch (error) {
        showToast(
            error.message || "Could not load employee data.",
            "error"
        );
    } finally {
        setApplicationLoading(false);
    }
}

/* =========================================================
   PAGE ROUTER
   ========================================================= */

async function renderPage(page) {
    updateNavigationUI();

    if (page === "dashboard") {
        if (typeof renderDashboardPage === "function") return renderDashboardPage();
    }
    if (page === "assessments") {
        if (typeof renderAssessmentsPage === "function") return renderAssessmentsPage();
    }
    if (page === "learning") {
        if (typeof renderLearningPage === "function") return renderLearningPage();
    }
    if (page === "progress") {
        if (typeof renderProgressPage === "function") return renderProgressPage();
    }
    if (page === "recommendations") {
        if (typeof renderRecommendationsPage === "function") return renderRecommendationsPage();
    }
    if (page === "profile") {
        if (typeof renderProfilePage === "function") return renderProfilePage();
    }
    if (page === "admin") {
        if (typeof renderAdminPage === "function") return renderAdminPage();
    }

    if (typeof renderDashboardPage === "function") return renderDashboardPage();
}

// Listen to navigation page change events!
window.addEventListener("pageChanged", event => {
    const newPage = event.detail;
    renderPage(newPage);
});

async function initializeApplication() {
    setupModal();
    setupSidebar();
    setupAccountSwitcher();
    setupStaticActions();

    const backendConnected = await initializeBackendStatus();

    if (backendConnected) {
        await populateAccountSwitcher();
        if (!isAdmin()) {
            await loadEmployeeData();
        }
    }

    updateAccountUI();
    await renderPage(getCurrentPage());
}

document.addEventListener("DOMContentLoaded", () => {
    initializeApplication().catch(error => {
        console.error("KarmaSkill initialization failed:", error);

        const content = $("#appContent");
        if (content) {
            content.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h2>Application Error</h2>
                        <p class="text-muted">
                            ${escapeHTML(error.message)}
                        </p>
                    </div>
                </div>
            `;
        }
    });
});
