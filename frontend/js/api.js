/* =========================================================
   KarmaSkill AI
   Backend API Service
   ========================================================= */


/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API = {

    BASE_URL: AppState.apiBaseUrl,


    /* =====================================================
       GENERIC REQUEST HANDLER
       ===================================================== */

    async request(endpoint, options = {}) {

        const url =
            `${this.BASE_URL}${endpoint}`;

        const config = {
            ...options,
            headers: {
                ...(options.headers || {})
            }
        };


        /*
         * Only set JSON content type when
         * we are NOT sending FormData.
         */
        if (!(options.body instanceof FormData)) {

            config.headers["Content-Type"] =
                "application/json";

        }


        try {

            const response =
                await fetch(url, config);


            /*
             * Try to read the response as JSON.
             */
            let data;

            try {

                data = await response.json();

            } catch {

                data = null;

            }


            /*
             * Backend returned an error.
             */
            if (!response.ok) {

                const message =
                    data?.detail ||
                    `Request failed with status ${response.status}`;

                throw new Error(message);

            }


            return data;

        } catch (error) {

            console.error(
                `API Error: ${endpoint}`,
                error
            );

            throw error;

        }

    },


    /* =====================================================
       EMPLOYEES
       ===================================================== */

    async getEmployees() {

        return this.request(
            "/employees/"
        );

    },


    async getEmployee(employeeId) {

        return this.request(
            `/employees/${employeeId}`
        );

    },


    async createEmployee(employeeData) {

        return this.request(
            "/employees/",
            {
                method: "POST",
                body: JSON.stringify(employeeData)
            }
        );

    },


    async getEmployeeGapAnalysis(employeeId) {

        return this.request(
            `/employees/${employeeId}/gap-analysis`
        );

    },


    /* =====================================================
       COMPETENCIES
       ===================================================== */

    async getCompetencies() {

        return this.request(
            "/competencies/"
        );

    },


    /* =====================================================
       ROLES
       ===================================================== */

    async getRoles() {

        return this.request(
            "/roles/"
        );

    },


    /* =====================================================
       ASSESSMENTS
       ===================================================== */

    async getEmployeeAssessments(employeeId) {

        return this.request(
            `/assessments/employee/${employeeId}`
        );

    },


    async createAssessment(assessmentData) {

        return this.request(
            "/assessments/",
            {
                method: "POST",
                body: JSON.stringify(assessmentData)
            }
        );

    },


    /* =====================================================
       RECOMMENDATIONS
       ===================================================== */

    async getEmployeeRecommendations(employeeId) {

        return this.request(
            `/recommendations/employee/${employeeId}`
        );

    },


    /* =====================================================
       LEARNING MATERIALS
       ===================================================== */


    /*
     * Preview a PDF.
     *
     * Does NOT save anything to database.
     */
    async analyzeMaterial(file) {

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );


        return this.request(
            "/materials/analyze",
            {
                method: "POST",
                body: formData
            }
        );

    },


    /*
     * Analyze PDF and save:
     *
     * - Learning Material
     * - Material Competencies
     * - Quiz
     * - Quiz Questions
     */
    async analyzeAndSaveMaterial(
        file,
        numberOfQuestions = 5
    ) {

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );


        return this.request(
            `/materials/analyze-and-save?number_of_questions=${numberOfQuestions}`,
            {
                method: "POST",
                body: formData
            }
        );

    },


    /*
     * Upload PDF without AI analysis.
     */
    async uploadMaterial(file) {

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );


        return this.request(
            "/materials/upload",
            {
                method: "POST",
                body: formData
            }
        );

    },


    /*
     * Generate quiz directly from PDF.
     *
     * This is mainly useful for testing.
     */
    async generateQuizFromPDF(
        file,
        numberOfQuestions = 5
    ) {

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );


        return this.request(
            `/materials/generate-quiz?number_of_questions=${numberOfQuestions}`,
            {
                method: "POST",
                body: formData
            }
        );

    },


    /* =====================================================
       COURSES
       ===================================================== */

    async getCourses() {
        return this.request("/courses/");
    },

    async getCourse(courseId) {
        return this.request(`/courses/${courseId}`);
    },

    /* =====================================================
       LEARNING MATERIALS
       ===================================================== */

    async getMaterials() {
        return this.request("/materials/");
    },

    async getLearningMaterial(materialId) {
        return this.request(`/materials/${materialId}`);
    },

    /* =====================================================
       QUIZZES
       ===================================================== */

    async getQuizzes() {
        return this.request("/quizzes/");
    },

    /*
     * Get employee-safe quiz.
     *
     * IMPORTANT:
     * The backend intentionally does NOT
     * return correct answers here.
     */
    async getQuiz(quizId) {
        return this.request(
            `/quizzes/${quizId}`
        );
    },


    /*
     * Submit quiz.
     */
    async submitQuiz(
        quizId,
        employeeId,
        answers
    ) {

        return this.request(
            `/quizzes/${quizId}/attempt`,
            {
                method: "POST",

                body: JSON.stringify({
                    employee_id: employeeId,
                    answers: answers
                })
            }
        );

    },


    /* =====================================================
       HEALTH CHECK
       ===================================================== */

    async healthCheck() {

        return this.request(
            "/health"
        );

    }

};


/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */


/**
 * Get the currently selected employee ID.
 *
 * Admin does not have an employee ID.
 */
function getCurrentEmployeeId() {

    const account =
        getActiveAccount();

    if (!account) {
        return null;
    }

    if (account.type !== "employee") {
        return null;
    }

    return account.id;

}


/**
 * Check whether the backend is available.
 */
async function checkBackendConnection() {

    try {

        await API.healthCheck();

        return true;

    } catch {

        return false;

    }

}


/**
 * Safely execute an API operation.
 *
 * This prevents repetitive try/catch blocks
 * throughout the frontend.
 */
async function safeApiCall(
    operation,
    errorMessage = "Something went wrong."
) {

    try {

        return await operation();

    } catch (error) {

        console.error(error);

        showToast(
            error.message || errorMessage,
            "error"
        );

        return null;

    }

}