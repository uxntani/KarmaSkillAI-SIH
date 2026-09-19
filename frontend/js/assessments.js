/* =========================================================
   KarmaSkill AI - Assessments Module
   ========================================================= */

let activeQuizSession = null;

async function renderAssessmentsPage() {
    const content = $("#appContent");
    if (!content) return;

    if (isAdmin()) {
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Assessments</h1>
                    <p class="page-subtitle">Assessments are tied to employee profiles. Please select an employee account from the top right to view and take assessments.</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">Employee Account Required</div>
                    <div class="empty-state-description">Switch to an employee account to take assessments or view assessment history.</div>
                </div>
            </div>
        `;
        return;
    }

    const employee = AppState.data.employee;
    const assessments = AppState.data.assessments || [];

    content.innerHTML = `
        <section class="initial-loading">
            <div class="loading-spinner"></div>
            <p>Loading assessments and available quizzes...</p>
        </section>
    `;

    try {
        const quizzes = await API.getQuizzes();
        AppState.data.quizzes = quizzes || [];

        const avgScore = assessments.length
            ? Math.round(assessments.reduce((sum, a) => sum + Number(a.percentage || 0), 0) / assessments.length)
            : 0;

        content.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title-row">
                        <span class="page-title-icon">▣</span>
                        <h1 class="page-title">Assessments & Quizzes</h1>
                    </div>
                    <p class="page-subtitle">
                        Test your competencies, take AI-generated quizzes from learning materials, and update your role qualification level.
                    </p>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="summary-grid">
                <div class="summary-card stat-primary">
                    <div class="summary-label">Available Quizzes</div>
                    <div class="summary-value">${quizzes.length}</div>
                    <div class="summary-description">Active competency tests</div>
                </div>
                <div class="summary-card stat-success">
                    <div class="summary-label">Completed Tests</div>
                    <div class="summary-value">${assessments.length}</div>
                    <div class="summary-description">Recorded assessments</div>
                </div>
                <div class="summary-card stat-purple">
                    <div class="summary-label">Average Score</div>
                    <div class="summary-value">${avgScore}%</div>
                    <div class="summary-description">Overall assessment proficiency</div>
                </div>
                <div class="summary-card stat-amber">
                    <div class="summary-label">Officer Profile</div>
                    <div class="summary-value" style="font-size:18px;margin-top:4px">${escapeHTML(employee ? employee.name : "Officer")}</div>
                    <div class="summary-description">${escapeHTML(employee ? employee.role : "")}</div>
                </div>
            </div>

            <!-- Available Quizzes Section -->
            <div class="section-container mt-25">
                <div class="section-header-row">
                    <div>
                        <h2 class="section-heading">Available Competency Quizzes</h2>
                        <p class="text-muted">Take an interactive quiz to validate your skills and automatically reduce your competency gaps.</p>
                    </div>
                </div>

                <div class="quizzes-grid mt-15">
                    ${quizzes.length ? quizzes.map(renderQuizCard).join("") : `
                        <div class="card full-width">
                            <div class="card-body empty-state">
                                <div class="empty-state-icon">📝</div>
                                <div class="empty-state-title">No Quizzes Available Yet</div>
                                <div class="empty-state-description">Upload a learning PDF in the Admin section to automatically generate AI quizzes.</div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <!-- Completed Assessments Section -->
            <div class="card mt-25">
                <div class="card-header">
                    <div>
                        <div class="card-title">Assessment History</div>
                        <div class="text-muted">Your past quiz scores and competency updates</div>
                    </div>
                </div>
                <div class="card-body">
                    ${assessments.length ? `
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Competency ID</th>
                                        <th>Questions</th>
                                        <th>Score</th>
                                        <th>Percentage</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${assessments.map(a => `
                                        <tr>
                                            <td><strong>#${a.id}</strong></td>
                                            <td><span class="competency-badge">Competency #${a.competency_id}</span></td>
                                            <td>${a.total_questions} questions</td>
                                            <td>${a.score} / ${a.total_questions}</td>
                                            <td>
                                                <div class="table-progress-cell">
                                                    <div class="progress-track sm">
                                                        <div class="progress-fill ${a.percentage >= 70 ? "success" : a.percentage >= 50 ? "amber" : "danger"}" style="width:${Math.min(a.percentage, 100)}%"></div>
                                                    </div>
                                                    <span class="table-progress-text">${formatNumber(a.percentage)}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="status-badge ${a.percentage >= 70 ? "high" : a.percentage >= 50 ? "medium" : "low"}">
                                                    ${a.percentage >= 70 ? "Proficient" : a.percentage >= 50 ? "Developing" : "Needs Work"}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <div class="empty-state-title">No Assessments Taken Yet</div>
                            <div class="empty-state-description">Click "Take Assessment" on any quiz above to test your skills!</div>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Attach event listeners to quiz buttons
        $$(".start-quiz-btn").forEach(btn => {
            btn.onclick = () => {
                const quizId = btn.dataset.quizId;
                startQuizSession(quizId);
            };
        });

    } catch (error) {
        showToast("Error loading quizzes: " + error.message, "error");
    }
}

function renderQuizCard(quiz) {
    return `
        <div class="quiz-card card">
            <div class="quiz-card-top">
                <span class="quiz-badge">AI GENERATED</span>
                <span class="quiz-questions-pill">
                    <strong>${quiz.number_of_questions}</strong> questions
                </span>
            </div>
            <h3 class="quiz-title">${escapeHTML(quiz.title)}</h3>
            <p class="quiz-material-source">
                Source: <span>${escapeHTML(quiz.material_title || "Learning Material")}</span>
            </p>
            ${quiz.competency ? `
                <div class="quiz-competency-row">
                    <span class="meta-label">Primary Skill:</span>
                    <span class="competency-pill">${escapeHTML(quiz.competency)}</span>
                </div>
            ` : ""}
            <div class="quiz-card-footer">
                <button type="button" class="btn btn-primary start-quiz-btn" data-quiz-id="${quiz.id}">
                    Take Assessment →
                </button>
            </div>
        </div>
    `;
}

async function startQuizSession(quizId) {
    setApplicationLoading(true);
    try {
        const quiz = await API.getQuiz(quizId);
        setApplicationLoading(false);

        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            showToast("This quiz does not have any questions.", "warning");
            return;
        }

        activeQuizSession = {
            quiz: quiz,
            currentIndex: 0,
            answers: {} // questionId -> selectedOption ("A", "B", "C", "D")
        };

        renderQuizModal();
    } catch (err) {
        setApplicationLoading(false);
        showToast("Failed to start quiz: " + err.message, "error");
    }
}

