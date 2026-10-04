/* ==========================================================================
   ASTA — 2026 Core Application Engine (V1 Visual Redesign)
   Philosophy: DREAM -> DIRECTION -> MISSIONS -> ACTION -> PROGRESS
   Strict Data Rule: ZERO DUMMY DATA. All metrics calculated from real state.
   ========================================================================== */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. DEFAULT INITIAL APP STATE SCHEMA (Empty for brand new user)
  // --------------------------------------------------------------------------
  const DEFAULT_STATE = {
    onboardingCompleted: false,
    personalInfo: {
      name: "",
      age: "",
      occupation: "",
      category: "",
      targetDate: ""
    },
    longTermGoals: [],
    midTermGoals: [],
    shortTermGoals: [],
    tasks: [],
    settings: {
      avatar: "assets/images/profiles/Asta.jfif"
    }
  };

  let appState = null;
  let currentOnboardingStep = 1;
  let currentActiveTab = 'home';

  function getStoredThemeMode() {
    try {
      return localStorage.getItem('asta_theme_mode') === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function applyThemeMode(mode = 'dark') {
    const safeMode = mode === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', safeMode === 'light');

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.classList.toggle('is-light', safeMode === 'light');
      const label = toggleBtn.querySelector('.toggle-text');
      if (label) {
        label.textContent = safeMode === 'light' ? 'B/W' : 'Dark';
      }
      toggleBtn.setAttribute('aria-label', safeMode === 'light' ? 'Switch to dark theme' : 'Switch to minimal white theme');
    }

    try {
      localStorage.setItem('asta_theme_mode', safeMode);
    } catch (e) {
      console.error('Error saving theme preference:', e);
    }
  }

  // Original Asta-inspired motivational quotes
  const MOTIVATIONAL_QUOTES = [
    { text: "My magic is never giving up! Keep pushing past your limits today.", author: "ASTA-INSPIRED" },
    { text: "Your dream isn't built on talent. It's built on daily relentless effort.", author: "ASTA-INSPIRED" },
    { text: "When everyone doubts your path, let your consistent training speak for you.", author: "ASTA-INSPIRED" },
    { text: "A single task completed today is worth ten dreams planned for tomorrow.", author: "ASTA-INSPIRED" },
    { text: "Surpass your limits. Right here, right now!", author: "ASTA-INSPIRED" }
  ];

  // Premium dark background: no heavy wallpaper override, keep the app cinematic but minimal.
  const ONBOARDING_WALLPAPERS = [
    "assets/backgrounds/asta/webp/asta_02_red_background.webp",
    "assets/backgrounds/asta/webp/asta_05_dual_blade.webp",
    "assets/backgrounds/asta/webp/asta_04_red_dark.webp",
    "assets/backgrounds/asta/webp/asta_09_neon_glow.webp",
    "assets/backgrounds/asta/webp/asta_10_dual_form.webp",
    "assets/backgrounds/asta/webp/asta_06_tears_action.webp",
    "assets/backgrounds/asta/webp/asta_11_purple_anti_magic.webp",
    "assets/backgrounds/asta/webp/asta_01_dual_face.webp"
  ];

  // --------------------------------------------------------------------------
  // 2. LOCALSTORAGE PERSISTENCE ENGINE
  // --------------------------------------------------------------------------
  function loadState() {
    try {
      const saved = localStorage.getItem('asta_v1_app_state');
      if (saved) {
        appState = JSON.parse(saved);
        appState = Object.assign({}, DEFAULT_STATE, appState);
      } else {
        appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function saveState() {
    try {
      localStorage.setItem('asta_v1_app_state', JSON.stringify(appState));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
  }

  // --------------------------------------------------------------------------
  // 3. DYNAMIC CALCULATION HELPERS (PURE REAL DATA)
  // --------------------------------------------------------------------------
  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTaskStatus(task) {
    if (!task) return 'PENDING';
    if (task.completed) return 'COMPLETED';
    if (!task.deadline) return 'UPCOMING';

    const todayStr = getTodayDateString();
    if (task.deadline === todayStr) return 'TODAY';
    if (task.deadline < todayStr) return 'OVERDUE';
    return 'UPCOMING';
  }

  function calculateOverallProgress() {
    if (!appState.tasks || appState.tasks.length === 0) return 0;
    const completedCount = appState.tasks.filter(t => t.completed).length;
    return Math.round((completedCount / appState.tasks.length) * 100);
  }

  function calculateGoalProgress(goalId) {
    if (!goalId || !appState.tasks) return { completed: 0, total: 0, percentage: 0 };
    const linkedTasks = appState.tasks.filter(t => t.linkedGoalId === goalId);
    if (linkedTasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = linkedTasks.filter(t => t.completed).length;
    const percentage = Math.round((completed / linkedTasks.length) * 100);
    return { completed, total: linkedTasks.length, percentage };
  }

  function getNextDeadlineInfo() {
    if (!appState.tasks || appState.tasks.length === 0) {
      return { taskName: "No upcoming deadlines", dateText: "" };
    }
    const pendingTasks = appState.tasks.filter(t => !t.completed && t.deadline);
    if (pendingTasks.length === 0) {
      return { taskName: "All tasks completed!", dateText: "" };
    }
    pendingTasks.sort((a, b) => (a.deadline > b.deadline ? 1 : -1));
    const nextTask = pendingTasks[0];
    return {
      taskName: nextTask.title,
      dateText: nextTask.deadline,
      task: nextTask
    };
  }

  // --------------------------------------------------------------------------
  // 4. VIEW CONTROLLER & ROUTER
  // --------------------------------------------------------------------------
  function initView() {
    if (!appState.onboardingCompleted) {
      document.getElementById('onboarding-shell').style.display = 'flex';
      document.getElementById('app-shell').style.display = 'none';
      renderOnboardingStep(currentOnboardingStep);
    } else {
      document.getElementById('onboarding-shell').style.display = 'none';
      document.getElementById('app-shell').style.display = 'block';
      switchTab('home');
    }
  }

  function switchTab(tabId) {
    currentActiveTab = tabId;

    // Update active nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
      if (btn.dataset.tab === tabId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Hide screens
    document.querySelectorAll('.app-screen').forEach(screen => {
      screen.style.display = 'none';
    });

    // Show target screen
    const targetScreen = document.getElementById(`screen-${tabId}`);
    if (targetScreen) targetScreen.style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderCurrentTab();
  }

  function renderCurrentTab() {
    switch (currentActiveTab) {
      case 'home':
        renderDashboard();
        break;
      case 'goals':
        renderGoalsPage();
        break;
      case 'tasks':
        renderTasksPage();
        break;
      case 'focus':
        updateFocusDisplay();
        break;
      case 'progress':
        renderProgressPage();
        break;
      case 'profile':
        renderProfilePage();
        break;
    }
    saveState();
  }

  // --------------------------------------------------------------------------
  // 5. ONBOARDING RENDERER (STEPS 1 TO 8)
  // --------------------------------------------------------------------------
  function renderOnboardingStep(step) {
    currentOnboardingStep = step;
    const container = document.getElementById('onboarding-card-body');
    const bgEl = document.getElementById('onboarding-bg');

    if (bgEl && ONBOARDING_WALLPAPERS[step - 1]) {
      bgEl.style.backgroundImage = `url('${ONBOARDING_WALLPAPERS[step - 1]}')`;
    }

    // Step dots
    let dotsHtml = `<div class="onboarding-step-indicator">`;
    for (let i = 1; i <= 8; i++) {
      dotsHtml += `<div class="step-dot ${i === step ? 'active' : i < step ? 'completed' : ''}"></div>`;
    }
    dotsHtml += `</div>`;

    let contentHtml = dotsHtml;

    switch (step) {
      case 1:
        // Welcome Screen with 3D Dream Crystal
        contentHtml += `
          <div style="text-align: center;">
            <!-- 3D Dream Crystal Object -->
            <div class="crystal-wrapper">
              <div class="crystal-3d">
                <div class="crystal-core-glow"></div>
                <div class="crystal-face top-front"></div>
                <div class="crystal-face top-back"></div>
                <div class="crystal-face bottom-front"></div>
                <div class="crystal-face bottom-back"></div>
              </div>
            </div>

            <h1 class="onboarding-title" style="font-size: 38px; letter-spacing: 5px; margin-top: 10px;">ASTRA</h1>
            <div style="font-size: 13px; color: var(--gold-bright); font-weight: 800; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">
              "Stay consistent with your dreams."
            </div>
            <p class="onboarding-subtitle" style="font-size: 14px;">
              Your goals are the dream.<br>Your tasks are the training.
            </p>
            <button class="glass-btn glass-btn-primary glass-btn-block" style="padding: 16px; margin-bottom: 12px;" onclick="window.AstaApp.nextOnboardingStep()">
              START YOUR JOURNEY
            </button>
            <button class="glass-btn glass-btn-secondary glass-btn-block glass-btn-sm" style="margin-bottom: 16px;" onclick="document.getElementById('import-file-input').click()">
              📂 RESTORE FROM BACKUP FILE
            </button>
            <div style="font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 1px;">
              Build your goals. Define your missions. Start training.
            </div>
          </div>
        `;
        break;

      case 2:
        // Personal Information
        contentHtml += `
          <h2 class="onboarding-title">Let's get to know you.</h2>
          <p class="onboarding-subtitle">Your journey starts with you.</p>
          <form id="form-onboard-personal" onsubmit="event.preventDefault(); window.AstaApp.savePersonalInfo();">
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Full Name *</label>
              <input type="text" id="ob-name" class="glass-input" placeholder="e.g. Asta" value="${appState.personalInfo.name || ''}" required>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Main Goal Category *</label>
              <select id="ob-category" class="glass-select" required>
                <option value="" disabled ${!appState.personalInfo.category ? 'selected' : ''}>Select category</option>
                <option value="Career" ${appState.personalInfo.category === 'Career' ? 'selected' : ''}>Career</option>
                <option value="Education" ${appState.personalInfo.category === 'Education' ? 'selected' : ''}>Education</option>
                <option value="Fitness" ${appState.personalInfo.category === 'Fitness' ? 'selected' : ''}>Fitness</option>
                <option value="Business" ${appState.personalInfo.category === 'Business' ? 'selected' : ''}>Business</option>
                <option value="Personal Growth" ${appState.personalInfo.category === 'Personal Growth' ? 'selected' : ''}>Personal Growth</option>
                <option value="Other" ${appState.personalInfo.category === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Age (Optional)</label>
              <input type="number" id="ob-age" class="glass-input" placeholder="e.g. 21" value="${appState.personalInfo.age || ''}">
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Current Role / Occupation (Optional)</label>
              <input type="text" id="ob-occupation" class="glass-input" placeholder="e.g. Software Developer" value="${appState.personalInfo.occupation || ''}">
            </div>
            <div style="margin-bottom: 24px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Target Completion Date (Optional)</label>
              <input type="date" id="ob-targetdate" class="glass-input" value="${appState.personalInfo.targetDate || ''}">
            </div>
            <div style="display: flex; gap: 12px;">
              <button type="button" class="glass-btn glass-btn-secondary" style="flex: 1;" onclick="window.AstaApp.prevOnboardingStep()">BACK</button>
              <button type="submit" class="glass-btn glass-btn-primary" style="flex: 2;">CONTINUE</button>
            </div>
          </form>
        `;
        break;

      case 3:
        // Long-Term Goal Creation
        contentHtml += `
          <h2 class="onboarding-title">What's your biggest goal?</h2>
          <p class="onboarding-subtitle">Think about where you want to be in the future.</p>
          
          <form id="form-onboard-ltg" onsubmit="event.preventDefault(); window.AstaApp.addLongTermGoal();">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Goal Title *</label>
              <input type="text" id="ltg-title" class="glass-input" placeholder="e.g. Become a Senior Software Engineer" required>
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Target Deadline</label>
              <input type="date" id="ltg-date" class="glass-input">
            </div>
            <button type="submit" class="glass-btn glass-btn-secondary glass-btn-block" style="margin-bottom: 20px;">+ ADD LONG-TERM GOAL</button>
          </form>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
            ${appState.longTermGoals.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-title">No long-term goals added yet</div>
                <div class="empty-state-desc">Fill out the form above to add your main objective.</div>
              </div>
            ` : appState.longTermGoals.map((g, idx) => `
              <div class="glass" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 800; font-size: 14px;">${g.title}</div>
                  <div style="font-size: 11px; color: var(--text-2);">Deadline: ${g.targetDate || 'No deadline'}</div>
                </div>
                <button class="glass-btn glass-btn-danger glass-btn-sm" onclick="window.AstaApp.deleteLongTermGoal(${idx})">✕</button>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 12px;">
            <button class="glass-btn glass-btn-secondary" style="flex: 1;" onclick="window.AstaApp.prevOnboardingStep()">BACK</button>
            <button class="glass-btn glass-btn-primary" style="flex: 2;" ${appState.longTermGoals.length === 0 ? 'disabled style="opacity:0.5;"' : ''} onclick="window.AstaApp.nextOnboardingStep()">CONTINUE</button>
          </div>
        `;
        break;

      case 4:
        // Mid-Term Goals
        contentHtml += `
          <h2 class="onboarding-title">Break the dream down.</h2>
          <p class="onboarding-subtitle">What needs to happen before you reach your long-term goal?</p>
          
          <form id="form-onboard-mtg" onsubmit="event.preventDefault(); window.AstaApp.addMidTermGoal();">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Mid-Term Goal Title *</label>
              <input type="text" id="mtg-title" class="glass-input" placeholder="e.g. Master Data Structures & Algorithms" required>
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Link to Long-Term Goal</label>
              <select id="mtg-linked-ltg" class="glass-select">
                <option value="">No linked goal</option>
                ${appState.longTermGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}
              </select>
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Target Deadline</label>
              <input type="date" id="mtg-date" class="glass-input">
            </div>
            <button type="submit" class="glass-btn glass-btn-secondary glass-btn-block" style="margin-bottom: 20px;">+ ADD MID-TERM GOAL</button>
          </form>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
            ${appState.midTermGoals.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-title">No mid-term goals added yet</div>
                <div class="empty-state-desc">Break down your big goals into milestones above.</div>
              </div>
            ` : appState.midTermGoals.map((g, idx) => `
              <div class="glass" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 800; font-size: 14px;">${g.title}</div>
                  <div style="font-size: 11px; color: var(--text-2);">Deadline: ${g.targetDate || 'No deadline'}</div>
                </div>
                <button class="glass-btn glass-btn-danger glass-btn-sm" onclick="window.AstaApp.deleteMidTermGoal(${idx})">✕</button>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 12px;">
            <button class="glass-btn glass-btn-secondary" style="flex: 1;" onclick="window.AstaApp.prevOnboardingStep()">BACK</button>
            <button class="glass-btn glass-btn-primary" style="flex: 2;" onclick="window.AstaApp.nextOnboardingStep()">CONTINUE</button>
          </div>
        `;
        break;

      case 5:
        // Short-Term Goals
        contentHtml += `
          <h2 class="onboarding-title">What's next?</h2>
          <p class="onboarding-subtitle">Turn your bigger goals into achievable immediate steps.</p>
          
          <form id="form-onboard-stg" onsubmit="event.preventDefault(); window.AstaApp.addShortTermGoal();">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Short-Term Goal Title *</label>
              <input type="text" id="stg-title" class="glass-input" placeholder="e.g. Complete Dynamic Programming Track" required>
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Link to Mid-Term Goal</label>
              <select id="stg-linked-mtg" class="glass-select">
                <option value="">No linked goal</option>
                ${appState.midTermGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}
              </select>
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Target Deadline</label>
              <input type="date" id="stg-date" class="glass-input">
            </div>
            <button type="submit" class="glass-btn glass-btn-secondary glass-btn-block" style="margin-bottom: 20px;">+ ADD SHORT-TERM GOAL</button>
          </form>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
            ${appState.shortTermGoals.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-title">No short-term goals added yet</div>
                <div class="empty-state-desc">Define short-term targets above.</div>
              </div>
            ` : appState.shortTermGoals.map((g, idx) => `
              <div class="glass" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 800; font-size: 14px;">${g.title}</div>
                  <div style="font-size: 11px; color: var(--text-2);">Deadline: ${g.targetDate || 'No deadline'}</div>
                </div>
                <button class="glass-btn glass-btn-danger glass-btn-sm" onclick="window.AstaApp.deleteShortTermGoal(${idx})">✕</button>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 12px;">
            <button class="glass-btn glass-btn-secondary" style="flex: 1;" onclick="window.AstaApp.prevOnboardingStep()">BACK</button>
            <button class="glass-btn glass-btn-primary" style="flex: 2;" onclick="window.AstaApp.nextOnboardingStep()">CONTINUE</button>
          </div>
        `;
        break;

      case 6:
        // Task Creation
        contentHtml += `
          <h2 class="onboarding-title">Create your tasks.</h2>
          <p class="onboarding-subtitle">What actionable training missions actually need to be done?</p>
          
          <form id="form-onboard-task" onsubmit="event.preventDefault(); window.AstaApp.addTaskFromOnboarding();">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Task Title *</label>
              <input type="text" id="task-title-input" class="glass-input" placeholder="e.g. Solve 2 Dynamic Programming problems" required>
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Link to Goal</label>
              <select id="task-goal-select" class="glass-select">
                <option value="">No linked goal</option>
                <optgroup label="Long-Term Goals">
                  ${appState.longTermGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}
                </optgroup>
                <optgroup label="Mid-Term Goals">
                  ${appState.midTermGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}
                </optgroup>
                <optgroup label="Short-Term Goals">
                  ${appState.shortTermGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}
                </optgroup>
              </select>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 14px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Priority</label>
                <select id="task-priority-select" class="glass-select">
                  <option value="Low">Low</option>
                  <option value="Medium" selected>Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div style="flex: 1;">
                <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-2); text-transform: uppercase; margin-bottom: 6px;">Deadline</label>
                <input type="date" id="task-date-input" class="glass-input" value="${getTodayDateString()}">
              </div>
            </div>
            <button type="submit" class="glass-btn glass-btn-secondary glass-btn-block" style="margin-bottom: 20px;">+ ADD TASK</button>
          </form>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
            ${appState.tasks.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-title">No tasks created yet</div>
                <div class="empty-state-desc">Create actionable tasks above to start training.</div>
              </div>
            ` : appState.tasks.map((t, idx) => `
              <div class="glass" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 800; font-size: 14px;">${t.title}</div>
                  <div style="font-size: 11px; color: var(--text-2);">
                    <span class="glass-chip ${t.priority === 'High' ? 'chip-red' : t.priority === 'Medium' ? 'chip-gold' : 'chip-muted'}">${t.priority}</span>
                    <span>Deadline: ${t.deadline || 'Today'}</span>
                  </div>
                </div>
                <button class="glass-btn glass-btn-danger glass-btn-sm" onclick="window.AstaApp.deleteTaskFromOnboarding(${idx})">✕</button>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 12px;">
            <button class="glass-btn glass-btn-secondary" style="flex: 1;" onclick="window.AstaApp.prevOnboardingStep()">BACK</button>
            <button class="glass-btn glass-btn-primary" style="flex: 2;" onclick="window.AstaApp.nextOnboardingStep()">CONTINUE</button>
          </div>
        `;
        break;

      case 7:
        // Task Deadlines Review List
        contentHtml += `
          <h2 class="onboarding-title">Review Task Schedule.</h2>
          <p class="onboarding-subtitle">Verify your upcoming training deadlines before proceeding.</p>

          <div style="display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto; margin-bottom: 24px;">
            ${appState.tasks.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-title">No tasks scheduled</div>
                <div class="empty-state-desc">Go back and add tasks to build your training schedule.</div>
              </div>
            ` : appState.tasks.map(t => `
              <div class="glass" style="padding: 14px 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-weight: 800; font-size: 14px;">${t.title}</span>
                  <span class="glass-chip ${t.priority === 'High' ? 'chip-red' : t.priority === 'Medium' ? 'chip-gold' : 'chip-muted'}">${t.priority}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-2);">
                  Deadline: <strong style="color: var(--text-1);">${t.deadline || 'No deadline'}</strong>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 12px;">
            <button class="glass-btn glass-btn-secondary" style="flex: 1;" onclick="window.AstaApp.prevOnboardingStep()">BACK</button>
            <button class="glass-btn glass-btn-primary" style="flex: 2;" onclick="window.AstaApp.nextOnboardingStep()">CONTINUE</button>
          </div>
        `;
        break;

      case 8:
        // Final Review & Summary
        const nextDLInfo = getNextDeadlineInfo();
        contentHtml += `
          <h2 class="onboarding-title">Your journey is ready.</h2>
          <p class="onboarding-subtitle">Here is a real summary of your training plan.</p>

          <div class="glass-card accent-gold" style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="color: var(--text-2); font-size: 12px;">PERSONAL NAME:</span>
              <span style="font-weight: 800; color: var(--red-bright);">${appState.personalInfo.name || 'Anonymous'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="color: var(--text-2); font-size: 12px;">MAIN CATEGORY:</span>
              <span style="font-weight: 800; color: var(--gold-bright);">${appState.personalInfo.category || 'General'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="color: var(--text-2); font-size: 12px;">LONG-TERM GOALS:</span>
              <span style="font-weight: 800;">${appState.longTermGoals.length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="color: var(--text-2); font-size: 12px;">MID-TERM GOALS:</span>
              <span style="font-weight: 800;">${appState.midTermGoals.length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="color: var(--text-2); font-size: 12px;">SHORT-TERM GOALS:</span>
              <span style="font-weight: 800;">${appState.shortTermGoals.length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="color: var(--text-2); font-size: 12px;">TOTAL TASKS CREATED:</span>
              <span style="font-weight: 800;">${appState.tasks.length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: var(--text-2); font-size: 12px;">NEXT DEADLINE:</span>
              <span style="font-weight: 800; color: var(--gold-bright);">${nextDLInfo.taskName} ${nextDLInfo.dateText ? '(' + nextDLInfo.dateText + ')' : ''}</span>
            </div>
          </div>

          <div style="display: flex; gap: 12px;">
            <button class="glass-btn glass-btn-secondary" style="flex: 1;" onclick="window.AstaApp.prevOnboardingStep()">BACK</button>
            <button class="glass-btn glass-btn-primary" style="flex: 2; padding: 16px;" onclick="window.AstaApp.completeOnboarding()">BEGIN TRAINING</button>
          </div>
        `;
        break;
    }

    container.innerHTML = contentHtml;
  }

  // Onboarding Actions
  function savePersonalInfo() {
    const name = document.getElementById('ob-name').value.trim();
    const category = document.getElementById('ob-category').value;
    const age = document.getElementById('ob-age').value;
    const occupation = document.getElementById('ob-occupation').value.trim();
    const targetDate = document.getElementById('ob-targetdate').value;

    if (!name || !category) {
      alert("Name and Goal Category are required.");
      return;
    }

    appState.personalInfo = { name, category, age, occupation, targetDate };
    saveState();
    nextOnboardingStep();
  }

  function addLongTermGoal() {
    const title = document.getElementById('ltg-title').value.trim();
    const targetDate = document.getElementById('ltg-date').value;

    if (!title) return;

    appState.longTermGoals.push({
      id: 'ltg_' + Date.now(),
      title,
      targetDate
    });

    saveState();
    renderOnboardingStep(3);
  }

  function deleteLongTermGoal(index) {
    appState.longTermGoals.splice(index, 1);
    saveState();
    renderOnboardingStep(3);
  }

  function addMidTermGoal() {
    const title = document.getElementById('mtg-title').value.trim();
    const linkedGoalId = document.getElementById('mtg-linked-ltg').value;
    const targetDate = document.getElementById('mtg-date').value;

    if (!title) return;

    appState.midTermGoals.push({
      id: 'mtg_' + Date.now(),
      title,
      linkedGoalId,
      targetDate
    });

    saveState();
    renderOnboardingStep(4);
  }

  function deleteMidTermGoal(index) {
    appState.midTermGoals.splice(index, 1);
    saveState();
    renderOnboardingStep(4);
  }

  function addShortTermGoal() {
    const title = document.getElementById('stg-title').value.trim();
    const linkedGoalId = document.getElementById('stg-linked-mtg').value;
    const targetDate = document.getElementById('stg-date').value;

    if (!title) return;

    appState.shortTermGoals.push({
      id: 'stg_' + Date.now(),
      title,
      linkedGoalId,
      targetDate
    });

    saveState();
    renderOnboardingStep(5);
  }

  function deleteShortTermGoal(index) {
    appState.shortTermGoals.splice(index, 1);
    saveState();
    renderOnboardingStep(5);
  }

  function addTaskFromOnboarding() {
    const title = document.getElementById('task-title-input').value.trim();
    const linkedGoalId = document.getElementById('task-goal-select').value;
    const priority = document.getElementById('task-priority-select').value;
    const deadline = document.getElementById('task-date-input').value;

    if (!title) return;

    appState.tasks.push({
      id: 'task_' + Date.now(),
      title,
      linkedGoalId,
      priority,
      deadline,
      completed: false,
      createdAt: new Date().toISOString()
    });

    saveState();
    renderOnboardingStep(6);
  }

  function deleteTaskFromOnboarding(index) {
    appState.tasks.splice(index, 1);
    saveState();
    renderOnboardingStep(6);
  }

  function nextOnboardingStep() {
    if (currentOnboardingStep < 8) {
      renderOnboardingStep(currentOnboardingStep + 1);
    }
  }

  function prevOnboardingStep() {
    if (currentOnboardingStep > 1) {
      renderOnboardingStep(currentOnboardingStep - 1);
    }
  }

  function completeOnboarding() {
    appState.onboardingCompleted = true;
    saveState();
    initView();
  }

  // --------------------------------------------------------------------------
  // 6. DASHBOARD SCREEN (PURE REAL DATA & 3D CRYSTAL OBJECT)
  // --------------------------------------------------------------------------
  function renderDashboard() {
    const now = new Date();
    const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
    const userName = appState.personalInfo.name ? appState.personalInfo.name : '';
    const greetingText = userName ? `Good ${timeOfDay}, <span class="greeting-name">${userName}</span>` : `Good ${timeOfDay}.`;

    document.getElementById('dash-greeting').innerHTML = greetingText;
    document.getElementById('dash-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    // Primary Long-Term Goal Hero Card with 3D Crystal
    const heroCardEl = document.getElementById('dash-hero-goal-card');
    const primaryGoal = appState.longTermGoals[0];

    if (primaryGoal) {
      const goalProgress = calculateGoalProgress(primaryGoal.id);
      heroCardEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div class="dream-label">PRIMARY LONG-TERM OBJECTIVE</div>
            <h3 class="dream-title">${primaryGoal.title}</h3>
            <div class="dream-meta">
              <span>Target: ${primaryGoal.targetDate || 'No date set'}</span>
              <span>Linked Tasks: <strong style="color: var(--text-1);">${goalProgress.total}</strong></span>
            </div>
          </div>
          <!-- Floating 3D Crystal Accent -->
          <div class="crystal-wrapper" style="width: 70px; height: 90px; margin: 0;">
            <div class="crystal-3d" style="width: 45px; height: 70px;">
              <div class="crystal-core-glow"></div>
              <div class="crystal-face top-front" style="border-left-width:22px; border-right-width:22px; border-bottom-width:35px;"></div>
              <div class="crystal-face top-back" style="border-left-width:22px; border-right-width:22px; border-bottom-width:35px;"></div>
              <div class="crystal-face bottom-front" style="border-left-width:22px; border-right-width:22px; border-top-width:35px; top:35px;"></div>
              <div class="crystal-face bottom-back" style="border-left-width:22px; border-right-width:22px; border-top-width:35px; top:35px;"></div>
            </div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-header">
            <span>Goal Progress</span>
            <span>${goalProgress.total > 0 ? goalProgress.percentage + '%' : 'No tasks assigned'}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${goalProgress.percentage}%;"></div>
          </div>
        </div>
      `;
    } else {
      heroCardEl.innerHTML = `
        <div class="dream-label">PRIMARY OBJECTIVE</div>
        <h3 class="dream-title">Set your main long-term goal</h3>
        <p style="font-size: 12px; color: var(--text-2); margin-bottom: 16px;">Define your main objective to start tracking your goal completion.</p>
        <button class="glass-btn glass-btn-secondary glass-btn-sm" onclick="window.AstaApp.switchTab('goals')">+ CREATE GOAL</button>
      `;
    }

    // Task Counters (Calculated from real tasks)
    const totalTasks = appState.tasks.length;
    const completedTasks = appState.tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = appState.tasks.filter(t => getTaskStatus(t) === 'OVERDUE').length;

    document.getElementById('stat-total-tasks').textContent = totalTasks;
    document.getElementById('stat-completed-tasks').textContent = completedTasks;
    document.getElementById('stat-pending-tasks').textContent = pendingTasks;
    document.getElementById('stat-overdue-tasks').textContent = overdueTasks;

    // Overall Progress
    const overallPct = calculateOverallProgress();
    document.getElementById('dash-overall-progress-text').textContent = totalTasks > 0 ? `${overallPct}%` : '0%';
    document.getElementById('dash-overall-progress-bar').style.width = `${overallPct}%`;

    // Next Deadline
    const nextDL = getNextDeadlineInfo();
    document.getElementById('dash-next-deadline-title').textContent = nextDL.taskName;
    document.getElementById('dash-next-deadline-date').textContent = nextDL.dateText ? `Deadline: ${nextDL.dateText}` : '';

    // Today, Overdue, Upcoming Tasks Lists
    const todayStr = getTodayDateString();
    const todayTasks = appState.tasks.filter(t => !t.completed && t.deadline === todayStr);
    const overdueTasksList = appState.tasks.filter(t => getTaskStatus(t) === 'OVERDUE');
    const upcomingTasksList = appState.tasks.filter(t => !t.completed && t.deadline > todayStr);

    renderTaskSectionList('dash-today-tasks-list', todayTasks, "No tasks due today.", "You're clear for today.");
    renderTaskSectionList('dash-overdue-tasks-list', overdueTasksList, "No overdue tasks.", "Great job staying on schedule.");
    renderTaskSectionList('dash-upcoming-tasks-list', upcomingTasksList, "No upcoming tasks.", "Create tasks to keep training.");

    // Next Mission Highlight Card
    const nextMissionCard = document.getElementById('dash-next-mission-card');
    let nextMissionTask = overdueTasksList[0] || todayTasks[0] || upcomingTasksList[0];

    if (nextMissionTask) {
      nextMissionCard.innerHTML = `
        <div style="font-size: 10px; font-weight: 800; color: var(--gold-bright); letter-spacing: 1.5px; margin-bottom: 4px;">YOUR NEXT MISSION</div>
        <div style="font-size: 18px; font-weight: 900; color: var(--text-1); margin-bottom: 6px;">${nextMissionTask.title}</div>
        <div style="font-size: 12px; color: var(--text-2); margin-bottom: 16px;">
          Deadline: <strong style="color: var(--red-bright);">${nextMissionTask.deadline || 'Today'}</strong> | Priority: ${nextMissionTask.priority}
        </div>
        <button class="glass-btn glass-btn-primary glass-btn-block" onclick="window.AstaApp.toggleTaskComplete('${nextMissionTask.id}')">✓ COMPLETE TASK</button>
      `;
    } else if (totalTasks === 0) {
      nextMissionCard.innerHTML = `
        <div style="font-size: 10px; font-weight: 800; color: var(--gold-bright); letter-spacing: 1.5px; margin-bottom: 4px;">YOUR JOURNEY HAS BEGUN</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--text-1); margin-bottom: 6px;">Your goals are ready. Now create your first task and start training.</div>
        <button class="glass-btn glass-btn-primary glass-btn-block" style="margin-top: 12px;" onclick="window.AstaApp.openAddTaskModal()">+ CREATE FIRST TASK</button>
      `;
    } else {
      nextMissionCard.innerHTML = `
        <div style="font-size: 10px; font-weight: 800; color: var(--green-muted); letter-spacing: 1.5px; margin-bottom: 4px;">ALL MISSIONS CLEAR</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--text-1); margin-bottom: 6px;">All scheduled training tasks are completed!</div>
        <button class="glass-btn glass-btn-secondary glass-btn-block" style="margin-top: 12px;" onclick="window.AstaApp.openAddTaskModal()">+ CREATE NEW TASK</button>
      `;
    }

    // Dynamic Asta Motivation Card
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    document.getElementById('dash-motivation-text').textContent = `"${randomQuote.text}"`;
    document.getElementById('dash-motivation-author').textContent = `— ${randomQuote.author}`;
  }

  function renderTaskSectionList(containerId, tasksList, emptyTitle, emptyDesc) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (tasksList.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 16px; margin-bottom: 10px;">
          <div class="empty-state-title" style="font-size: 12px;">${emptyTitle}</div>
          <div class="empty-state-desc" style="font-size: 11px;">${emptyDesc}</div>
        </div>
      `;
      return;
    }

    container.innerHTML = tasksList.map(t => `
      <div class="task-item ${t.completed ? 'completed' : ''}">
        <div class="task-checkbox" onclick="window.AstaApp.toggleTaskComplete('${t.id}')">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="task-content">
          <div class="task-title" onclick="window.AstaApp.toggleTaskComplete('${t.id}')" style="cursor: pointer;">${t.title}</div>
          <div class="task-meta">
            <span class="glass-chip ${t.priority === 'High' ? 'chip-red' : t.priority === 'Medium' ? 'chip-gold' : 'chip-muted'}">${t.priority}</span>
            <span>⏱ ${t.deadline || 'No deadline'}</span>
          </div>
        </div>
        <button class="glass-btn glass-btn-danger glass-btn-sm" onclick="window.AstaApp.deleteTask('${t.id}')">✕</button>
      </div>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // 7. GOALS PAGE RENDERER
  // --------------------------------------------------------------------------
  let activeGoalTab = 'long';
  function renderGoalsPage(tab = activeGoalTab) {
    activeGoalTab = tab;

    document.querySelectorAll('#goals-tabs .glass-tab-btn').forEach(btn => {
      if (btn.dataset.goaltab === tab) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const container = document.getElementById('goals-list-container');
    if (!container) return;

    let targetGoals = [];
    if (tab === 'long') targetGoals = appState.longTermGoals;
    else if (tab === 'mid') targetGoals = appState.midTermGoals;
    else if (tab === 'short') targetGoals = appState.shortTermGoals;

    if (targetGoals.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 36px 20px;">
          <div class="empty-state-title">No ${tab}-term goals created</div>
          <div class="empty-state-desc">Add a ${tab}-term goal to organize your training roadmap.</div>
          <button class="glass-btn glass-btn-primary glass-btn-sm" style="margin-top: 12px;" onclick="window.AstaApp.openAddGoalModal('${tab}')">+ CREATE GOAL</button>
        </div>
      `;
      return;
    }

    container.innerHTML = targetGoals.map(g => {
      const stats = calculateGoalProgress(g.id);
      return `
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="font-family: var(--font-display); font-size: 17px; font-weight: 900; color: var(--text-1);">${g.title}</div>
            <span class="glass-chip ${tab === 'long' ? 'chip-red' : tab === 'mid' ? 'chip-gold' : 'chip-muted'}">${tab.toUpperCase()} TERM</span>
          </div>
          <div style="font-size: 12px; color: var(--text-2); margin-bottom: 14px;">
            Target Deadline: <strong style="color: var(--text-1);">${g.targetDate || 'None'}</strong> | Linked Tasks: <strong>${stats.completed}/${stats.total}</strong>
          </div>
          <div class="progress-container" style="margin-bottom: 16px;">
            <div class="progress-header">
              <span>Goal Completion Progress</span>
              <span>${stats.total > 0 ? stats.percentage + '%' : 'No tasks assigned'}</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${stats.percentage}%;"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <button class="glass-btn glass-btn-danger glass-btn-sm" onclick="window.AstaApp.deleteGoal('${g.id}', '${tab}')">DELETE GOAL</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // --------------------------------------------------------------------------
  // 8. TASKS PAGE RENDERER
  // --------------------------------------------------------------------------
  let activeTaskFilter = 'all';
  function renderTasksPage(filter = activeTaskFilter) {
    activeTaskFilter = filter;

    document.querySelectorAll('#tasks-tabs .glass-tab-btn').forEach(btn => {
      if (btn.dataset.taskfilter === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const container = document.getElementById('all-tasks-container');
    if (!container) return;

    let filtered = appState.tasks;
    const todayStr = getTodayDateString();

    if (filter === 'today') {
      filtered = appState.tasks.filter(t => !t.completed && t.deadline === todayStr);
    } else if (filter === 'upcoming') {
      filtered = appState.tasks.filter(t => !t.completed && t.deadline > todayStr);
    } else if (filter === 'overdue') {
      filtered = appState.tasks.filter(t => getTaskStatus(t) === 'OVERDUE');
    } else if (filter === 'completed') {
      filtered = appState.tasks.filter(t => t.completed);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 36px 20px;">
          <div class="empty-state-title">No tasks found in '${filter}' filter</div>
          <div class="empty-state-desc">Create tasks to build your training schedule.</div>
          <button class="glass-btn glass-btn-primary glass-btn-sm" style="margin-top: 12px;" onclick="window.AstaApp.openAddTaskModal()">+ CREATE TASK</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(t => `
      <div class="task-item ${t.completed ? 'completed' : ''}">
        <div class="task-checkbox" onclick="window.AstaApp.toggleTaskComplete('${t.id}')">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="task-content">
          <div class="task-title" onclick="window.AstaApp.toggleTaskComplete('${t.id}')" style="cursor: pointer;">${t.title}</div>
          <div class="task-meta">
            <span class="glass-chip ${t.priority === 'High' ? 'chip-red' : t.priority === 'Medium' ? 'chip-gold' : 'chip-muted'}">${t.priority}</span>
            <span>Deadline: ${t.deadline || 'No deadline'}</span>
            <span class="glass-chip ${getTaskStatus(t) === 'OVERDUE' ? 'chip-red' : getTaskStatus(t) === 'TODAY' ? 'chip-gold' : 'chip-muted'}">${getTaskStatus(t)}</span>
          </div>
        </div>
        <button class="glass-btn glass-btn-danger glass-btn-sm" onclick="window.AstaApp.deleteTask('${t.id}')">✕</button>
      </div>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // 9. FOCUS TIMER ENGINE
  // --------------------------------------------------------------------------
  let focusInterval = null;
  let focusSecondsRemaining = 45 * 60;
  let focusIsRunning = false;

  function setFocusMinutes(mins) {
    if (focusIsRunning) toggleFocusTimer();
    focusSecondsRemaining = mins * 60;
    updateFocusDisplay();
  }

  function toggleFocusTimer() {
    const btn = document.getElementById('focus-start-btn');
    if (!focusIsRunning) {
      focusIsRunning = true;
      if (btn) btn.textContent = 'PAUSE FOCUS';
      focusInterval = setInterval(() => {
        if (focusSecondsRemaining > 0) {
          focusSecondsRemaining--;
          updateFocusDisplay();
        } else {
          clearInterval(focusInterval);
          focusIsRunning = false;
          if (btn) btn.textContent = 'START FOCUS';
          alert('⚡ DEEP FOCUS SESSION COMPLETE!\n\n"Consistency is the weapon. Outstanding work."');
        }
      }, 1000);
    } else {
      focusIsRunning = false;
      clearInterval(focusInterval);
      if (btn) btn.textContent = 'RESUME FOCUS';
    }
  }

  function resetFocusTimer() {
    if (focusIsRunning) toggleFocusTimer();
    focusSecondsRemaining = 45 * 60;
    const btn = document.getElementById('focus-start-btn');
    if (btn) btn.textContent = 'START FOCUS';
    updateFocusDisplay();
  }

  function updateFocusDisplay() {
    const mins = Math.floor(focusSecondsRemaining / 60);
    const secs = focusSecondsRemaining % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const el = document.getElementById('focus-time-display');
    if (el) el.textContent = formatted;
  }

  // --------------------------------------------------------------------------
  // 10. PROGRESS & ANALYTICS PAGE (PURE REAL DATA)
  // --------------------------------------------------------------------------
  function renderProgressPage() {
    const total = appState.tasks.length;
    const completed = appState.tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const overdue = appState.tasks.filter(t => getTaskStatus(t) === 'OVERDUE').length;
    const pct = calculateOverallProgress();

    document.getElementById('prog-overall-pct').textContent = total > 0 ? `${pct}%` : '0%';
    document.getElementById('prog-total-count').textContent = total;
    document.getElementById('prog-completed-count').textContent = completed;
    document.getElementById('prog-pending-count').textContent = pending;
    document.getElementById('prog-overdue-count').textContent = overdue;

    // Goals breakdown progress
    const goalsBreakdownEl = document.getElementById('prog-goals-breakdown');
    const allGoals = [...appState.longTermGoals, ...appState.midTermGoals, ...appState.shortTermGoals];

    if (allGoals.length === 0) {
      goalsBreakdownEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No goals created</div>
          <div class="empty-state-desc">Create your goals to view detailed completion analytics.</div>
        </div>
      `;
      return;
    }

    goalsBreakdownEl.innerHTML = allGoals.map(g => {
      const stats = calculateGoalProgress(g.id);
      return `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 13px; margin-bottom: 6px;">
            <span>${g.title}</span>
            <span style="color: var(--gold-bright);">${stats.total > 0 ? stats.percentage + '%' : '0%'}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${stats.percentage}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --------------------------------------------------------------------------
  // 11. PROFILE PAGE & SETTINGS
  // --------------------------------------------------------------------------
  function renderProfilePage() {
    const info = appState.personalInfo;
    document.getElementById('profile-user-name').textContent = info.name || 'Anonymous';
    document.getElementById('profile-user-category').textContent = info.category ? `Category: ${info.category}` : 'No category';
    document.getElementById('profile-user-occupation').textContent = info.occupation ? `Role: ${info.occupation}` : 'Role not specified';

    document.getElementById('profile-ltg-count').textContent = appState.longTermGoals.length;
    document.getElementById('profile-mtg-count').textContent = appState.midTermGoals.length;
    document.getElementById('profile-stg-count').textContent = appState.shortTermGoals.length;
    document.getElementById('profile-tasks-count').textContent = appState.tasks.length;
  }

  // --------------------------------------------------------------------------
  // 12. GLOBAL TASK & GOAL MUTATIONS
  // --------------------------------------------------------------------------
  function toggleTaskComplete(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      saveState();
      renderCurrentTab();
    }
  }

  function deleteTask(taskId) {
    appState.tasks = appState.tasks.filter(t => t.id !== taskId);
    saveState();
    renderCurrentTab();
  }

  function deleteGoal(goalId, type) {
    if (type === 'long') appState.longTermGoals = appState.longTermGoals.filter(g => g.id !== goalId);
    else if (type === 'mid') appState.midTermGoals = appState.midTermGoals.filter(g => g.id !== goalId);
    else if (type === 'short') appState.shortTermGoals = appState.shortTermGoals.filter(g => g.id !== goalId);

    appState.tasks.forEach(t => {
      if (t.linkedGoalId === goalId) t.linkedGoalId = "";
    });

    saveState();
    renderCurrentTab();
  }

  function resetJourney() {
    if (confirm("Are you sure you want to reset your entire journey?\nAll goals, tasks, and personal data will be deleted.")) {
      localStorage.removeItem('asta_v1_app_state');
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      currentOnboardingStep = 1;
      initView();
    }
  }

  // Modal Dialog Controls
  function openAddTaskModal() {
    const selectEl = document.getElementById('modal-task-goal');
    if (selectEl) {
      selectEl.innerHTML = `<option value="">No linked goal</option>
        <optgroup label="Long-Term Goals">${appState.longTermGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}</optgroup>
        <optgroup label="Mid-Term Goals">${appState.midTermGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}</optgroup>
        <optgroup label="Short-Term Goals">${appState.shortTermGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}</optgroup>`;
    }
    document.getElementById('modal-add-task').classList.add('active');
  }

  function closeAddTaskModal() {
    document.getElementById('modal-add-task').classList.remove('active');
  }

  function handleCreateTaskSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('modal-task-title').value.trim();
    const linkedGoalId = document.getElementById('modal-task-goal').value;
    const priority = document.getElementById('modal-task-priority').value;
    const deadline = document.getElementById('modal-task-date').value;

    if (!title) return;

    appState.tasks.push({
      id: 'task_' + Date.now(),
      title,
      linkedGoalId,
      priority,
      deadline,
      completed: false,
      createdAt: new Date().toISOString()
    });

    saveState();
    closeAddTaskModal();
    renderCurrentTab();
    document.getElementById('form-modal-add-task').reset();
  }

  function openAddGoalModal(type = 'long') {
    document.getElementById('modal-goal-type').value = type;
    document.getElementById('modal-add-goal').classList.add('active');
  }

  function closeAddGoalModal() {
    document.getElementById('modal-add-goal').classList.remove('active');
  }

  function handleCreateGoalSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('modal-goal-title').value.trim();
    const type = document.getElementById('modal-goal-type').value;
    const targetDate = document.getElementById('modal-goal-date').value;

    if (!title) return;

    const newGoal = { id: type + '_' + Date.now(), title, targetDate };

    if (type === 'long') appState.longTermGoals.push(newGoal);
    else if (type === 'mid') appState.midTermGoals.push(newGoal);
    else if (type === 'short') appState.shortTermGoals.push(newGoal);

    saveState();
    closeAddGoalModal();
    renderCurrentTab();
    document.getElementById('form-modal-add-goal').reset();
  }

  // --------------------------------------------------------------------------
  // 13. DATA EXPORT & IMPORT (BACKUP & RESTORE)
  // --------------------------------------------------------------------------
  function exportData() {
    try {
      const dataStr = JSON.stringify(appState, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `asta_journey_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exporting data:', e);
      alert('Failed to export data file.');
    }
  }

  function importData(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const importedData = JSON.parse(e.target.result);

        if (!importedData || typeof importedData !== 'object') {
          throw new Error('Invalid JSON structure.');
        }

        appState = Object.assign({}, DEFAULT_STATE, importedData);
        appState.onboardingCompleted = true;

        saveState();
        initView();

        const taskCount = appState.tasks ? appState.tasks.length : 0;
        const goalCount = (appState.longTermGoals ? appState.longTermGoals.length : 0) +
                          (appState.midTermGoals ? appState.midTermGoals.length : 0) +
                          (appState.shortTermGoals ? appState.shortTermGoals.length : 0);

        alert(`⚡ DATA RESTORED SUCCESSFULLY!\n\nWelcome back, ${appState.personalInfo.name || 'Warrior'}!\nRestored ${taskCount} tasks and ${goalCount} goals.`);
      } catch (err) {
        console.error('Error importing backup file:', err);
        alert('Failed to import data file. Please select a valid ASTA backup JSON file.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  // --------------------------------------------------------------------------
  // 14. INITIALIZATION & EVENT BINDINGS
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initView();

    // Bottom Navigation & Sidebar Clicks
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab) switchTab(tab);
      });
    });

    // Form Submissions
    const addTaskForm = document.getElementById('form-modal-add-task');
    if (addTaskForm) addTaskForm.addEventListener('submit', handleCreateTaskSubmit);

    const addGoalForm = document.getElementById('form-modal-add-goal');
    if (addGoalForm) addGoalForm.addEventListener('submit', handleCreateGoalSubmit);

    applyThemeMode(getStoredThemeMode());

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const nextMode = document.body.classList.contains('theme-light') ? 'dark' : 'light';
        applyThemeMode(nextMode);
      });
    }

    // Global Public API
    window.AstaApp = {
      nextOnboardingStep,
      prevOnboardingStep,
      savePersonalInfo,
      addLongTermGoal,
      deleteLongTermGoal,
      addMidTermGoal,
      deleteMidTermGoal,
      addShortTermGoal,
      deleteShortTermGoal,
      addTaskFromOnboarding,
      deleteTaskFromOnboarding,
      completeOnboarding,
      switchTab,
      toggleTaskComplete,
      deleteTask,
      deleteGoal,
      openAddTaskModal,
      closeAddTaskModal,
      openAddGoalModal,
      closeAddGoalModal,
      renderGoalsPage,
      renderTasksPage,
      setFocusMinutes,
      toggleFocusTimer,
      resetFocusTimer,
      resetJourney,
      exportData,
      importData,
      applyThemeMode
    };
  });

})();
