/* =========================================================
   KarmaSkill AI - Profile Module
   ========================================================= */

async function renderProfilePage() {
    const content = $("#appContent");
    if (!content) return;

    const account = getActiveAccount();
    const isAdm = isAdmin();
    const gapData = AppState.data.gapAnalysis;
    const competencies = gapData?.competencies || [];

    content.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title-row">
                    <span class="page-title-icon">♙</span>
                    <h1 class="page-title">Officer Profile</h1>
                </div>
                <p class="page-subtitle">
                    Official civil servant credentials, departmental affiliation, and Karmayogi competency benchmarks.
                </p>
            </div>
        </div>

        <div class="profile-layout-grid mt-20">
            <!-- Left Card: Officer Identity -->
            <div class="profile-identity-card card">
                <div class="profile-identity-header">
                    <div class="profile-large-avatar">
                        ${account ? account.name.split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase() : "KS"}
                    </div>
                    <h2 class="profile-officer-name mt-12">${escapeHTML(account ? account.name : "Officer")}</h2>
                    <span class="profile-officer-role">${escapeHTML(account ? account.role : "Official")}</span>
                    <span class="profile-dept-badge mt-6">${escapeHTML(account ? account.department : "Government of India")}</span>
                </div>

                <div class="profile-details-list mt-20">
                    <div class="profile-detail-row">
                        <span class="detail-label">Email Address</span>
                        <span class="detail-value">${escapeHTML(account ? account.email : "officer@gov.in")}</span>
                    </div>
                    <div class="profile-detail-row">
                        <span class="detail-label">Department</span>
                        <span class="detail-value">${escapeHTML(account ? account.department : "Public Administration")}</span>
                    </div>
                    <div class="profile-detail-row">
                        <span class="detail-label">Designated Role</span>
                        <span class="detail-value">${escapeHTML(account ? account.role : "Officer")}</span>
                    </div>
                    ${account && account.experience !== null ? `
                        <div class="profile-detail-row">
                            <span class="detail-label">Experience</span>
                            <span class="detail-value">${account.experience} Years in Service</span>
                        </div>
                    ` : ""}
                    <div class="profile-detail-row">
                        <span class="detail-label">Ecosystem</span>
                        <span class="detail-value">Mission Karmayogi (iGOT)</span>
                    </div>
                </div>

                <div class="profile-card-footer mt-25">
                    <button type="button" class="btn btn-outline full-width" onclick="showToast('Profile information is managed by Department HR.', 'info')">
                        Request Profile Update
                    </button>
                </div>
            </div>

            <!-- Right Column -->
            <div class="profile-details-column">
                <!-- Role Competency Framework Card -->
                ${!isAdm ? `
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Role Competency Matrix: ${escapeHTML(account.role)}</div>
                                <div class="text-muted">Target proficiency benchmarks assigned for this position</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="role-competencies-table">
                                ${competencies.length ? competencies.map(c => `
                                    <div class="profile-competency-row">
                                        <div class="prof-comp-info">
                                            <span class="prof-comp-name">${escapeHTML(c.competency)}</span>
                                            <span class="prof-comp-levels">Current: ${formatNumber(c.current_level)}% · Target: ${formatNumber(c.required_level)}%</span>
                                        </div>
                                        <div class="prof-comp-track">
                                            <div class="progress-track">
                                                <div class="progress-fill ${c.status === "Critical" ? "danger" : c.status === "Needs Improvement" ? "amber" : "success"}" style="width:${Math.min(c.current_level, 100)}%"></div>
                                            </div>
                                        </div>
                                        <div class="prof-comp-status">
                                            <span class="status-badge ${c.status === "Critical" ? "low" : c.status === "Needs Improvement" ? "medium" : "high"}">
                                                ${c.status}
                                            </span>
                                        </div>
                                    </div>
                                `).join("") : `
                                    <p class="text-muted">No competency data registered for this role.</p>
                                `}
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title">Administrator Privileges</div>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">You have administrative access to upload training PDFs, trigger Gemini-based competency analysis, generate quizzes, and view all system records.</p>
                        </div>
                    </div>
                `}

                <!-- Demo Account Switcher Shortcut -->
                <div class="card mt-20">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Switch Demo Profiles</div>
                            <div class="text-muted">Test how KarmaSkill AI personalizes content for different civil servants</div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="demo-accounts-grid">
                            ${(AppState.data.employees || []).map(emp => `
                                <div class="demo-account-item ${String(emp.id) === AppState.activeAccount ? "active" : ""}">
                                    <div class="demo-avatar">${emp.name.split(/\s+/).map(p => p[0]).join("").slice(0, 2)}</div>
                                    <div class="demo-details">
                                        <strong>${escapeHTML(emp.name)}</strong>
                                        <span>${escapeHTML(emp.role)}</span>
                                    </div>
                                    <button type="button" class="btn btn-sm ${String(emp.id) === AppState.activeAccount ? "btn-secondary" : "btn-primary"}" onclick="switchAccount('${emp.id}'); navigateTo('dashboard');">
                                        ${String(emp.id) === AppState.activeAccount ? "Active" : "Switch"}
                                    </button>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