function renderQuizModal() {
    if (!activeQuizSession) return;

    const { quiz, currentIndex, answers } = activeQuizSession;
    const questions = quiz.questions;
    const currentQ = questions[currentIndex];
    const total = questions.length;
    const answeredCount = Object.keys(answers).length;

    const modalHTML = `
        <div class="quiz-modal-container">
            <!-- Progress Tracker -->
            <div class="quiz-progress-bar-wrapper">
                <div class="quiz-meta-header">
                    <span>Question ${currentIndex + 1} of ${total}</span>
                    <span>${answeredCount} answered</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width:${((currentIndex + 1) / total) * 100}%"></div>
                </div>
            </div>

            <!-- Question Box -->
            <div class="quiz-question-box mt-20">
                <div class="quiz-question-text">
                    ${escapeHTML(currentQ.question)}
                </div>
                ${currentQ.difficulty ? `<span class="difficulty-chip ${currentQ.difficulty.toLowerCase()}">${escapeHTML(currentQ.difficulty)}</span>` : ""}
            </div>

            <!-- Options Grid -->
            <div class="quiz-options-list mt-20">
                ${["A", "B", "C", "D"].map(optKey => {
                    const optText = currentQ.options[optKey];
                    if (!optText) return "";
                    const isSelected = answers[currentQ.id] === optKey;
                    return `
                        <button type="button" class="quiz-option-btn ${isSelected ? "selected" : ""}" data-key="${optKey}">
                            <span class="option-key-badge">${optKey}</span>
                            <span class="option-text">${escapeHTML(optText)}</span>
                        </button>
                    `;
                }).join("")}
            </div>

            <!-- Navigation Buttons -->
            <div class="quiz-footer-actions mt-25">
                <button type="button" class="btn btn-secondary" id="quiz-prev-btn" ${currentIndex === 0 ? "disabled" : ""}>
                    ← Previous
                </button>

                <div class="quiz-footer-right">
                    ${currentIndex < total - 1 ? `
                        <button type="button" class="btn btn-primary" id="quiz-next-btn">
                            Next Question →
                        </button>
                    ` : `
                        <button type="button" class="btn btn-success" id="quiz-submit-btn">
                            Submit Assessment ✓
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;

    openModal(`Assessment: ${escapeHTML(quiz.title)}`, modalHTML);

    // Bind option selection
    $$(".quiz-option-btn").forEach(btn => {
        btn.onclick = () => {
            const key = btn.dataset.key;
            activeQuizSession.answers[currentQ.id] = key;
            renderQuizModal();
        };
    });

    const prevBtn = $("#quiz-prev-btn");
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (activeQuizSession.currentIndex > 0) {
                activeQuizSession.currentIndex--;
                renderQuizModal();
            }
        };
    }

    const nextBtn = $("#quiz-next-btn");
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (activeQuizSession.currentIndex < total - 1) {
                activeQuizSession.currentIndex++;
                renderQuizModal();
            }
        };
    }

    const submitBtn = $("#quiz-submit-btn");
    if (submitBtn) {
        submitBtn.onclick = () => submitActiveQuiz();
    }
}

