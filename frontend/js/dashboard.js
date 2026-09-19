/* =========================================================
   KarmaSkill AI - Dashboard Controller
   ========================================================= */

let dashboardChartInstance = null;

async function renderDashboardPage() {
    const content = document.querySelector("#appContent");
    if (!content) return;

    if (isAdmin()) {
        renderAdminPage();
        return;
    }

    const employee = AppState.data.employee;
    const gapData = AppState.data.gapAnalysis;
    const recommendations = AppState.data.recommendations || [];
    const assessments = AppState.data.assessments || [];

    if (!employee || !gapData) {
        content.innerHTML = `
            <section class="initial-loading">
                <div class="loading-spinner"></div>
                <p>Loading your competency profile...</p>
            </section>
        `;
        return;
    }

    const competencies = gapData.competencies || [];

    const currentAverage = competencies.length
        ? Math.round(
            competencies.reduce(
                (sum, item) => sum + Number(item.current_level || 0),
                0
            ) / competencies.length
        )
        : 0;

    const requiredAverage = competencies.length
        ? Math.round(
            competencies.reduce(
                (sum, item) => sum + Number(item.required_level || 0),
                0
            ) / competencies.length
        )
        : 0;

    const biggestGap = [...competencies].sort(
        (a, b) => Number(b.gap || 0) - Number(a.gap || 0)
    )[0];

    const critical = competencies.filter(
        item => item.status === "Critical"
    ).length;

    const needsImprovement = competencies.filter(
        item => item.status === "Needs Improvement"
    ).length;

    content.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title-row">
                    <span class="page-title-icon">◈</span>
                    <h1 class="page-title">Executive Dashboard</h1>
                </div>
                <p class="page-subtitle">
                    Karmayogi Competency Profile for <strong>${escapeHTML(employee.name)}</strong> · ${escapeHTML(employee.role)}.
                </p>
            </div>
        </div>

        <!-- Premium Hero Officer Banner -->
        <section class="dashboard-hero-banner mt-15">
            <div class="hero-left-content">
                <span class="hero-badge">OFFICER COMPETENCY PROFILE</span>
                <h2 class="hero-officer-name">${escapeHTML(employee.name)}</h2>
                <p class="hero-role-dept">
                    ${escapeHTML(employee.role)} · <span>${escapeHTML(employee.department)}</span>
                </p>
                <div class="hero-tags mt-10">
                    <span class="hero-tag-pill">Experience: ${employee.experience} yrs</span>
                    <span class="hero-tag-pill">Mission Karmayogi Framework</span>
                </div>
            </div>

            <div class="hero-right-card">
                <div class="hero-stat-box">
                    <span class="hero-stat-label">Competency Attainment</span>
                    <span class="hero-stat-value">${currentAverage}%</span>
                    <span class="hero-stat-sub">Target: ${requiredAverage}% required</span>
                </div>
                <button type="button" class="btn btn-hero-action mt-10" onclick="navigateTo('assessments')">
                    Take Assessment →
                </button>
            </div>
        </section>

        <!-- KPI Metric Summary Grid -->
        <section class="summary-grid mt-20">
            <div class="summary-card stat-primary">
                <div class="summary-label">Overall Competency</div>
                <div class="summary-value">${currentAverage}%</div>
                <div class="summary-description">Role target: ${requiredAverage}%</div>
                <div class="progress-track mt-10 sm">
                    <div class="progress-fill" style="width:${Math.min(currentAverage, 100)}%"></div>
                </div>
            </div>

            <div class="summary-card stat-danger">
                <div class="summary-label">Priority Gaps</div>
                <div class="summary-value">${critical + needsImprovement}</div>
                <div class="summary-description">${critical} critical · ${needsImprovement} moderate</div>
                <div class="summary-link mt-8" onclick="navigateTo('progress')">Analyze Gaps →</div>
            </div>

            <div class="summary-card stat-success">
                <div class="summary-label">Assessments Taken</div>
                <div class="summary-value">${assessments.length}</div>
                <div class="summary-description">Verified skill tests</div>
                <div class="summary-link mt-8" onclick="navigateTo('assessments')">View History →</div>
            </div>

            <div class="summary-card stat-purple">
                <div class="summary-label">Recommendations</div>
                <div class="summary-value">${recommendations.length}</div>
                <div class="summary-description">AI curated learning paths</div>
                <div class="summary-link mt-8" onclick="navigateTo('recommendations')">Start Learning →</div>
            </div>
        </section>

        <!-- Two Column Dashboard Grid -->
        <section class="dashboard-grid mt-25">
            <!-- Left Column: Competency Breakdown -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Competency Overview</div>
                        <div class="text-muted">Current level vs role required proficiency</div>
                    </div>
                    <button type="button" class="section-link" onclick="navigateTo('progress')">
                        Full Matrix →
                    </button>
                </div>

                <div class="card-body skill-list">
                    ${
                        competencies.length
                            ? competencies.map(renderSkillRow).join("")
                            : `
                                <div class="empty-state">
                                    <div class="empty-state-title">No competency data</div>
                                </div>
                            `
                    }
                </div>
            </div>

            <!-- Right Column: Priority Gap Spotlight & Radar Chart -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Primary Deficit & Action</div>
                        <div class="text-muted">Highest impact competency to prioritize</div>
                    </div>
                </div>

                <div class="card-body">
                    ${
                        biggestGap
                            ? `
                                <div class="gap-spotlight-box">
                                    <div class="gap-spotlight-top">
                                        <h3 class="gap-spotlight-name">${escapeHTML(biggestGap.competency)}</h3>
                                        <span class="status-badge ${biggestGap.status === "Critical" ? "critical" : "moderate"}">
                                            ${escapeHTML(biggestGap.status)}
                                        </span>
                                    </div>

                                    <div class="gap-bar-dual mt-15">
                                        <div class="gap-bar-label-row">
                                            <span>Current: <strong>${formatNumber(biggestGap.current_level)}%</strong></span>
                                            <span>Target: <strong>${formatNumber(biggestGap.required_level)}%</strong></span>
                                        </div>
                                        <div class="progress-track" style="height:10px">
                                            <div class="progress-fill ${biggestGap.status === "Critical" ? "danger" : "amber"}" style="width:${Math.min(Number(biggestGap.current_level), 100)}%"></div>
                                        </div>
                                    </div>

                                    <div class="gap-stats-banner mt-15">
                                        <div class="gap-deficit-number">
                                            ${formatNumber(biggestGap.gap)}
                                            <span>pts gap</span>
                                        </div>
                                        <p class="gap-deficit-note">
                                            Closing this gap fulfills ${Math.round((biggestGap.gap / requiredAverage) * 100)}% of your role's deficiency.
                                        </p>
                                    </div>

                                    <div class="gap-action-buttons mt-18">
                                        <button type="button" class="btn btn-primary full-width" onclick="navigateTo('assessments')">
                                            Take ${escapeHTML(biggestGap.competency)} Quiz →
                                        </button>
                                        <button type="button" class="btn btn-secondary full-width mt-8" onclick="navigateTo('learning')">
                                            Browse Learning Materials
                                        </button>
                                    </div>
                                </div>
                            `
                            : `
                                <div class="empty-state">
                                    <div class="empty-state-icon">🏆</div>
                                    <div class="empty-state-title">No Competency Gaps Detected</div>
                                    <div class="empty-state-description">Your skillset aligns with your role requirements.</div>
                                </div>
                            `
                    }
                </div>
            </div>
        </section>

        <!-- Recommended Learning Actions Section -->
        <section class="card mt-25">
            <div class="card-header">
                <div>
                    <div class="card-title">Recommended Next Steps</div>
                    <div class="text-muted">Targeted courses and AI training documents prioritized for your gaps</div>
                </div>

                <button type="button" class="section-link" onclick="navigateTo('recommendations')">
                    View all (${recommendations.length}) →
                </button>
            </div>

            <div class="card-body">
                ${
                    recommendations.length
                        ? `
                            <div class="recommendations-grid">
                                ${recommendations
                                    .slice(0, 3)
                                    .map(renderRecommendationCard)
                                    .join("")}
                            </div>
                        `
                        : `
                            <div class="empty-state">
                                <div class="empty-state-title">No recommendations yet</div>
                            </div>
                        `
                }
            </div>
        </section>
    `;
}

function renderSkillRow(item) {
    const current = Math.max(0, Math.min(Number(item.current_level || 0), 100));
    const required = Math.max(0, Math.min(Number(item.required_level || 0), 100));

    let tagClass = "competent";
    if (item.status === "Critical") tagClass = "critical";
    else if (item.status === "Needs Improvement") tagClass = "moderate";
    else if (item.status === "Minor Gap") tagClass = "minor";

    return `
        <div class="skill-row">
            <div class="skill-info-col">
                <div class="skill-name">
                    ${escapeHTML(item.competency)}
                </div>
                <div class="skill-subtext text-muted">
                    Required: ${formatNumber(required)}%
                </div>
            </div>

            <div class="skill-bar-col">
                <div class="progress-track">
                    <div class="progress-fill ${tagClass === "critical" ? "danger" : tagClass === "moderate" ? "amber" : "success"}"
                         style="width:${current}%">
                    </div>
                </div>
            </div>

            <div class="skill-percentage">
                ${formatNumber(current)}%
            </div>

            <div class="skill-badge-col">
                <span class="status-badge ${tagClass}">
                    ${escapeHTML(item.status)}
                </span>
            </div>
        </div>
    `;
}

function renderRecommendationCard(item) {
    const priority = item.priority || "Low";
    const isCourse = item.type === "course";

    return `
        <div class="recommendation-card">
            <div class="recommendation-card-top">
                <span class="recommendation-source ${isCourse ? "course" : "material"}">
                    ${isCourse ? "COURSE" : "AI MATERIAL"}
                </span>

                <span class="status-badge ${priority.toLowerCase()}">
                    ${escapeHTML(priority)}
                </span>
            </div>

            <h4 class="recommendation-card-title">
                ${escapeHTML(item.title || "Learning Resource")}
            </h4>

            <div class="recommendation-meta">
                Focus: <strong>${escapeHTML(item.competency || "Competency")}</strong>
            </div>

            <div class="recommendation-reason">
                ${
                    escapeHTML(
                        item.reason ||
                        "Recommended based on your competency gap."
                    )
                }
            </div>

            <div class="recommendation-action mt-12">
                <button type="button" class="btn btn-sm btn-primary" onclick="navigateTo('${isCourse ? "learning" : "assessments"}')">
                    ${isCourse ? "Explore Course →" : "Take Assessment →"}
                </button>
            </div>
        </div>
    `;
}
