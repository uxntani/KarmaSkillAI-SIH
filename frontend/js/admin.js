/* =========================================================
   KarmaSkill AI - Administration Module
   ========================================================= */

let selectedUploadFile = null;

async function renderAdminPage() {
    const content = $("#appContent");
    if (!content) return;

    content.innerHTML = `
        <section class="initial-loading">
            <div class="loading-spinner"></div>
            <p>Loading administration portal...</p>
        </section>
    `;

    try {
        const [employees, materials, quizzes] = await Promise.all([
            API.getEmployees(),
            API.getMaterials(),
            API.getQuizzes()
        ]);

        AppState.data.employees = employees || [];
        AppState.data.materials = materials || [];
        AppState.data.quizzes = quizzes || [];

        content.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title-row">
                        <span class="page-title-icon">⚙</span>
                        <h1 class="page-title">Administration Portal</h1>
                    </div>
                    <p class="page-subtitle">
                        Manage civil servant records, upload training materials, and generate AI-driven competency quizzes using Google Gemini.
                    </p>
                </div>
            </div>

            <!-- Admin Stats -->
            <div class="summary-grid">
                <div class="summary-card stat-primary">
                    <div class="summary-label">Officers Registered</div>
                    <div class="summary-value">${employees.length}</div>
                    <div class="summary-description">Active employee profiles</div>
                </div>
                <div class="summary-card stat-amber">
                    <div class="summary-label">Ingested Materials</div>
                    <div class="summary-value">${materials.length}</div>
                    <div class="summary-description">PDF training resources</div>
                </div>
                <div class="summary-card stat-success">
                    <div class="summary-label">AI Quizzes Active</div>
                    <div class="summary-value">${quizzes.length}</div>
                    <div class="summary-description">Generated assessments</div>
                </div>
                <div class="summary-card stat-purple">
                    <div class="summary-label">Gemini AI Engine</div>
                    <div class="summary-value" style="font-size:17px;color:#10b981;margin-top:4px">● Active</div>
                    <div class="summary-description">Automated MCQ extraction</div>
                </div>
            </div>

            <!-- PDF Upload & AI Processing Card -->
            <div class="card mt-25">
                <div class="card-header">
                    <div>
                        <div class="card-title">Upload Learning Material (PDF) & Generate Quiz</div>
                        <div class="text-muted">Gemini extracts relevant competencies and automatically creates MCQs with explanations</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="upload-zone" id="pdf-drop-zone">
                        <div class="upload-icon">📄</div>
                        <h3 class="upload-title">Drag & Drop PDF Training Document</h3>
                        <p class="text-muted">or click to browse your computer (.pdf only)</p>
                        <input type="file" id="pdfFileInput" accept=".pdf" style="display:none">
                        <button type="button" class="btn btn-secondary mt-12" onclick="$('#pdfFileInput').click()">
                            Select PDF File
                        </button>
                    </div>

                    <div id="selected-file-info" class="selected-file-info mt-15 hidden">
                        <div class="file-name-row">
                            <span class="file-icon">📎</span>
                            <span id="selected-file-name" class="file-name">filename.pdf</span>
                            <span id="selected-file-size" class="file-size">(0 KB)</span>
                            <button type="button" class="btn-clear" id="clear-file-btn">×</button>
                        </div>

                        <div class="upload-options-row mt-15">
                            <label for="question-count-select" class="form-label">Number of AI Questions:</label>
                            <select id="question-count-select" class="form-select sm" style="width:120px">
                                <option value="3">3 Questions</option>
                                <option value="5" selected>5 Questions</option>
                                <option value="8">8 Questions</option>
                                <option value="10">10 Questions</option>
                            </select>

                            <button type="button" class="btn btn-primary" id="process-pdf-btn">
                                ✦ Analyze & Generate Quiz with AI
                            </button>
                        </div>
                    </div>

                    <div id="ai-processing-state" class="ai-processing-state mt-20 hidden">
                        <div class="loading-spinner"></div>
                        <h4 id="ai-processing-text" class="mt-10">Analyzing PDF and generating questions with Gemini...</h4>
                        <p class="text-muted">Extracting text, detecting competencies, and generating multiple choice questions...</p>
                    </div>

                    <div id="ai-results-container" class="mt-20 hidden"></div>
                </div>
            </div>

            <!-- Ingested Materials Table -->
            <div class="card mt-25">
                <div class="card-header">
                    <div>
                        <div class="card-title">Ingested Learning Materials & Linked Quizzes</div>
                        <div class="text-muted">All uploaded training documents in the KarmaSkill repository</div>
                    </div>
                </div>
                <div class="card-body">
                    ${materials.length ? `
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title / Filename</th>
                                        <th>Pages</th>
                                        <th>Detected Skills</th>
                                        <th>Associated Quiz</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${materials.map(m => `
                                        <tr>
                                            <td><strong>#${m.id}</strong></td>
                                            <td>
                                                <div class="table-title-cell">
                                                    <strong>${escapeHTML(m.title)}</strong>
                                                    <span class="text-muted" style="font-size:11px">${escapeHTML(m.filename)}</span>
                                                </div>
                                            </td>
                                            <td>${m.pages} pgs</td>
                                            <td>
                                                <div class="tags-cluster">
                                                    ${(m.competencies || []).map(c => `
                                                        <span class="competency-pill">${escapeHTML(c.competency_name)}</span>
                                                    `).join("")}
                                                </div>
                                            </td>
                                            <td>
                                                ${(m.quizzes || []).length ? `
                                                    <span class="badge-success">Quiz #${m.quizzes[0].id} (${m.quizzes[0].number_of_questions} Qs)</span>
                                                ` : `<span class="text-muted">None</span>`}
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-title">No Materials Ingested</div>
                        </div>
                    `}
                </div>
            </div>

            <!-- Registered Officers Table -->
            <div class="card mt-25">
                <div class="card-header">
                    <div>
                        <div class="card-title">Registered Civil Servants</div>
                        <div class="text-muted">Officers enrolled in the competency framework</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Department</th>
                                    <th>Role</th>
                                    <th>Experience</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${employees.map(e => `
                                    <tr>
                                        <td><strong>#${e.id}</strong></td>
                                        <td><strong>${escapeHTML(e.name)}</strong></td>
                                        <td>${escapeHTML(e.email)}</td>
                                        <td>${escapeHTML(e.department)}</td>
                                        <td><span class="role-pill">${escapeHTML(e.role)}</span></td>
                                        <td>${e.experience} yrs</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        setupUploadEvents();

    } catch (err) {
        showToast("Error loading admin: " + err.message, "error");
    }
}

function setupUploadEvents() {
    const fileInput = $("#pdfFileInput");
    const dropZone = $("#pdf-drop-zone");
    const infoBox = $("#selected-file-info");
    const nameEl = $("#selected-file-name");
    const sizeEl = $("#selected-file-size");
    const clearBtn = $("#clear-file-btn");
    const processBtn = $("#process-pdf-btn");

    if (!fileInput || !dropZone) return;

    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            showToast("Please upload a PDF file.", "warning");
            return;
        }

        selectedUploadFile = file;
        nameEl.textContent = file.name;
        sizeEl.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
        infoBox.classList.remove("hidden");
        dropZone.classList.add("has-file");
    }

    fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    };

    dropZone.ondragleave = () => {
        dropZone.classList.remove("drag-over");
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    if (clearBtn) {
        clearBtn.onclick = () => {
            selectedUploadFile = null;
            fileInput.value = "";
            infoBox.classList.add("hidden");
            dropZone.classList.remove("has-file");
        };
    }

    if (processBtn) {
        processBtn.onclick = async () => {
            if (!selectedUploadFile) {
                showToast("Please select a PDF file first.", "warning");
                return;
            }

            const countSelect = $("#question-count-select");
            const qCount = countSelect ? Number(countSelect.value) : 5;

            const processingState = $("#ai-processing-state");
            const resultsContainer = $("#ai-results-container");

            processingState.classList.remove("hidden");
            resultsContainer.classList.add("hidden");
            processBtn.disabled = true;

            try {
                const response = await API.analyzeAndSaveMaterial(selectedUploadFile, qCount);
                processingState.classList.add("hidden");
                processBtn.disabled = false;

                showToast("Learning material analyzed and quiz generated successfully!", "success");

                // Render AI output preview
                resultsContainer.classList.remove("hidden");
                resultsContainer.innerHTML = `
                    <div class="ai-success-banner mt-15">
                        <div class="success-icon">✓</div>
                        <div>
                            <h4>AI Ingestion Successful!</h4>
                            <p>Extracted ${response.material.pages} pages (${response.material.characters} characters). Primary Competency: <strong>${escapeHTML(response.primary_competency || "Technical")}</strong>.</p>
                        </div>
                    </div>

                    <div class="card mt-15">
                        <div class="card-header">
                            <div class="card-title">Generated Quiz: ${escapeHTML(response.quiz.title)}</div>
                        </div>
                        <div class="card-body">
                            <div class="generated-questions-preview">
                                ${response.quiz.questions.map((q, idx) => `
                                    <div class="gen-q-card mt-10">
                                        <div class="gen-q-header">
                                            <strong>Question ${idx + 1}:</strong> ${escapeHTML(q.question)}
                                        </div>
                                        <div class="gen-options-grid mt-5">
                                            <div class="gen-opt ${q.correct_answer === "A" ? "correct-opt" : ""}">A: ${escapeHTML(q.options.A)}</div>
                                            <div class="gen-opt ${q.correct_answer === "B" ? "correct-opt" : ""}">B: ${escapeHTML(q.options.B)}</div>
                                            <div class="gen-opt ${q.correct_answer === "C" ? "correct-opt" : ""}">C: ${escapeHTML(q.options.C)}</div>
                                            <div class="gen-opt ${q.correct_answer === "D" ? "correct-opt" : ""}">D: ${escapeHTML(q.options.D)}</div>
                                        </div>
                                        <div class="gen-exp mt-5">
                                            <em>Explanation:</em> ${escapeHTML(q.explanation || "")}
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    </div>
                `;

            } catch (error) {
                processingState.classList.add("hidden");
                processBtn.disabled = false;
                showToast("AI Processing Failed: " + error.message, "error");
            }
        };
    }
}
