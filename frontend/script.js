document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000';

    // --- State ---
    let capturedImageBlob = null;
    let isGradingInProgress = false;
    let initializationTimeouts = [];
    
    // --- Helpers ---
    const getEl = (id) => document.getElementById(id);
    function updateStatus(message, isError = false, isLoading = false) {
        console.log(`📢 updateStatus called: "${message}" (error: ${isError}, loading: ${isLoading})`);
        const statusText = getEl('status-text');
        if (statusText) {
            statusText.innerHTML = isLoading ? `<i class="fas fa-spinner fa-spin"></i> ${message}` : message;
            statusText.style.color = isError ? '#E53E3E' : '#2D3748';
        } else {
            console.error('❌ status-text element not found!');
        }
    }
    async function fetchAPI(path, options = {}) {
        const token = localStorage.getItem('access_token');
        const headers = new Headers(options.headers || {});
        if (options.body && typeof options.body === 'string') {
            headers.set('Content-Type', 'application/json');
        }
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        
        console.log(`🌐 Making API request to: ${API_BASE_URL}${path}`);
        console.log(`📋 Request options:`, { method: options.method || 'GET', headers: Object.fromEntries(headers) });
        
        const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
        console.log(`📡 Response status: ${res.status} ${res.statusText}`);
        console.log(`📋 Response headers:`, Object.fromEntries(res.headers.entries()));
        
        const data = await res.json().catch((error) => {
            console.error('❌ Failed to parse JSON response:', error);
            return {};
        });
        
        console.log(`📊 Parsed response data:`, data);
        
        if (!res.ok) {
            console.error(`❌ Request failed with status ${res.status}:`, data);
            throw new Error(data.detail || data.message || `Request failed: ${res.status}`);
        }
        
        console.log(`✅ API request successful`);
        return data;
    }

    // --- Auth Guard ---
    (function enforceAuth() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = 'login.html';
        }
    })();

    // --- Cache DOM ---
    const workbenchTabBtn = document.querySelector('[data-tab="workbench"]');
    const graderTabBtn = document.querySelector('[data-tab="grader"]');
    const workbenchControls = getEl('workbench-controls');
    const graderControls = getEl('grader-controls');
    const generatedContentView = getEl('generated-content-view');
    const gradingResultsView = getEl('grading-results-view');
    const webcamModal = getEl('webcam-modal');
    const videoElement = getEl('webcam-video');
    const captureBtn = getEl('capture-btn');
    const closeModalBtn = getEl('close-modal-btn');

    // Workbench inputs
    const sourceFileInput = getEl('source-file-input');
    const generateBtn = getEl('generate-btn');
    const feedbackInput = getEl('feedback-input');
    const refineBtn = getEl('refine-btn');
    const assignmentNameInput = getEl('assignment-name-input');
    const approveBtn = getEl('approve-btn');
    const modeGenerate = getEl('mode-generate');
    const modeUploadGen = getEl('mode-upload-gen');
    const modeUploadBoth = getEl('mode-upload-both');
    const wbSectionGenerate = getEl('wb-section-generate');
    const wbSectionUploadGen = getEl('wb-section-upload-gen');
    const wbSectionUploadBoth = getEl('wb-section-upload-both');
    const uploadAssignmentName = getEl('upload-assignment-name');
    const uploadQuestionPaper = getEl('upload-question-paper');
    const uploadReferenceAnswers = getEl('upload-reference-answers');
    const uploadAssignmentBtn = getEl('upload-assignment-btn');
    const generateAnswersFromUploadBtn = getEl('generate-answers-from-upload-btn');
    
    // New elements for enhanced upload modes
    const uploadSourceMaterial = getEl('upload-source-material');
    const scanQuestionPaperBtn = getEl('scan-question-paper-btn');
    const scanQuestionPaperBothBtn = getEl('scan-question-paper-both-btn');
    const scanReferenceAnswersBtn = getEl('scan-reference-answers-btn');
    const uploadRefineFeedback = getEl('upload-refine-feedback');
    const refineUploadAnswersBtn = getEl('refine-upload-answers-btn');
    const uploadAssignmentNameFinal = getEl('upload-assignment-name-final');
    const saveUploadAssignmentBtn = getEl('save-upload-assignment-btn');

    // Grader inputs
    const assignmentSelect = getEl('assignment-select');
    const studentSheetInput = getEl('student-sheet-file');
    const scanBtn = getEl('scan-btn');
    const gradeBtn = getEl('grade-btn');
    const classSelect = getEl('class-select');
    const studentSelect = getEl('student-select');
    const remarksInput = getEl('remarks-input');
    const refreshClassBtn = getEl('refresh-class-btn');
    const refreshStudentsBtn = getEl('refresh-students-btn');
    const refreshAssignmentsBtn = getEl('refresh-assignments-btn');

    // Outputs
    const generatedQuestionsOutput = getEl('generated-questions-output');
    const generatedAnswersOutput = getEl('generated-answers-output');
    const legibilityOutput = getEl('legibility-output');
    const fairnessOutput = getEl('fairness-output');
    const ocrOutput = getEl('ocr-output');
    const evaluationOutput = getEl('evaluation-output');
    
    // Debug: Check if DOM elements are found
    console.log('🔍 DOM Elements Check:', {
        legibilityOutput: !!legibilityOutput,
        fairnessOutput: !!fairnessOutput,
        ocrOutput: !!ocrOutput,
        evaluationOutput: !!evaluationOutput,
        gradeBtn: !!gradeBtn,
        graderTabBtn: !!graderTabBtn,
        gradingResultsView: !!gradingResultsView
    });
    
    // Test function to manually trigger grading results display
    window.testGradingResults = function() {
        console.log('🧪 Testing grading results display...');
        
        // Test DOM elements
        console.log('📋 DOM Elements:', {
            legibilityOutput: legibilityOutput,
            fairnessOutput: fairnessOutput,
            ocrOutput: ocrOutput,
            evaluationOutput: evaluationOutput
        });
        
        // Test populating results
        if (legibilityOutput) legibilityOutput.textContent = 'Test legibility report';
        if (fairnessOutput) fairnessOutput.textContent = 'Test fairness check';
        if (ocrOutput) ocrOutput.value = 'Test OCR text';
        if (evaluationOutput) evaluationOutput.innerHTML = '<h3>Test Score: 85 / 100</h3><p>Test evaluation</p>';
        
        // Test tab switching
        console.log('🔄 Testing tab switch to grader...');
        switchTab('grader');
        
        console.log('✅ Test completed');
    };
    
    // Debug function to test the complete grading flow
    window.debugGradingFlow = function() {
        console.log('🔍 DEBUGGING GRADING FLOW...');
        
        // Check current state
        console.log('📊 Current State:', {
            isGradingInProgress,
            currentTab: graderTabBtn.classList.contains('active') ? 'grader' : 'workbench',
            gradeBtnDisabled: gradeBtn?.disabled,
            assignmentSelected: assignmentSelect?.value,
            hasFile: !!studentSheetInput?.files?.[0],
            hasCapturedImage: !!capturedImageBlob
        });
        
        // Check if we're on the right tab
        if (!graderTabBtn.classList.contains('active')) {
            console.log('⚠️ Not on grader tab, switching...');
            switchTab('grader');
        }
        
        // Check if we have required data
        if (!assignmentSelect?.value) {
            console.log('❌ No assignment selected');
            return;
        }
        
        if (!studentSheetInput?.files?.[0] && !capturedImageBlob) {
            console.log('❌ No student sheet uploaded');
            return;
        }
        
        console.log('✅ All requirements met, ready for grading');
        console.log('🎯 Call handleGrade() to start grading process');
    };
    
    // Debug function to monitor tab switches
    window.monitorTabSwitches = function() {
        console.log('👁️ Starting tab switch monitoring...');
        
        // Override the original switchTab function to add monitoring
        const originalSwitchTab = switchTab;
        window.switchTab = function(target) {
            console.log(`🚨 TAB SWITCH DETECTED: ${target}`);
            console.trace('📍 Tab switch call stack:');
            
            // Check if this is happening during grading
            if (isGradingInProgress) {
                console.log('⚠️ WARNING: Tab switch detected during grading process!');
            }
            
            return originalSwitchTab(target);
        };
        
        console.log('✅ Tab switch monitoring active');
    };
    
    // Debug function to check for any automatic redirects or timers
    window.checkForTimers = function() {
        console.log('⏰ CHECKING FOR ACTIVE TIMERS...');
        
        // Check if there are any active timeouts or intervals
        const activeTimers = [];
        
        // This is a bit of a hack, but we can check if there are any pending timeouts
        const startTime = Date.now();
        setTimeout(() => {
            const endTime = Date.now();
            if (endTime - startTime > 10) {
                console.log('⚠️ Potential timer interference detected');
            }
        }, 0);
        
        console.log('✅ Timer check completed');
    };
    
    // Function to start tab monitoring after grading
    window.startTabMonitoring = function() {
        console.log('👁️ Starting AGGRESSIVE tab monitoring...');
        
        let monitoringInterval = setInterval(() => {
            const isGraderActive = graderTabBtn.classList.contains('active');
            const isWorkbenchActive = workbenchTabBtn.classList.contains('active');
            
            if (!isGraderActive && !isWorkbenchActive) {
                console.log('⚠️ No tab is active - this might indicate an issue');
            }
            
            // AGGRESSIVE: If we're supposed to be on grader tab but we're not, FORCE switch back
            if (isGradingInProgress && !isGraderActive) {
                console.log('🚨 CRITICAL: Grading in progress but not on grader tab! FORCING switch back...');
                // Force the tab switch without going through the normal function
                graderTabBtn.classList.add('active');
                workbenchTabBtn.classList.remove('active');
                graderControls.classList.remove('hidden');
                gradingResultsView.classList.remove('hidden');
                workbenchControls.classList.add('hidden');
                generatedContentView.classList.add('hidden');
                console.log('🔒 FORCED GRADER TAB ACTIVE');
            }
        }, 500); // Check every 500ms for more aggressive monitoring
        
        // Stop monitoring after 30 seconds
        setTimeout(() => {
            clearInterval(monitoringInterval);
            console.log('⏹️ Aggressive tab monitoring stopped');
        }, 30000);
        
        console.log('✅ Aggressive tab monitoring started for 30 seconds');
    };
    
    // Debug function to simulate a complete grading process
    window.simulateGrading = function() {
        console.log('🎭 SIMULATING COMPLETE GRADING PROCESS...');
        
        // Wait for assignments to load first
        setTimeout(() => {
            // Set up test data
            if (assignmentSelect && assignmentSelect.options.length > 1) {
                // Select the first available assignment (skip the default option)
                assignmentSelect.selectedIndex = 1;
                console.log(`📋 Selected assignment: ${assignmentSelect.value}`);
            } else {
                console.log('❌ No assignments available in dropdown');
                return;
            }
            
            if (studentSheetInput) {
                // Create a fake file for testing
                const fakeFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
                Object.defineProperty(studentSheetInput, 'files', {
                    value: [fakeFile],
                    writable: false
                });
                console.log('📋 Test file set up');
            }
            
            console.log('📋 Test data set up, calling handleGrade...');
            
            // Call the actual grading function
            handleGrade();
        }, 1000); // Wait 1 second for assignments to load
    };
    
    // Debug function to check available assignments
    window.checkAssignments = function() {
        console.log('📋 CHECKING AVAILABLE ASSIGNMENTS...');
        
        if (assignmentSelect) {
            console.log(`📊 Assignment dropdown has ${assignmentSelect.options.length} options:`);
            for (let i = 0; i < assignmentSelect.options.length; i++) {
                const option = assignmentSelect.options[i];
                console.log(`  ${i}: "${option.value}" - "${option.textContent}"`);
            }
            console.log(`📌 Currently selected: "${assignmentSelect.value}"`);
        } else {
            console.log('❌ Assignment select element not found');
        }
    };
    
    // Debug function to manually refresh assignments
    window.refreshAssignments = function() {
        console.log('🔄 Manually refreshing assignments...');
        populateAssignmentsDropdown();
    };

    // Profile dropdown elements
    const profileAvatarBtn = getEl('profile-avatar-btn');
    const profileDropdown = getEl('profile-dropdown');
    const dropdownEmail = getEl('dropdown-email');
    const dropdownClassName = getEl('dropdown-class-name');
    const dropdownFullName = getEl('dropdown-full-name');
    const dropdownClassInput = getEl('dropdown-class-input');
    const dropdownSaveBtn = getEl('dropdown-save-btn');
    const openProfileTabBtn = getEl('open-profile-tab-btn');
    const logoutBtn = getEl('logout-btn');
    const manageClassesBtn = getEl('manage-classes-btn');
    const classesModal = getEl('classes-modal');
    const closeClassesModalBtn = getEl('close-classes-modal-btn');
    const newClassName = getEl('new-class-name');
    const newClassSection = getEl('new-class-section');
    const createClassBtn = getEl('create-class-btn');
    const manageClassSelect = getEl('manage-class-select');
    const manageStudentsList = getEl('manage-students-list');
    const bulkStudentsText = getEl('bulk-students-text');
    const bulkAddBtn = getEl('bulk-add-btn');
    const openVaultBtn = getEl('open-vault-btn');
    const vaultModal = getEl('vault-modal');
    const vaultPassword = getEl('vault-password');
    const vaultAuthBtn = getEl('vault-auth-btn');
    const vaultAuthSection = getEl('vault-auth-section');
    const vaultContent = getEl('vault-content');
    const closeVaultModalBtn = getEl('close-vault-modal-btn');
    const vaultAssignments = getEl('vault-assignments');
    const vaultClasses = getEl('vault-classes');
    const vaultSubmissions = getEl('vault-submissions');

    // --- Tabs ---
    function switchTab(target) {
        console.log(`🔄 Switching to tab: ${target}`);
        console.trace('📍 switchTab called from:'); // This will show the call stack
        
        // AGGRESSIVE PROTECTION: During grading, ONLY allow grader tab
        if (isGradingInProgress) {
            if (target === 'grader') {
                console.log('✅ Allowing switch to grader tab during grading');
            } else {
                console.log('🚫 BLOCKING ALL TAB SWITCHES DURING GRADING - STAYING ON GRADER TAB');
                return;
            }
        }
        
        // Prevent switching away from grader tab during grading
        if (isGradingInProgress && target === 'workbench') {
            console.log('⚠️ Blocking switch to workbench during grading process');
            return;
        }
        
        // Additional protection: if we're on grader tab and trying to switch to workbench, check if grading just completed
        if (target === 'workbench' && graderTabBtn.classList.contains('active')) {
            console.log('⚠️ Attempting to switch from grader to workbench - checking if this is safe');
            // Allow the switch only if grading is not in progress
            if (isGradingInProgress) {
                console.log('❌ Blocking switch - grading still in progress');
                return;
            }
        }
        
        const isWorkbench = target === 'workbench';
        const isGrader = target === 'grader';

        workbenchTabBtn.classList.toggle('active', isWorkbench);
        graderTabBtn.classList.toggle('active', isGrader);

        workbenchControls.classList.toggle('hidden', !isWorkbench);
        generatedContentView.classList.toggle('hidden', !isWorkbench);

        graderControls.classList.toggle('hidden', !isGrader);
        gradingResultsView.classList.toggle('hidden', !isGrader);
        
        console.log(`✅ Tab switched to: ${target}`, {
            workbenchActive: isWorkbench,
            graderActive: isGrader,
            graderControlsHidden: graderControls.classList.contains('hidden'),
            gradingResultsHidden: gradingResultsView.classList.contains('hidden')
        });

        if (isGrader) {
            // Always refresh assignments when switching to grader tab to show latest assignments
            console.log('🔄 Switching to grader tab - refreshing assignments and classes');
            populateAssignmentsDropdown();
            
            if (classSelect) {
                populateClasses();
                studentSelect.innerHTML = '<option value="">-- Select Class First --</option>';
                studentSelect.disabled = true;
                refreshStudentsBtn.disabled = true;
            }
        }
    }

    // --- Webcam ---
    async function startWebcam(uploadType = 'student-sheet') {
        capturedImageBlob = null;
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            updateStatus('Webcam access is not supported by your browser.', true);
            return;
        }
        
        // Store the upload type for later use
        window.currentWebcamUploadType = uploadType;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                videoElement.srcObject = stream;
                webcamModal.classList.remove('hidden');
            
            // Update modal title based on upload type
            const modalTitle = getEl('webcam-modal-title');
            if (modalTitle) {
                switch(uploadType) {
                    case 'question-paper':
                        modalTitle.textContent = 'Scan Question Paper';
                        break;
                    case 'question-paper-both':
                        modalTitle.textContent = 'Scan Question Paper';
                        break;
                    case 'reference-answers':
                        modalTitle.textContent = 'Scan Reference Answers';
                        break;
                    default:
                        modalTitle.textContent = 'Scan Student Answer Sheet';
                }
            }
        } catch (e) {
            updateStatus('Could not access webcam. Please grant permission.', true);
        }
    }

    // --- Profile ---
    const profileEmail = null; // removed left-side profile panel
    const profileFullName = null;
    const profileClassName = null;
    const profileSaveBtn = null;
    const profileAssignments = null;
    const profileSubmissions = null;

    async function loadProfile() {
        updateStatus('Loading profile...', false, true);
        try {
            const data = await fetchAPI('/me');
            // Left panel removed; only update dropdown
            if (dropdownEmail) dropdownEmail.textContent = data.email || '-';
            if (dropdownFullName) dropdownFullName.value = data.profile?.full_name || '';
            if (dropdownClassInput) dropdownClassInput.value = data.profile?.class_name || '';
            if (dropdownClassName) dropdownClassName.textContent = data.profile?.class_name || '-';
            updateStatus('Profile loaded.');
        } catch (e) {
            updateStatus(`Failed to load profile: ${e.message}`, true);
        }
    }

    async function saveProfile() {
        updateStatus('Saving profile...', false, true);
        try {
            await fetchAPI('/me', {
                method: 'POST',
                body: JSON.stringify({ full_name: (dropdownFullName?.value) || '', class_name: (dropdownClassInput?.value) || '' })
            });
            updateStatus('Profile saved.');
            loadProfile();
        } catch (e) {
            updateStatus(`Failed to save profile: ${e.message}`, true);
        }
    }

    // Profile dropdown events
    if (profileAvatarBtn && profileDropdown) {
        profileAvatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('open');
            profileDropdown.classList.toggle('hidden', false);
            loadProfile();
        });
        // Close on outside click
        document.addEventListener('click', (e) => {
            const withinAvatar = profileAvatarBtn.contains(e.target);
            const withinDropdown = profileDropdown.contains(e.target);
            if (!withinAvatar && !withinDropdown) {
                profileDropdown.classList.remove('open');
            }
        });
    }
    if (dropdownSaveBtn) dropdownSaveBtn.addEventListener('click', saveProfile);
    if (openProfileTabBtn) openProfileTabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.add('open');
        profileDropdown.classList.remove('hidden');
        loadProfile();
    });
    if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.removeItem('access_token'); window.location.href = 'login.html'; });

    // --- Classes modal ---
    function openClassesModal() {
        classesModal.classList.remove('hidden');
    }
    function closeClassesModal() {
        classesModal.classList.add('hidden');
    }
    if (manageClassesBtn) manageClassesBtn.addEventListener('click', async () => {
        openClassesModal();
        await refreshManageClasses();
    });
    if (closeClassesModalBtn) closeClassesModalBtn.addEventListener('click', closeClassesModal);

    async function refreshManageClasses() {
        manageClassSelect.innerHTML = '<option value="">-- Select a Class --</option>';
        try {
            const classes = await fetchAPI('/classes');
            classes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.section ? `${c.name} - ${c.section}` : c.name;
                manageClassSelect.appendChild(opt);
            });
        } catch (e) { updateStatus('Failed to load classes.', true); }
        manageStudentsList.innerHTML = '';
    }

    async function refreshStudentsList(classId) {
        manageStudentsList.innerHTML = '';
        try {
            const students = await fetchAPI(`/classes/${classId}/students`);
            if (!students.length) {
                manageStudentsList.innerHTML = '<li>No students yet.</li>';
                return;
            }
            students.forEach(s => {
                const li = document.createElement('li');
                li.textContent = s.roll_number ? `${s.roll_number} - ${s.name}` : s.name;
                manageStudentsList.appendChild(li);
            });
        } catch (e) { updateStatus('Failed to load students.', true); }
    }

    if (createClassBtn) createClassBtn.addEventListener('click', async () => {
        const name = newClassName.value.trim();
        const section = newClassSection.value.trim();
        if (!name) { updateStatus('Please provide a class name.', true); return; }
        try {
            await fetchAPI('/classes', { method: 'POST', body: JSON.stringify({ name, section: section || null }) });
            newClassName.value = '';
            newClassSection.value = '';
            await refreshManageClasses();
            updateStatus('Class created.');
            await populateClasses();
        } catch (e) { updateStatus(`Failed to create class: ${e.message}`, true); }
    });

    if (manageClassSelect) manageClassSelect.addEventListener('change', async () => {
        const cid = manageClassSelect.value;
        if (!cid) { manageStudentsList.innerHTML = ''; return; }
        await refreshStudentsList(cid);
    });

    if (bulkAddBtn) bulkAddBtn.addEventListener('click', async () => {
        const cid = manageClassSelect.value;
        if (!cid) { updateStatus('Select a class first.', true); return; }
        const lines = bulkStudentsText.value.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) { updateStatus('Provide at least one student line.', true); return; }
        const students = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            return { name: parts[0] || '', email: parts[1] || null, roll_number: parts[2] || null };
        }).filter(s => s.name);
        try {
            await fetchAPI(`/classes/${cid}/students`, { method: 'POST', body: JSON.stringify(students) });
            bulkStudentsText.value = '';
            await refreshStudentsList(cid);
            await populateStudentsForClass(cid);
            updateStatus('Students added.');
        } catch (e) { updateStatus(`Failed to add students: ${e.message}`, true); }
    });

    // --- Vault (re-auth) ---
    function openVault() {
        vaultModal.classList.remove('hidden');
        vaultAuthSection.classList.remove('hidden');
        vaultContent.classList.add('hidden');
        vaultPassword.value = '';
    }
    function closeVault() {
        vaultModal.classList.add('hidden');
    }
    if (openVaultBtn) openVaultBtn.addEventListener('click', openVault);
    if (closeVaultModalBtn) closeVaultModalBtn.addEventListener('click', closeVault);
    if (vaultAuthBtn) vaultAuthBtn.addEventListener('click', async () => {
        const pwd = vaultPassword.value;
        if (!pwd) { updateStatus('Enter your password.', true); return; }
        const form = new FormData();
        form.append('password', pwd);
        try {
            await fetchAPI('/verify-password', { method: 'POST', body: form });
            await loadVaultData();
            vaultAuthSection.classList.add('hidden');
            vaultContent.classList.remove('hidden');
        } catch (e) { updateStatus(`Unlock failed: ${e.message}`, true); }
    });

    async function loadVaultData() {
        const data = await fetchAPI('/me/dashboard');
        // Assignments
        vaultAssignments.innerHTML = '';
        (data.assignments || []).forEach(a => {
            const li = document.createElement('li');
            li.textContent = a.name;
            if (a.reference_answers_path) {
                const span = document.createElement('span');
                span.style.color = '#64748B';
                span.style.marginLeft = '6px';
                span.textContent = '(with reference answers)';
                li.appendChild(span);
            }
            vaultAssignments.appendChild(li);
        });
        // Classes
        vaultClasses.innerHTML = '';
        (data.classes || []).forEach(c => {
            const li = document.createElement('li');
            li.textContent = c.section ? `${c.name} - ${c.section}` : c.name;
            if (c.students?.length) {
                const ul = document.createElement('ul');
                c.students.forEach(s => {
                    const sli = document.createElement('li');
                    sli.textContent = s.roll_number ? `${s.roll_number} - ${s.name}` : s.name;
                    ul.appendChild(sli);
                });
                li.appendChild(ul);
            }
            vaultClasses.appendChild(li);
        });
        // Submissions
        vaultSubmissions.innerHTML = '';
        (data.submissions || []).forEach(s => {
            const li = document.createElement('li');
            const scoreStr = `${s.score ?? 'N/A'}/${s.max_score ?? 'N/A'}`;
            li.textContent = `${s.assignment_name} — ${scoreStr}` + (s.remarks ? ` — ${s.remarks}` : '');
            vaultSubmissions.appendChild(li);
        });
    }
    function stopWebcam() {
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(t => t.stop());
        }
        webcamModal.classList.add('hidden');
    }
    captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) return;
            capturedImageBlob = blob;
            
            // Update the appropriate file input based on upload type
            const uploadType = window.currentWebcamUploadType || 'student-sheet';
            let nameSpan, fileInput;
            
            switch(uploadType) {
                case 'question-paper':
                    nameSpan = getEl('upload-question-paper-name');
                    fileInput = getEl('upload-question-paper');
                    break;
                case 'question-paper-both':
                    nameSpan = getEl('upload-question-paper-name-both');
                    fileInput = getEl('upload-question-paper-both');
                    break;
                case 'reference-answers':
                    nameSpan = getEl('upload-reference-answers-name');
                    fileInput = getEl('upload-reference-answers');
                    break;
                default: // student-sheet
                    nameSpan = getEl('student-file-name');
                    fileInput = getEl('student-sheet-file');
            }
            
            if (nameSpan) nameSpan.textContent = 'webcam_capture.jpg';
            if (fileInput) fileInput.value = '';
            stopWebcam();
        }, 'image/jpeg');
    });
    closeModalBtn.addEventListener('click', stopWebcam);

    // --- Data ---
    async function populateAssignmentsDropdown() {
        console.log('🔄 populateAssignmentsDropdown called');
        console.trace('📍 populateAssignmentsDropdown called from:');
        try {
            const data = await fetchAPI('/assignments');
            assignmentSelect.innerHTML = '<option value="">-- Select an Assignment --</option>';
            (data.assignments || []).forEach((name) => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                assignmentSelect.appendChild(option);
            });
            console.log(`✅ populateAssignmentsDropdown completed successfully - loaded ${(data.assignments || []).length} assignments`);
        } catch (e) {
            console.error('❌ populateAssignmentsDropdown failed:', e);
            updateStatus('Failed to load assignments.', true);
        }
    }
    
    async function populateClasses() {
        try {
            updateStatus('Loading classes...', false, true);
            const data = await fetchAPI('/classes');
            classSelect.innerHTML = '<option value="">-- Select a Class --</option>';
            if (data && data.length > 0) {
                data.forEach((c) => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = c.section ? `${c.name} - ${c.section}` : c.name;
                    classSelect.appendChild(option);
                });
                updateStatus(`Loaded ${data.length} classes.`);
        } else {
                classSelect.innerHTML = '<option value="">-- No classes found --</option>';
                updateStatus('No classes found. Create one in Manage Classes.');
            }
        } catch (e) {
            updateStatus(`Failed to load classes: ${e.message}`, true);
            classSelect.innerHTML = '<option value="">-- Error loading classes --</option>';
        }
    }

    async function populateStudentsForClass(classId) {
        console.log('=== STUDENT SELECTION DEBUG ===');
        console.log('Class ID:', classId);
        console.log('Student select element:', studentSelect);
        
        try {
            updateStatus('Loading students...', false, true);
            console.log('Making API call to:', `/classes/${classId}/students`);
            
            const data = await fetchAPI(`/classes/${classId}/students`);
            console.log('API Response:', data);
            
            // Clear and populate options
            studentSelect.innerHTML = '<option value="">-- Select a Student --</option>';
            
            if (data && data.length > 0) {
                data.forEach((s, index) => {
                    const option = document.createElement('option');
                    option.value = s.id;
                    option.textContent = s.roll_number ? `${s.roll_number} - ${s.name}` : s.name;
                    studentSelect.appendChild(option);
                    console.log(`Added student ${index + 1}:`, s.name);
                });
                updateStatus(`Loaded ${data.length} students.`);
            } else {
                studentSelect.innerHTML = '<option value="">-- No students found --</option>';
                updateStatus('No students found for this class.');
            }
            
            // NUCLEAR OPTION: Force enable the select
            console.log('BEFORE ENABLING - Student select state:', {
                disabled: studentSelect.disabled,
                style: studentSelect.style.cssText,
                className: studentSelect.className
            });
            
            // Remove all disabling attributes and styles
            studentSelect.disabled = false;
            studentSelect.removeAttribute('disabled');
            studentSelect.removeAttribute('readonly');
            studentSelect.classList.remove('disabled', 'readonly');
            
            // Force enable with inline styles
            studentSelect.style.cssText = `
                pointer-events: auto !important;
                opacity: 1 !important;
                cursor: pointer !important;
                visibility: visible !important;
                display: block !important;
                background-color: white !important;
                color: black !important;
            `;
            
            // Enable refresh button
            refreshStudentsBtn.disabled = false;
            
            console.log('AFTER ENABLING - Student select state:', {
                disabled: studentSelect.disabled,
                style: studentSelect.style.cssText,
                className: studentSelect.className
            });
            
            // Test clickability
            studentSelect.onclick = () => {
                console.log('🎉 STUDENT SELECT CLICKED!');
            };
            
            studentSelect.onfocus = () => {
                console.log('🎉 STUDENT SELECT FOCUSED!');
            };
            
            // Force focus
            setTimeout(() => {
                studentSelect.focus();
                console.log('Forced focus on student select');
            }, 50);
            
        } catch (e) {
            console.error('❌ ERROR loading students:', e);
            updateStatus(`Failed to load students: ${e.message}`, true);
            studentSelect.innerHTML = '<option value="">-- Error loading students --</option>';
            studentSelect.disabled = true;
            refreshStudentsBtn.disabled = true;
        }
        
        console.log('=== END STUDENT SELECTION DEBUG ===');
    }

    // --- Actions ---
    async function handleGenerate() {
        updateStatus('Generating content...', false, true);
        const sourceFile = sourceFileInput.files[0];
        if (!sourceFile) { updateStatus('Please upload a source file.', true); return; }
        const formData = new FormData();
        formData.append('source_file', sourceFile);
        try {
            const data = await fetchAPI('/generate-assignment', { method: 'POST', body: formData });
            generatedQuestionsOutput.value = data.questions || '';
            generatedAnswersOutput.value = data.answers || '';
            updateStatus('Content generated successfully!');
        } catch (e) { updateStatus(`Generation failed: ${e.message}`, true); }
    }
    async function handleRefine() {
        updateStatus('Refining content...', false, true);
        const previous_questions = generatedQuestionsOutput.value;
        const previous_answers = generatedAnswersOutput.value;
        const feedback = feedbackInput.value;
        if (!previous_questions) { updateStatus('Nothing to refine.', true); return; }
        try {
            const data = await fetchAPI('/refine-content', { method: 'POST', body: JSON.stringify({ previous_questions, previous_answers, feedback }) });
            generatedQuestionsOutput.value = data.questions || '';
            generatedAnswersOutput.value = data.answers || '';
            updateStatus('Content refined successfully!');
        } catch (e) { updateStatus(`Refinement failed: ${e.message}`, true); }
    }
    async function handleApprove() {
        updateStatus('Saving assignment...', false, true);
        const assignment_name = assignmentNameInput.value.trim();
        const questions = generatedQuestionsOutput.value;
        const answers = generatedAnswersOutput.value;
        if (!assignment_name || !questions || !answers) { updateStatus('Cannot save empty content.', true); return; }
        try {
            const data = await fetchAPI('/save-assignment', { method: 'POST', body: JSON.stringify({ assignment_name, questions, answers }) });
            updateStatus(data.message || 'Assignment saved.');
            populateAssignmentsDropdown();
        } catch (e) { updateStatus(`Save failed: ${e.message}`, true); }
    }

    async function handleUploadAssignmentAssets() {
        const name = (uploadAssignmentName?.value || '').trim();
        const qp = uploadQuestionPaper?.files?.[0];
        const ref = uploadReferenceAnswers?.files?.[0] || null;
        if (!name || !qp) { updateStatus('Assignment name and question paper are required.', true); return; }
        const form = new FormData();
        form.append('assignment_name', name);
        form.append('question_paper', qp);
        if (ref) form.append('reference_answers', ref);
        try {
            updateStatus('Uploading assignment files...', false, true);
            await fetchAPI('/upload-assignment-assets', { method: 'POST', body: form });
            updateStatus('Files uploaded and assignment recorded.');
            
            // Refresh assignments dropdown to show the new assignment
            await populateAssignmentsDropdown();
        } catch (e) { updateStatus(`Upload failed: ${e.message}`, true); }
    }

    async function handleGenerateAnswersFromUpload() {
        const qp = uploadQuestionPaper?.files?.[0];
        if (!qp) { updateStatus('Select a question paper file first.', true); return; }
        
        const form = new FormData();
        form.append('question_paper', qp);
        
        // Add source material if provided
        const sourceMaterial = uploadSourceMaterial?.files?.[0];
        if (sourceMaterial) {
            form.append('source_material', sourceMaterial);
            updateStatus('Generating answers with source material...', false, true);
        } else {
            updateStatus('Generating answers from question paper...', false, true);
        }
        
        try {
            const data = await fetchAPI('/generate-answers-from-upload', { method: 'POST', body: form });
            generatedAnswersOutput.value = data.answers || '';
            if (!generatedQuestionsOutput.value) generatedQuestionsOutput.value = data.questions || '';
            updateStatus('Answers generated successfully!');
        } catch (e) { updateStatus(`Generation failed: ${e.message}`, true); }
    }
    
    async function handleRefineUploadAnswers() {
        const feedback = uploadRefineFeedback?.value?.trim();
        if (!feedback) { updateStatus('Please provide refinement feedback.', true); return; }
        
        const qp = uploadQuestionPaper?.files?.[0];
        if (!qp) { updateStatus('Question paper is required for refinement.', true); return; }
        
        const form = new FormData();
        form.append('question_paper', qp);
        form.append('feedback', feedback);
        
        // Add source material if provided
        const sourceMaterial = uploadSourceMaterial?.files?.[0];
        if (sourceMaterial) {
            form.append('source_material', sourceMaterial);
        }
        
        try {
            updateStatus('Refining answers with your feedback...', false, true);
            const data = await fetchAPI('/refine-answers-from-upload', { method: 'POST', body: form });
            generatedAnswersOutput.value = data.answers || '';
            if (!generatedQuestionsOutput.value) generatedQuestionsOutput.value = data.questions || '';
            updateStatus('Answers refined successfully!');
        } catch (e) { updateStatus(`Refinement failed: ${e.message}`, true); }
    }
    
    async function handleSaveUploadAssignment() {
        const assignmentName = uploadAssignmentNameFinal?.value?.trim();
        if (!assignmentName) { updateStatus('Please enter an assignment name.', true); return; }
        
        const questions = generatedQuestionsOutput?.value?.trim();
        const answers = generatedAnswersOutput?.value?.trim();
        
        if (!questions && !answers) { updateStatus('No content to save. Please generate answers first.', true); return; }
        
        try {
            updateStatus('Saving assignment...', false, true);
            await fetchAPI('/assignments', {
                method: 'POST',
                body: JSON.stringify({
                    assignment_name: assignmentName,
                    questions: questions || '',
                    answers: answers || ''
                })
            });
            updateStatus('Assignment saved successfully!');
            
            // Refresh assignments dropdown to show the new assignment
            await populateAssignmentsDropdown();
            
            // Clear the form
            if (uploadAssignmentNameFinal) uploadAssignmentNameFinal.value = '';
            if (uploadRefineFeedback) uploadRefineFeedback.value = '';
        } catch (e) { updateStatus(`Failed to save assignment: ${e.message}`, true); }
    }
    
    async function handleGrade(event) {
        // Prevent any default form submission behavior
        if (event) event.preventDefault();
        
        console.log('🎯 GRADING STARTED - FORCING GRADER TAB');
        
        // IMMEDIATELY switch to grader tab and lock it
        switchTab('grader');
        
        // Set grading in progress flag
        isGradingInProgress = true;
        
        // Clear any pending initialization timeouts to prevent interference
        initializationTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        initializationTimeouts = [];
        console.log('🧹 Cleared pending initialization timeouts');
        
        // Start tab monitoring to prevent unwanted switches
        startTabMonitoring();
        
        console.log('🎯 Starting grade submission...');
        updateStatus('Grading student paper...', false, true);
        
        // Disable the grade button and show loading state
        if (gradeBtn) {
            gradeBtn.disabled = true;
            gradeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Grading...';
        }
        
        // DISABLE WORKBENCH TAB BUTTON TO PREVENT SWITCHING
        if (workbenchTabBtn) {
            workbenchTabBtn.disabled = true;
            workbenchTabBtn.style.opacity = '0.5';
            workbenchTabBtn.style.cursor = 'not-allowed';
            console.log('🔒 DISABLED WORKBENCH TAB BUTTON');
        }
        
        const assignment_name = assignmentSelect.value;
        const uploadedFile = studentSheetInput.files[0] || null;
        const chosenClassId = classSelect.value ? parseInt(classSelect.value, 10) : null;
        const chosenStudentId = studentSelect.value ? parseInt(studentSelect.value, 10) : null;
        
        console.log('📋 Grade submission data:', {
            assignment_name,
            hasFile: !!uploadedFile,
            hasCapturedImage: !!capturedImageBlob,
            classId: chosenClassId,
            studentId: chosenStudentId
        });
        
        if (!assignment_name) { updateStatus('Please select an assignment.', true); return; }
        if (!uploadedFile && !capturedImageBlob) { updateStatus('Please upload or scan a student sheet.', true); return; }
        const formData = new FormData();
        formData.append('assignment_name', assignment_name);
        if (chosenClassId) formData.append('class_id', chosenClassId);
        if (chosenStudentId) formData.append('student_id', chosenStudentId);
        if (remarksInput && remarksInput.value) formData.append('remarks', remarksInput.value);
        const fileToSend = capturedImageBlob ? new File([capturedImageBlob], 'webcam_capture.jpg', { type: 'image/jpeg' }) : uploadedFile;
        formData.append('student_sheet', fileToSend);
        try {
            console.log('📤 Sending grade submission request...');
            const data = await fetchAPI('/grade-submission', { method: 'POST', body: formData });
            console.log('✅ Grade submission successful:', data);
            console.log('📊 Response data structure:', {
                legibility_report: data.legibility_report,
                fairness_check: data.fairness_check,
                ocr_text: data.ocr_text,
                evaluation: data.evaluation
            });
            
            // Populate the results
            console.log('🎯 Populating results in DOM elements...');
            console.log('📋 DOM elements found:', {
                legibilityOutput: !!legibilityOutput,
                fairnessOutput: !!fairnessOutput,
                ocrOutput: !!ocrOutput,
                evaluationOutput: !!evaluationOutput
            });
            
            legibilityOutput.textContent = data.legibility_report || 'N/A';
            fairnessOutput.textContent = data.fairness_check || 'N/A';
            ocrOutput.value = data.ocr_text || '';
            const evalData = data.evaluation || {};
            const rationale = evalData.details ? evalData.details.Rationale : 'N/A';
            evaluationOutput.innerHTML = `
                <h3>Score: ${evalData.marks ?? 'N/A'} / ${evalData.max_marks ?? '100'}</h3>
                <p><strong>AI Rationale:</strong> ${rationale}</p>
                <p><strong>Feedback:</strong> ${evalData.feedback || 'N/A'}</p>
                <p><strong>Key Concepts Missed:</strong> ${evalData.key_concepts_missed || 'N/A'}</p>`;
            
            console.log('✅ Results populated successfully');
            
            console.log('🔄 Switching to grader tab to show results...');
            // Switch to grader tab to show results
            switchTab('grader');
            
            // Force ensure we stay on grader tab
            setTimeout(() => {
                if (!graderTabBtn.classList.contains('active')) {
                    console.log('⚠️ Not on grader tab, forcing switch back');
                    switchTab('grader');
                }
            }, 50);
            
            // Small delay to ensure the tab switch is visible
            setTimeout(() => {
                updateStatus('Grading complete! Results displayed below.');
                console.log('✅ Grading process completed successfully!');
                
                // Debug: Check if we're still on the grader tab
                setTimeout(() => {
                    const isGraderActive = graderTabBtn.classList.contains('active');
                    const isGraderControlsHidden = graderControls.classList.contains('hidden');
                    const isGradingResultsHidden = gradingResultsView.classList.contains('hidden');
                    console.log('🔍 Post-grading tab state check:', {
                        isGraderActive,
                        isGraderControlsHidden,
                        isGradingResultsHidden,
                        currentTab: isGraderActive ? 'grader' : 'workbench'
                    });
                    
                    // If we're not on grader tab, force switch back
                    if (!isGraderActive) {
                        console.log('🚨 CRITICAL: Not on grader tab after grading! Forcing switch back...');
                        switchTab('grader');
                    }
                }, 500);
            }, 100);
        } catch (e) { 
            console.error('❌ Grading failed:', e);
            updateStatus(`Grading failed: ${e.message}`, true); 
        } finally {
            // Clear grading in progress flag
            isGradingInProgress = false;
            
            // Reset the grade button
            if (gradeBtn) {
                gradeBtn.disabled = false;
                gradeBtn.innerHTML = '<i class="fas fa-award"></i> Grade Paper';
            }
            
            // RE-ENABLE WORKBENCH TAB BUTTON
            if (workbenchTabBtn) {
                workbenchTabBtn.disabled = false;
                workbenchTabBtn.style.opacity = '1';
                workbenchTabBtn.style.cursor = 'pointer';
                console.log('🔓 RE-ENABLED WORKBENCH TAB BUTTON');
            }
        }
    }

    // --- Events ---
    workbenchTabBtn.addEventListener('click', () => {
        if (!workbenchTabBtn.disabled) {
            switchTab('workbench');
        } else {
            console.log('⚠️ Workbench tab button is disabled during grading');
        }
    });
    graderTabBtn.addEventListener('click', () => switchTab('grader'));
    // Profile functionality moved to dropdown - no longer needed
    if (generateBtn) generateBtn.addEventListener('click', handleGenerate);
    if (refineBtn) refineBtn.addEventListener('click', handleRefine);
    if (approveBtn) approveBtn.addEventListener('click', handleApprove);
    if (uploadAssignmentBtn) uploadAssignmentBtn.addEventListener('click', handleUploadAssignmentAssets);
    if (generateAnswersFromUploadBtn) generateAnswersFromUploadBtn.addEventListener('click', handleGenerateAnswersFromUpload);
    if (refineUploadAnswersBtn) refineUploadAnswersBtn.addEventListener('click', handleRefineUploadAnswers);
    if (saveUploadAssignmentBtn) saveUploadAssignmentBtn.addEventListener('click', handleSaveUploadAssignment);
    if (gradeBtn) gradeBtn.addEventListener('click', (event) => handleGrade(event));
    if (scanBtn) scanBtn.addEventListener('click', startWebcam);
    
    // New webcam buttons for enhanced upload modes
    if (scanQuestionPaperBtn) scanQuestionPaperBtn.addEventListener('click', () => startWebcam('question-paper'));
    if (scanQuestionPaperBothBtn) scanQuestionPaperBothBtn.addEventListener('click', () => startWebcam('question-paper-both'));
    if (scanReferenceAnswersBtn) scanReferenceAnswersBtn.addEventListener('click', () => startWebcam('reference-answers'));
    if (classSelect) classSelect.addEventListener('change', () => {
        const cid = classSelect.value;
        console.log('Class selected:', cid); // Debug
        if (!cid) {
            studentSelect.innerHTML = '<option value="">-- Select Class First --</option>';
            studentSelect.disabled = true;
            refreshStudentsBtn.disabled = true;
            return;
        }
        populateStudentsForClass(cid);
    });
    if (refreshClassBtn) refreshClassBtn.addEventListener('click', populateClasses);
    if (refreshStudentsBtn) refreshStudentsBtn.addEventListener('click', () => {
        const cid = classSelect.value;
        if (cid) populateStudentsForClass(cid);
    });
    if (refreshAssignmentsBtn) refreshAssignmentsBtn.addEventListener('click', populateAssignmentsDropdown);

    // Workbench mode switching - COMPLETELY REWRITTEN
    function updateWorkbenchMode() {
        console.log('=== MODE SWITCHING DEBUG ===');
        
        // Get current mode
        const gen = modeGenerate?.checked;
        const upg = modeUploadGen?.checked;
        const upb = modeUploadBoth?.checked;
        
        console.log('Radio states:', { gen, upg, upb });
        console.log('Elements exist:', {
            modeGenerate: !!modeGenerate,
            modeUploadGen: !!modeUploadGen,
            modeUploadBoth: !!modeUploadBoth,
            wbSectionGenerate: !!wbSectionGenerate,
            wbSectionUploadGen: !!wbSectionUploadGen,
            wbSectionUploadBoth: !!wbSectionUploadBoth
        });
        
        // Force hide ALL sections first
        const allSections = [
            { el: wbSectionGenerate, name: 'Generate' },
            { el: wbSectionUploadGen, name: 'Upload-Gen' },
            { el: wbSectionUploadBoth, name: 'Upload-Both' }
        ];
        
        allSections.forEach(section => {
            if (section.el) {
                section.el.style.display = 'none';
                section.el.classList.add('hidden');
                console.log(`FORCE HIDING: ${section.name}`);
            }
        });
        
        // Show ONLY the selected section
        let activeSection = null;
        if (gen && wbSectionGenerate) {
            activeSection = wbSectionGenerate;
            console.log('ACTIVATING: Generate section');
        } else if (upg && wbSectionUploadGen) {
            activeSection = wbSectionUploadGen;
            console.log('ACTIVATING: Upload-Gen section');
        } else if (upb && wbSectionUploadBoth) {
            activeSection = wbSectionUploadBoth;
            console.log('ACTIVATING: Upload-Both section');
        }
        
        if (activeSection) {
            activeSection.style.display = 'block';
            activeSection.classList.remove('hidden');
            console.log('SUCCESS: Section activated');
        } else {
            console.log('ERROR: No section to activate');
        }
        
        console.log('=== END MODE SWITCHING ===');
    }
    
    // Add event listeners for mode switching
    if (modeGenerate) {
        modeGenerate.addEventListener('change', updateWorkbenchMode);
    }
    if (modeUploadGen) {
        modeUploadGen.addEventListener('change', updateWorkbenchMode);
    }
    if (modeUploadBoth) {
        modeUploadBoth.addEventListener('change', updateWorkbenchMode);
    }
    
    // FORCE INITIALIZATION - Multiple attempts
    console.log('🚀 STARTING INITIALIZATION...');
    
    // Set first mode as checked
    if (modeGenerate) {
        modeGenerate.checked = true;
        console.log('✅ Mode generate set to checked');
    }
    
    // Try immediate initialization
    console.log('🔄 Attempt 1: Immediate initialization');
    updateWorkbenchMode();
    
    // Try after short delay
    initializationTimeouts.push(setTimeout(() => {
        if (!isGradingInProgress) {
            console.log('🔄 Attempt 2: Delayed initialization (50ms)');
            updateWorkbenchMode();
        } else {
            console.log('⏭️ Skipping initialization attempt 2 (grading in progress)');
        }
    }, 50));
    
    // Try after longer delay
    initializationTimeouts.push(setTimeout(() => {
        if (!isGradingInProgress) {
            console.log('🔄 Attempt 3: Delayed initialization (200ms)');
            updateWorkbenchMode();
        } else {
            console.log('⏭️ Skipping initialization attempt 3 (grading in progress)');
        }
    }, 200));
    
    // Try after DOM is fully loaded
    initializationTimeouts.push(setTimeout(() => {
        if (!isGradingInProgress) {
            console.log('🔄 Attempt 4: Final initialization (500ms)');
            updateWorkbenchMode();
        } else {
            console.log('⏭️ Skipping initialization attempt 4 (grading in progress)');
        }
    }, 500));
    
    console.log('✅ INITIALIZATION COMPLETE');
    if (profileSaveBtn) profileSaveBtn.addEventListener('click', saveProfile);
    if (sourceFileInput) sourceFileInput.addEventListener('change', () => { getEl('source-file-name').textContent = sourceFileInput.files[0]?.name || 'Choose file...'; });
    if (uploadQuestionPaper) uploadQuestionPaper.addEventListener('change', () => { getEl('upload-question-paper-name').textContent = uploadQuestionPaper.files[0]?.name || 'Choose file...'; });
    if (uploadReferenceAnswers) uploadReferenceAnswers.addEventListener('change', () => { getEl('upload-reference-answers-name').textContent = uploadReferenceAnswers.files[0]?.name || 'Choose file...'; });
    
    // Additional file inputs for the "both" section
    const uploadQuestionPaperBoth = getEl('upload-question-paper-both');
    if (uploadQuestionPaperBoth) uploadQuestionPaperBoth.addEventListener('change', () => { getEl('upload-question-paper-name-both').textContent = uploadQuestionPaperBoth.files[0]?.name || 'Choose file...'; });
    
    // New file input for source material
    if (uploadSourceMaterial) uploadSourceMaterial.addEventListener('change', () => { getEl('upload-source-material-name').textContent = uploadSourceMaterial.files[0]?.name || 'Choose source file...'; });
    
    // Auto-populate final assignment name from initial assignment name
    if (uploadAssignmentName) {
        uploadAssignmentName.addEventListener('input', () => {
            if (uploadAssignmentNameFinal && !uploadAssignmentNameFinal.value) {
                uploadAssignmentNameFinal.value = uploadAssignmentName.value;
            }
        });
    }
    if (studentSheetInput) studentSheetInput.addEventListener('change', () => {
        capturedImageBlob = null;
        getEl('student-file-name').textContent = studentSheetInput.files[0]?.name || 'Choose file...';
    });

    // Default view - only set if not already on a tab
    setTimeout(() => {
        if (!workbenchTabBtn.classList.contains('active') && !graderTabBtn.classList.contains('active')) {
            console.log('🔄 Setting default view to workbench');
            switchTab('workbench');
        } else {
            console.log('⏭️ Skipping default view setting - tab already active');
        }
    }, 100);
});