async function submitActiveQuiz() {
    if (!activeQuizSession) return;

    const { quiz, answers } = activeQuizSession;
    const questions = quiz.questions;
    const answeredCount = Object.keys(answers).length;

    if (answeredCount < questions.length) {
        const confirmed = confirm(`You have answered ${answeredCount} of ${questions.length} questions. Submit anyway?`);
        if (!confirmed) return;
    }

    const employeeId = getCurrentEmployeeId();
    if (!employeeId) {
        showToast("No employee selected.", "error");
        return;
    }

    // Format answers array for backend
    const formattedAnswers = questions.map(q => ({
        question_id: q.id,
        answer: answers[q.id] || "X"
    }));

    setApplicationLoading(true);

    try {
        const result = await API.submitQuiz(quiz.id, employeeId, formattedAnswers);
        setApplicationLoading(false);

        // Render Results Modal
        renderQuizResultsModal(result);

        // Reload employee profile & gap analysis in background
        await loadEmployeeData();

    } catch (err) {
        setApplicationLoading(false);
        showToast("Error submitting quiz: " + err.message, "error");
    }
}

function renderQuizResultsModal(result) {
    const res = result.result;
    const pct = res.percentage;
    const isPassing = pct >= 60;

    const resultHTML = `
        <div class="quiz-results-container">
            <div class="results-score-banner ${isPassing ? "passed" : "needs-work"}">
                <div class="results-badge-icon">${isPassing ? "🎉" : "📚"}</div>
                <h2 class="results-score-heading">${pct}% Score</h2>
                <p class="results-score-subheading">
                    You got <strong>${res.score}</strong> out of <strong>${res.total_questions}</strong> questions correct.
                </p>
                ${result.assessment_created ? `
                    <div class="results-notification">
                        ✓ Competency score automatically updated and synced with your role requirement!
                    </div>
                ` : ""}
            </div>

            <h3 class="mt-20" style="font-size:16px;font-weight:600">Question Review</h3>
            <div class="results-questions-review mt-10">
                ${result.question_results.map((qr, idx) => `
                    <div class="result-question-card ${qr.correct ? "correct" : "incorrect"}">
                        <div class="result-question-header">
                            <span class="result-number">#${idx + 1}</span>
                            <span class="result-status-tag ${qr.correct ? "correct" : "incorrect"}">
                                ${qr.correct ? "✓ Correct" : "✗ Incorrect"}
                            </span>
                        </div>
                        <div class="result-answers-row mt-5">
                            <span>Your Answer: <strong>${escapeHTML(qr.your_answer || "Not answered")}</strong></span>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div class="modal-footer-actions mt-25">
                <button type="button" class="btn btn-primary" id="results-close-btn">
                    Done & Refresh Dashboard
                </button>
            </div>
        </div>
    `;

    openModal("Assessment Results", resultHTML);

    const closeBtn = $("#results-close-btn");
    if (closeBtn) {
        closeBtn.onclick = () => {
            closeModal();
            renderAssessmentsPage();
        };
    }
}
