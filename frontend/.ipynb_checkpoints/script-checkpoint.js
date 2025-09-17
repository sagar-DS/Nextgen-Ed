document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000';

    // --- State Management ---
    let capturedImageBlob = null; // Holds the image from the webcam
    
    // --- Element Selectors ---
    const getEl = (id) => document.getElementById(id);
    const workbenchTabBtn = document.querySelector('[data-tab="workbench"]');
    const graderTabBtn = document.querySelector('[data-tab="grader"]');
    const sidebarContent = getEl('sidebar-content');
    const generatedContentView = getEl('generated-content-view');
    const gradingResultsView = getEl('grading-results-view');
    const statusText = getEl('status-text');
    const webcamModal = getEl('webcam-modal');
    const videoElement = getEl('webcam-video');
    const captureBtn = getEl('capture-btn');
    const closeModalBtn = getEl('close-modal-btn');

    // --- UI Logic ---
    function updateStatus(message, isError = false, isLoading = false) {
        statusText.innerHTML = isLoading ? `<i class="fas fa-spinner fa-spin"></i> ${message}` : message;
        statusText.style.color = isError ? '#E53E3E' : '#2D3748';
    }

    // --- Webcam Logic ---
    async function startWebcam() {
        capturedImageBlob = null;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                videoElement.srcObject = stream;
                webcamModal.classList.remove('hidden');
            } catch (error) {
                updateStatus("Could not access webcam. Please grant permission.", true);
            }
        } else {
            updateStatus("Webcam access is not supported by your browser.", true);
        }
    }

    function stopWebcam() {
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        webcamModal.classList.add('hidden');
    }

    captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            capturedImageBlob = blob;
            const fileNameSpan = getEl('student-file-name');
            if (fileNameSpan) fileNameSpan.textContent = `webcam_capture.jpg`;
            getEl('student-sheet-file').value = ''; // Clear file input
            stopWebcam();
        }, 'image/jpeg');
    });

    closeModalBtn.addEventListener('click', stopWebcam);

    // --- RENDER FUNCTIONS FOR SIDEBAR ---
    function renderWorkbenchControls() {
        // Omitting for brevity as it's unchanged - your existing workbench code is fine.
        sidebarContent.innerHTML = `...`; // This should be the full HTML for the teacher workbench controls
    }

    function renderGraderControls() {
        sidebarContent.innerHTML = `
            <div id="grader-controls">
                <div class="form-group">
                    <label for="assignment-select">Select Assignment</label>
                    <select id="assignment-select"><option value="">-- Loading Assignments --</option></select>
                </div>
                <div class="form-group">
                    <label>Upload or Scan Student Answer Sheet</label>
                    <div class="file-input-wrapper">
                         <input type="file" id="student-sheet-file" accept="image/*,.pdf">
                         <label for="student-sheet-file" class="file-input-label"><i class="fas fa-upload"></i> <span id="student-file-name">Choose file...</span></label>
                    </div>
                    <button id="scan-btn" class="btn btn-secondary" style="margin-top: 8px;"><i class="fas fa-camera"></i> Scan with Webcam</button>
                </div>
                <button id="grade-btn" class="btn btn-primary"><i class="fas fa-award"></i> Grade Paper</button>
            </div>`;
        getEl('grade-btn').addEventListener('click', handleGrade);
        getEl('scan-btn').addEventListener('click', startWebcam);
        getEl('student-sheet-file').addEventListener('change', () => { 
            capturedImageBlob = null; // Clear any captured image if a file is chosen
            getEl('student-file-name').textContent = getEl('student-sheet-file').files[0]?.name || 'Choose file...'; 
        });
        populateAssignmentsDropdown();
    }
    
    async function handleGrade() {
        updateStatus('Grading student paper...', false, true);
        const assignment_name = getEl('assignment-select').value;
        const student_sheet_file = getEl('student-sheet-file').files[0];

        if (!assignment_name) { updateStatus('Please select an assignment.', true); return; }
        if (!student_sheet_file && !capturedImageBlob) { updateStatus('Please upload or scan a student sheet.', true); return; }
        
        const formData = new FormData();
        formData.append('assignment_name', assignment_name);
        
        // Use the captured image if it exists, otherwise use the uploaded file
        const fileToSend = capturedImageBlob ? new File([capturedImageBlob], "webcam_capture.jpg", { type: "image/jpeg" }) : student_sheet_file;
        formData.append('student_sheet', fileToSend);
        
    }

});
    async function populateAssignmentsDropdown() {
        try {
            const data = await fetchAPI('/assignments');
            assignmentSelect.innerHTML = '<option value="">-- Select an Assignment --</option>';
            data.assignments.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                assignmentSelect.appendChild(option);
            });
        } catch (error) {
            updateStatus('Failed to load assignments.', true);
        }
    }
    
    function switchTab(targetTab) {
        if (targetTab === 'workbench') {
            workbenchTabBtn.classList.add('active');
            graderTabBtn.classList.remove('active');
            workbenchControls.classList.remove('hidden');
            graderControls.classList.add('hidden');
            generatedContentView.classList.remove('hidden');
            gradingResultsView.classList.add('hidden');
        } else {
            workbenchTabBtn.classList.remove('active');
            graderTabBtn.classList.add('active');
            workbenchControls.classList.add('hidden');
            graderControls.classList.remove('hidden');
            generatedContentView.classList.add('hidden');
            gradingResultsView.classList.remove('hidden');
            populateAssignmentsDropdown();
        }
    }

    // --- API CALLS (now using fetchAPI) ---
    async function handleGenerate() {
        updateStatus('Generating content...', false, true);
        const sourceFile = sourceFileInput.files[0];
        if (!sourceFile) { updateStatus('Please upload a source file.', true); return; }
        const formData = new FormData();
        formData.append('source_file', sourceFile);
        
        try {
            const data = await fetchAPI('/generate-assignment', { method: 'POST', body: formData });
            generatedQuestionsOutput.value = data.questions;
            generatedAnswersOutput.value = data.answers;
            updateStatus('Content generated successfully!');
        } catch (error) { updateStatus(`Generation failed: ${error.message}`, true); }
    }
    
    async function handleRefine() {
        updateStatus('Refining content...', false, true);
        const feedback = feedbackInput.value;
        const previous_questions = generatedQuestionsOutput.value;
        const previous_answers = generatedAnswersOutput.value;
        if (!feedback || !previous_questions) { updateStatus('Nothing to refine.', true); return; }
        
        try {
            const data = await fetchAPI('/refine-content', {
                method: 'POST',
                body: JSON.stringify({ previous_questions, previous_answers, feedback })
            });
            generatedQuestionsOutput.value = data.questions;
            generatedAnswersOutput.value = data.answers;
            updateStatus('Content refined successfully!');
        } catch (error) { updateStatus(`Refinement failed: ${error.message}`, true); }
    }

    async function handleApprove() {
        updateStatus('Saving assignment...', false, true);
        const assignment_name = assignmentNameInput.value;
        const questions = generatedQuestionsOutput.value;
        const answers = generatedAnswersOutput.value;
        if (!assignment_name || !questions || !answers) { updateStatus('Cannot save empty content.', true); return; }

        try {
            const data = await fetchAPI('/save-assignment', {
                method: 'POST',
                body: JSON.stringify({ assignment_name, questions, answers })
            });
            updateStatus(data.message);
            populateAssignmentsDropdown();
        } catch (error) { updateStatus(`Save failed: ${error.message}`, true); }
    }

    async function handleGrade() {
        updateStatus('Grading student paper...', false, true);
        const assignment_name = assignmentSelect.value;
        const student_sheet = studentSheetInput.files[0];
        if (!assignment_name || !student_sheet) { updateStatus('Please select an assignment and upload a sheet.', true); return; }
        
        const formData = new FormData();
        formData.append('assignment_name', assignment_name);
        formData.append('student_sheet', student_sheet);
        
        try {
            const data = await fetchAPI('/grade-submission', { method: 'POST', body: formData });
            legibilityOutput.textContent = data.legibility_report;
            ocrOutput.value = data.ocr_text;
            fairnessOutput.textContent = data.fairness_check;
            
            const eval_data = data.evaluation;
            const rationale = eval_data && eval_data.details ? eval_data.details.Rationale : 'N/A';
            evaluationOutput.innerHTML = `
                <h3>Score: ${eval_data.marks || 'N/A'} / ${eval_data.max_marks || '100'}</h3>
                <p><strong>AI Rationale:</strong> ${rationale}</p>
                <p><strong>Feedback:</strong> ${eval_data.feedback || 'N/A'}</p>
                <p><strong>Key Concepts Missed:</strong> ${eval_data.key_concepts_missed || 'N/A'}</p>
            `;
            updateStatus('Grading complete!');
        } catch (error) { updateStatus(`Grading failed: ${error.message}`, true); }
    }

    // --- EVENT LISTENERS ---
    workbenchTabBtn.addEventListener('click', () => switchTab('workbench'));
    graderTabBtn.addEventListener('click', () => switchTab('grader'));
    generateBtn.addEventListener('click', handleGenerate);
    refineBtn.addEventListener('click', handleRefine);
    approveBtn.addEventListener('click', handleApprove);
    gradeBtn.addEventListener('click', handleGrade);
    sourceFileInput.addEventListener('change', () => { getEl('source-file-name').textContent = sourceFileInput.files[0]?.name || 'Choose a file...'; });
    studentSheetInput.addEventListener('change', () => { getEl('student-file-name').textContent = studentSheetInput.files[0]?.name || 'Choose an image...'; });
});