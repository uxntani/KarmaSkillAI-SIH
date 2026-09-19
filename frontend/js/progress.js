/* =========================================================
   KarmaSkill AI - Progress & Gap Analytics Module
   ========================================================= */

let progressChartInstance = null;

async function renderProgressPage() {
    const content = $("#appContent");
    if (!content) return;

    if (isAdmin()) {
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Competency Progress</h1>
                    <p class="page-subtitle">Progress tracking is available for individual civil servant profiles. Switch to an employee account to see personalized analytics.</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body empty-state">
                    <div class="empty-state-icon">📈</div>
                    <div class="empty-state-title">Employee Account Required</div>
                    <div class="empty-state-description">Please select an employee account from the top right.</div>
                </div>
            </div>
        `;
        return;
    }

    const employee = AppState.data.employee;
    const gapData = AppState.data.gapAnalysis;
    const assessments = AppState.data.assessments || [];

    if (!employee || !gapData) {
        content.innerHTML = `
            <section class="initial-loading">
                <div class="loading-spinner"></div>
                <p>Loading your progress analytics...</p>
            </section>
        `;
        return;
    }

    const competencies = gapData.competencies || [];

    // Calculate metrics
    const totalGap = competencies.reduce((acc, c) => acc + Number(c.gap || 0), 0);
    const criticalCount = competencies.filter(c => c.status === "Critical").length;
    const needsImprovementCount = competencies.filter(c => c.status === "Needs Improvement").length;

    const currentAvg = competencies.length
        ? Math.round(competencies.reduce((sum, c) => sum + Number(c.current_level || 0), 0) / competencies.length)
        : 0;

    const requiredAvg = competencies.length
        ? Math.round(competencies.reduce((sum, c) => sum + Number(c.required_level || 0), 0) / competencies.length)
        : 0;

    const qualificationRate = requiredAvg > 0 ? Math.min(100, Math.round((currentAvg / requiredAvg) * 100)) : 100;

    content.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title-row">
                    <span class="page-title-icon">↗</span>
                    <h1 class="page-title">Competency Growth & Gap Analysis</h1>
                </div>
                <p class="page-subtitle">
                    Tracking competency levels for <strong>${escapeHTML(employee.name)}</strong> (${escapeHTML(employee.role)}) against Ministry benchmarks.
                </p>
            </div>
        </div>

        <!-- Metrics Grid -->
        <div class="summary-grid">
            <div class="summary-card stat-primary">
                <div class="summary-label">Role Qualification Rate</div>
                <div class="summary-value">${qualificationRate}%</div>
                <div class="summary-description">Current proficiency vs required baseline</div>
            </div>
            <div class="summary-card stat-amber">
                <div class="summary-label">Cumulative Gap</div>
                <div class="summary-value">${formatNumber(totalGap)} pts</div>
                <div class="summary-description">${criticalCount} critical, ${needsImprovementCount} moderate gaps</div>
            </div>
            <div class="summary-card stat-success">
                <div class="summary-label">Average Competency</div>
                <div class="summary-value">${currentAvg}%</div>
                <div class="summary-description">Target benchmark: ${requiredAvg}%</div>
            </div>
            <div class="summary-card stat-purple">
                <div class="summary-label">Assessments Completed</div>
                <div class="summary-value">${assessments.length}</div>
                <div class="summary-description">Evaluated skill points</div>
            </div>
        </div>

        <!-- Chart Section -->
        <div class="card mt-25">
            <div class="card-header">
                <div>
                    <div class="card-title">Current vs Required Competency Comparison</div>
                    <div class="text-muted">Visualized benchmark analysis for each required competency</div>
                </div>
            </div>
            <div class="card-body">
                <div class="chart-container" style="position: relative; height: 320px; width: 100%;">
                    <canvas id="competencyComparisonChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Detailed Competency Gap Breakdown -->
        <div class="section-container mt-30">
            <div class="section-header-row">
                <div>
                    <h2 class="section-heading">Detailed Competency Matrix</h2>
                    <p class="text-muted">Granular breakdown of each competency, current proficiency, and distance to required role proficiency.</p>
                </div>
            </div>

            <div class="competencies-detail-grid mt-15">
                ${competencies.map(renderCompetencyDetailCard).join("")}
            </div>
        </div>
    `;

    // Render Chart.js
    renderCompetencyChart(competencies);
}

function renderCompetencyDetailCard(item) {
    const current = Number(item.current_level || 0);
    const required = Number(item.required_level || 0);
    const gap = Number(item.gap || 0);

    let tagClass = "competent";
    if (item.status === "Critical") tagClass = "critical";
    else if (item.status === "Needs Improvement") tagClass = "moderate";
    else if (item.status === "Minor Gap") tagClass = "minor";

    return `
        <div class="comp-detail-card card">
            <div class="comp-detail-header">
                <h3 class="comp-detail-title">${escapeHTML(item.competency)}</h3>
                <span class="status-badge ${tagClass}">
                    ${escapeHTML(item.status)}
                </span>
            </div>

            <div class="comp-progress-dual mt-15">
                <div class="comp-metric-row">
                    <span class="metric-label">Current Level</span>
                    <span class="metric-val current">${formatNumber(current)}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill current-level" style="width:${Math.min(current, 100)}%"></div>
                </div>

                <div class="comp-metric-row mt-10">
                    <span class="metric-label">Required by Role</span>
                    <span class="metric-val required">${formatNumber(required)}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill required-level" style="width:${Math.min(required, 100)}%"></div>
                </div>
            </div>

            <div class="comp-detail-footer mt-18">
                <div class="gap-stat">
                    <span>Deficit:</span>
                    <strong>${formatNumber(gap)} points</strong>
                </div>
                <button type="button" class="btn btn-sm btn-outline" onclick="navigateTo('recommendations')">
                    View Actions →
                </button>
            </div>
        </div>
    `;
}

function renderCompetencyChart(competencies) {
    const canvas = document.getElementById("competencyComparisonChart");
    if (!canvas || typeof Chart === "undefined") return;

    if (progressChartInstance) {
        progressChartInstance.destroy();
    }

    const labels = competencies.map(c => c.competency);
    const currentData = competencies.map(c => Number(c.current_level || 0));
    const requiredData = competencies.map(c => Number(c.required_level || 0));

    progressChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Current Level (%)",
                    data: currentData,
                    backgroundColor: "rgba(32, 178, 107, 0.85)",
                    borderColor: "rgb(32, 178, 107)",
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: "Required Benchmark (%)",
                    data: requiredData,
                    backgroundColor: "rgba(40, 100, 215, 0.75)",
                    borderColor: "rgb(40, 100, 215)",
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        boxWidth: 14,
                        font: { family: "Inter", size: 13, weight: 500 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: val => val + "%",
                        font: { family: "Inter" }
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)"
                    }
                },
                x: {
                    ticks: {
                        font: { family: "Inter", weight: 500 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}
