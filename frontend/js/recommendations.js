/* =========================================================
   KarmaSkill AI - Recommendations Module
   ========================================================= */

async function renderRecommendationsPage() {
    const content = $("#appContent");
    if (!content) return;

    if (isAdmin()) {
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Recommendations</h1>
                    <p class="page-subtitle">Recommendations are generated per employee based on their specific competency gaps. Switch to an employee account to view personalized recommendations.</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <div class="empty-state-title">Employee Account Required</div>
                    <div class="empty-state-description">Please select an employee account from the top right.</div>
                </div>
            </div>
        `;
        return;
    }

    const employee = AppState.data.employee;
    const recommendations = AppState.data.recommendations || [];

    const highPriority = recommendations.filter(r => r.priority === "High");
    const mediumPriority = recommendations.filter(r => r.priority === "Medium");
    const lowPriority = recommendations.filter(r => r.priority === "Low");

    content.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title-row">
                    <span class="page-title-icon">♧</span>
                    <h1 class="page-title">Personalized Recommendations</h1>
                </div>
                <p class="page-subtitle">
                    AI recommendation engine analyzed your role requirements and competency deficits to prioritize optimal learning interventions.
                </p>
            </div>
        </div>

        <!-- Priority Metric Cards -->
        <div class="summary-grid">
            <div class="summary-card stat-danger">
                <div class="summary-label">High Priority</div>
                <div class="summary-value">${highPriority.length}</div>
                <div class="summary-description">Urgent competency gaps</div>
            </div>
            <div class="summary-card stat-amber">
                <div class="summary-label">Medium Priority</div>
                <div class="summary-value">${mediumPriority.length}</div>
                <div class="summary-description">Moderate skill improvements</div>
            </div>
            <div class="summary-card stat-primary">
                <div class="summary-label">Low Priority</div>
                <div class="summary-value">${lowPriority.length}</div>
                <div class="summary-description">Elective skill enhancements</div>
            </div>
            <div class="summary-card stat-success">
                <div class="summary-label">Total Actions</div>
                <div class="summary-value">${recommendations.length}</div>
                <div class="summary-description">Curated courses & materials</div>
            </div>
        </div>

        <!-- Filter Tabs -->
        <div class="learning-filter-bar mt-25">
            <button type="button" class="filter-tab-btn active" data-filter="all">All (${recommendations.length})</button>
            <button type="button" class="filter-tab-btn" data-filter="high">High Priority (${highPriority.length})</button>
            <button type="button" class="filter-tab-btn" data-filter="medium">Medium Priority (${mediumPriority.length})</button>
            <button type="button" class="filter-tab-btn" data-filter="course">Courses Only</button>
            <button type="button" class="filter-tab-btn" data-filter="learning_material">AI Materials Only</button>
        </div>

        <!-- Recommendations Grid -->
        <div class="recommendations-full-grid mt-20" id="recommendations-container">
            ${recommendations.length ? recommendations.map(renderFullRecommendationCard).join("") : `
                <div class="card full-width">
                    <div class="card-body empty-state">
                        <div class="empty-state-icon">✨</div>
                        <div class="empty-state-title">No Competency Deficits Detected!</div>
                        <div class="empty-state-description">Your skills currently meet or exceed all role requirements. Outstanding job!</div>
                    </div>
                </div>
            `}
        </div>
    `;

    // Setup filter tabs
    $$(".filter-tab-btn").forEach(btn => {
        btn.onclick = () => {
            $$(".filter-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.dataset.filter;

            const cards = $$(".rec-full-card");
            cards.forEach(card => {
                const cardPriority = card.dataset.priority.toLowerCase();
                const cardType = card.dataset.type.toLowerCase();

                if (filter === "all") {
                    card.style.display = "flex";
                } else if (filter === "high" && cardPriority === "high") {
                    card.style.display = "flex";
                } else if (filter === "medium" && cardPriority === "medium") {
                    card.style.display = "flex";
                } else if (filter === "course" && cardType === "course") {
                    card.style.display = "flex";
                } else if (filter === "learning_material" && cardType === "learning_material") {
                    card.style.display = "flex";
                } else {
                    card.style.display = "none";
                }
            });
        };
    });
}

function renderFullRecommendationCard(item) {
    const priority = item.priority || "Low";
    const isCourse = item.type === "course";

    return `
        <div class="rec-full-card card" data-priority="${priority}" data-type="${item.type}">
            <div class="rec-card-header">
                <div class="rec-type-tag ${isCourse ? "course" : "material"}">
                    ${isCourse ? "CURATED COURSE" : "AI LEARNING MATERIAL"}
                </div>
                <div class="rec-priority-badge ${priority.toLowerCase()}">
                    ${escapeHTML(priority)} Priority · Score: ${item.priority_score}
                </div>
            </div>

            <h3 class="rec-title mt-10">${escapeHTML(item.title || "Learning Resource")}</h3>

            <div class="rec-stats-row mt-12">
                <div class="rec-stat-col">
                    <span class="stat-meta-label">Target Skill:</span>
                    <span class="stat-meta-val">${escapeHTML(item.competency)}</span>
                </div>
                <div class="rec-stat-col">
                    <span class="stat-meta-label">Current Level:</span>
                    <span class="stat-meta-val current">${formatNumber(item.current_level)}%</span>
                </div>
                <div class="rec-stat-col">
                    <span class="stat-meta-label">Role Benchmark:</span>
                    <span class="stat-meta-val required">${formatNumber(item.required_level)}%</span>
                </div>
                <div class="rec-stat-col">
                    <span class="stat-meta-label">Gap:</span>
                    <span class="stat-meta-val gap">${formatNumber(item.gap)} pts</span>
                </div>
            </div>

            <div class="rec-reason-box mt-15">
                <div class="rec-reason-icon">💡</div>
                <p class="rec-reason-text">${escapeHTML(item.reason)}</p>
            </div>

            <div class="rec-card-actions mt-20">
                ${isCourse ? `
                    <button type="button" class="btn btn-primary" onclick="navigateTo('learning')">
                        Go to Course Curriculum →
                    </button>
                ` : `
                    <button type="button" class="btn btn-primary" onclick="navigateTo('assessments')">
                        Take Assessment on this Material →
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="navigateTo('learning')">
                        Read Material →
                    </button>
                `}
            </div>
        </div>
    `;
}
