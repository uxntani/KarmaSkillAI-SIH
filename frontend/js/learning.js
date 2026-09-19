/* =========================================================
   KarmaSkill AI - Learning Hub Module
   ========================================================= */

async function renderLearningPage() {
    const content = $("#appContent");
    if (!content) return;

    content.innerHTML = `
        <section class="initial-loading">
            <div class="loading-spinner"></div>
            <p>Loading courses and learning materials...</p>
        </section>
    `;

    try {
        const [courses, materials] = await Promise.all([
            API.getCourses(),
            API.getMaterials()
        ]);

        AppState.data.courses = courses || [];
        AppState.data.materials = materials || [];

        content.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title-row">
                        <span class="page-title-icon">▢</span>
                        <h1 class="page-title">Learning Hub</h1>
                    </div>
                    <p class="page-subtitle">
                        Explore capacity-building courses and AI-analyzed government training materials aligned with your competencies.
                    </p>
                </div>
            </div>

            <!-- Summary Stats -->
            <div class="summary-grid">
                <div class="summary-card stat-primary">
                    <div class="summary-label">Seeded Courses</div>
                    <div class="summary-value">${courses.length}</div>
                    <div class="summary-description">Curated curriculum courses</div>
                </div>
                <div class="summary-card stat-amber">
                    <div class="summary-label">AI Learning Materials</div>
                    <div class="summary-value">${materials.length}</div>
                    <div class="summary-description">PDF documents ingested</div>
                </div>
                <div class="summary-card stat-success">
                    <div class="summary-label">Competencies Covered</div>
                    <div class="summary-value">5</div>
                    <div class="summary-description">Technical, Behavioural & Domain</div>
                </div>
                <div class="summary-card stat-purple">
                    <div class="summary-label">Mission Karmayogi</div>
                    <div class="summary-value" style="font-size:16px;margin-top:6px">Aligned</div>
                    <div class="summary-description">Rule-to-Role Framework</div>
                </div>
            </div>

            <!-- Filter Controls -->
            <div class="learning-filter-bar mt-25">
                <button type="button" class="filter-tab-btn active" data-filter="all">All Resources (${courses.length + materials.length})</button>
                <button type="button" class="filter-tab-btn" data-filter="courses">Courses (${courses.length})</button>
                <button type="button" class="filter-tab-btn" data-filter="materials">PDF Materials (${materials.length})</button>
            </div>

            <!-- Courses Section -->
            <div class="learning-section mt-20" id="courses-section">
                <div class="section-header-row">
                    <div>
                        <h2 class="section-heading">Curated Courses</h2>
                        <p class="text-muted">Structured learning programs designed to build core public service capabilities.</p>
                    </div>
                </div>

                <div class="courses-grid mt-15">
                    ${courses.length ? courses.map(renderCourseCard).join("") : `
                        <div class="card full-width">
                            <div class="card-body empty-state">
                                <div class="empty-state-icon">📚</div>
                                <div class="empty-state-title">No Courses Found</div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <!-- Learning Materials Section -->
            <div class="learning-section mt-30" id="materials-section">
                <div class="section-header-row">
                    <div>
                        <h2 class="section-heading">AI-Analyzed Learning Materials</h2>
                        <p class="text-muted">PDF guidelines and training resources processed with automated competency extraction.</p>
                    </div>
                </div>

                <div class="materials-grid mt-15">
                    ${materials.length ? materials.map(renderMaterialCard).join("") : `
                        <div class="card full-width">
                            <div class="card-body empty-state">
                                <div class="empty-state-icon">📄</div>
                                <div class="empty-state-title">No Learning Materials Ingested</div>
                                <div class="empty-state-description">Upload PDFs in the Admin section to analyze materials.</div>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Filter tab switching
        $$(".filter-tab-btn").forEach(btn => {
            btn.onclick = () => {
                $$(".filter-tab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const filter = btn.dataset.filter;

                const coursesSec = $("#courses-section");
                const materialsSec = $("#materials-section");

                if (filter === "all") {
                    if (coursesSec) coursesSec.style.display = "block";
                    if (materialsSec) materialsSec.style.display = "block";
                } else if (filter === "courses") {
                    if (coursesSec) coursesSec.style.display = "block";
                    if (materialsSec) materialsSec.style.display = "none";
                } else if (filter === "materials") {
                    if (coursesSec) coursesSec.style.display = "none";
                    if (materialsSec) materialsSec.style.display = "block";
                }
            };
        });

        // Bind course detail buttons
        $$(".view-course-btn").forEach(btn => {
            btn.onclick = () => {
                const courseId = Number(btn.dataset.courseId);
                const course = courses.find(c => c.id === courseId);
                if (course) showCourseModal(course);
            };
        });

        // Bind material read buttons
        $$(".read-material-btn").forEach(btn => {
            btn.onclick = () => {
                const materialId = Number(btn.dataset.materialId);
                const material = materials.find(m => m.id === materialId);
                if (material) showMaterialModal(material);
            };
        });

    } catch (err) {
        showToast("Error loading learning hub: " + err.message, "error");
    }
}

function renderCourseCard(course) {
    const diffClass = (course.difficulty || "beginner").toLowerCase();

    return `
        <div class="course-card card">
            <div class="course-card-top">
                <span class="difficulty-pill ${diffClass}">${escapeHTML(course.difficulty || "General")}</span>
                <span class="duration-pill">⏱ ${course.duration || 4} hours</span>
            </div>
            <h3 class="course-title">${escapeHTML(course.title)}</h3>
            <p class="course-description">${escapeHTML(course.description || "Comprehensive learning module.")}</p>

            <div class="course-competencies-list mt-15">
                <span class="meta-label">Competency Coverage:</span>
                ${course.competencies && course.competencies.length ? course.competencies.map(comp => `
                    <div class="course-comp-row">
                        <span class="comp-name">${escapeHTML(comp.competency_name)}</span>
                        <span class="comp-cov">${comp.coverage}%</span>
                    </div>
                `).join("") : `<span class="text-muted">General skill</span>`}
            </div>

            <div class="course-card-footer mt-20">
                <button type="button" class="btn btn-primary view-course-btn" data-course-id="${course.id}">
                    View Curriculum →
                </button>
            </div>
        </div>
    `;
}

function renderMaterialCard(material) {
    return `
        <div class="material-card card">
            <div class="material-card-top">
                <span class="file-type-pill">PDF DOCUMENT</span>
                <span class="pages-pill">📄 ${material.pages || 1} pages</span>
            </div>
            <h3 class="material-title">${escapeHTML(material.title)}</h3>
            <p class="material-filename">File: ${escapeHTML(material.filename)}</p>

            <div class="material-competencies mt-12">
                <span class="meta-label">AI Detected Skills:</span>
                <div class="tags-cluster mt-5">
                    ${material.competencies && material.competencies.length ? material.competencies.map(c => `
                        <span class="competency-pill">${escapeHTML(c.competency_name)} (${c.relevance}%)</span>
                    `).join("") : `<span class="text-muted">Analysis pending</span>`}
                </div>
            </div>

            <div class="material-card-footer mt-18">
                <button type="button" class="btn btn-secondary read-material-btn" data-material-id="${material.id}">
                    Read Document
                </button>
                ${material.quizzes && material.quizzes.length ? `
                    <button type="button" class="btn btn-primary" onclick="startQuizSession(${material.quizzes[0].id})">
                        Take Quiz (${material.quizzes[0].number_of_questions} Qs)
                    </button>
                ` : ""}
            </div>
        </div>
    `;
}

function showCourseModal(course) {
    const modalHTML = `
        <div class="course-detail-view">
            <div class="course-detail-header">
                <div class="course-meta-tags">
                    <span class="difficulty-pill ${(course.difficulty || "beginner").toLowerCase()}">${escapeHTML(course.difficulty || "Beginner")}</span>
                    <span class="duration-pill">⏱ ${course.duration || 4} Hours</span>
                </div>
                <p class="course-lead mt-10">${escapeHTML(course.description || "")}</p>
            </div>

            <h4 class="mt-20" style="font-size:15px;font-weight:600">Target Competencies & Syllabus</h4>
            <div class="curriculum-box mt-10">
                ${course.content ? `
                    <div class="content-block">
                        <p>${escapeHTML(course.content)}</p>
                    </div>
                ` : "<p class='text-muted'>Detailed module syllabus is accessible upon starting the course.</p>"}
            </div>

            <div class="competency-breakdown-box mt-20">
                <h4 style="font-size:14px;font-weight:600;margin-bottom:8px">Competency Impact</h4>
                ${course.competencies ? course.competencies.map(c => `
                    <div class="skill-row" style="margin-bottom:8px">
                        <div class="skill-name">${escapeHTML(c.competency_name)}</div>
                        <div class="progress-track" style="flex:1;margin:0 12px">
                            <div class="progress-fill" style="width:${c.coverage}%"></div>
                        </div>
                        <span class="skill-percentage">${c.coverage}% coverage</span>
                    </div>
                `).join("") : ""}
            </div>

            <div class="modal-footer-actions mt-25">
                <button type="button" class="btn btn-success" onclick="showToast('You have been enrolled in this course!', 'success'); closeModal();">
                    Enroll Now ✓
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Close
                </button>
            </div>
        </div>
    `;

    openModal(course.title, modalHTML);
}

async function showMaterialModal(material) {
    setApplicationLoading(true);
    try {
        const fullMat = await API.getLearningMaterial(material.id);
        setApplicationLoading(false);

        const modalHTML = `
            <div class="material-reader-view">
                <div class="material-meta-row">
                    <span><strong>Filename:</strong> ${escapeHTML(fullMat.filename)}</span>
                    <span><strong>Pages:</strong> ${fullMat.pages}</span>
                </div>

                <h4 class="mt-15" style="font-size:14px;font-weight:600">Extracted Document Text</h4>
                <div class="material-text-scroller mt-10">
                    <pre class="extracted-text-view">${escapeHTML(fullMat.extracted_text || "No extracted text available.")}</pre>
                </div>

                <div class="modal-footer-actions mt-20">
                    ${fullMat.quizzes && fullMat.quizzes.length ? `
                        <button type="button" class="btn btn-primary" onclick="closeModal(); startQuizSession(${fullMat.quizzes[0].id});">
                            Take Associated Assessment (${fullMat.quizzes[0].title}) →
                        </button>
                    ` : ""}
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        Close
                    </button>
                </div>
            </div>
        `;

        openModal(material.title, modalHTML);

    } catch (err) {
        setApplicationLoading(false);
        showToast("Error loading document text: " + err.message, "error");
    }
}
