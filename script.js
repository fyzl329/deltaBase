// DeltaBase – Performance Optimized Quiz Engine v9.1 (Idiot-Proofed)
class DeltaBase {
  constructor() {
    this.subject = null;
    this.slug = null;
    this.title = null;
    this.questions = [];
    this.selected = null;
    this.currentIndex = 0;
    this.timerInterval = null;
    this.keyHandlerBound = null;
    this.stats = {};
    this.performanceMetrics = {};
    this.rafId = null;

    // Performance helpers
    this.resizeTimeout = null;
    this.renderTimeout = null;

      
    this.profileKey = "db:profile";
    this.profile = this.loadProfile();
  }

  init() {
    this.setActiveNav();

    const params = new URLSearchParams(window.location.search);
    this.subject = (params.get("subject") || "").toLowerCase();

    if (this.subject) {
      const title = this.subject.charAt(0).toUpperCase() + this.subject.slice(1);
      const subjectTitle = document.getElementById("subject-title");
      if (subjectTitle) subjectTitle.textContent = `${title} Chapters`;

      this.loadChapters(this.subject);

      // Event delegation
      document.addEventListener("click", (e) => {
        const id = e.target?.id;
        if (id === "cancelSettings") this.closeModal();
        if (id === "applySettings") this.startQuiz();
      });
    }

    this.optimizeResize();
  }

  /* ----------------------- UX / NAV ----------------------- */

  optimizeResize() {
    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.debouncedResize(), 100);
    });
  }

  debouncedResize() {
    // hook for responsive fixes if needed
  }

  setActiveNav() {
    const current = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav a").forEach((link) => {
      const href = link.getAttribute("href");
      const isHome = current === "index.html" && href.includes("index.html");
      const isMatch = window.location.href.includes(link.href);
      link.classList.toggle("active", isHome || isMatch);
    });
  }

  /* ----------------------- CHAPTERS ----------------------- */

  async loadChapters(subject) {
    const grid = document.getElementById("chapter-grid");
    if (!grid) return;

    const path = `./data/${subject}/index.json?v=1.0`;

    try {
      const res = await fetch(path, { cache: "no-cache", headers: { "Cache-Control": "no-cache" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const chapters = await res.json();
      const fragment = document.createDocumentFragment();

      (chapters || []).forEach((ch) => {
        const card = document.createElement("div");
        card.className = "card";
        const icon = ch.icon || "📘";
        card.innerHTML = `
          <div class="card-icon">${icon}</div>
          <h3>${ch.title || "Untitled"}</h3>
          <p>Start quiz →</p>
        `;
        card.addEventListener("click", () => this.openModal((ch.slug || "").toLowerCase(), ch.title || "Quiz"));
        fragment.appendChild(card);
      });

      grid.innerHTML = "";
      grid.appendChild(fragment);
    } catch (err) {
      console.error("Failed to load chapters:", err, "Path tried:", path);
      grid.innerHTML = `<p style="text-align:center;">⚠️ Could not load chapters at <code>${path}</code>.</p>`;
    }
  }

  openModal(slug, title) {
    this.slug = (slug || "").toLowerCase();
    this.title = title || "Quiz";

    this.updateDifficultyOptions(this.subject);
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.add("active");
  }

  closeModal() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.remove("active");
  }

  updateDifficultyOptions(subject) {
    const difficultySelect = document.getElementById("difficulty");
    const questionCountInput = document.getElementById("questionCount");
    if (!difficultySelect || !questionCountInput) return;

    difficultySelect.innerHTML = "";

    const baseLevels = [
      { value: "normal", label: "Normal" },
      { value: "moderate", label: "Moderate" },
      { value: "hard", label: "Hard" },
    ];
    const advancedLevel = subject === "biology" ? { value: "neet", label: "NEET" } : { value: "jee", label: "JEE" };
    const mixed = { value: "mixed", label: "Mixed Questions" };

    [...baseLevels, advancedLevel, mixed].forEach((level) => {
      const opt = document.createElement("option");
      opt.value = level.value;
      opt.textContent = level.label;
      difficultySelect.appendChild(opt);
    });

    difficultySelect.value = "normal";
    this.updateQuestionCountLimits();
  }

  updateQuestionCountLimits() {
    const difficultySelect = document.getElementById("difficulty");
    const questionCountInput = document.getElementById("questionCount");
    if (!difficultySelect || !questionCountInput) return;

    const selectedDifficulty = (difficultySelect.value || "normal").toLowerCase();
    const max = selectedDifficulty === "mixed" ? 50 : 20;
    questionCountInput.max = max;
    questionCountInput.value = Math.min(parseInt(questionCountInput.value || "10", 10), max);
    questionCountInput.placeholder = `Max ${max} questions`;
  }

  /* ----------------------- QUIZ FLOW ----------------------- */

  async startQuiz() {
    const diff = (document.getElementById("difficulty")?.value || "normal").toLowerCase();
    const mins = parseInt(document.getElementById("minutes")?.value || "0", 10);
    const questionCount = parseInt(document.getElementById("questionCount")?.value || "10", 10);

    const maxQuestions = diff === "mixed" ? 50 : 20;
    if (questionCount < 1 || questionCount > maxQuestions) {
      alert(`Please enter a valid number of questions (1-${maxQuestions})`);
      return;
    }

    this.closeModal();
    await this.loadQuizData(diff, questionCount, mins);
  }

  async loadQuizData(diff, questionCount, mins) {
    const path = `./data/${this.subject}/${this.slug}.json?v=1.0`;
    try {
      let data = await this.fetchWithCache(path);

      // Normalize whatever JSON structure you encounter
      data = this.normalizeDataset(data);

      if (diff === "mixed") {
        this.questions = this.getMixedQuestions(data, questionCount);
      } else {
        this.questions = this.processQuestionsByDifficulty(data, diff, questionCount);
      }

      if (!this.questions.length) {
        alert("No valid questions found for this chapter.");
        return;
      }

      this.stats = {};
      this.performanceMetrics = {};
      this.renderQuiz(mins);
    } catch (err) {
      console.error("Quiz load error:", err, "Path tried:", path);
      alert("Could not load quiz data. Open console for details.");
    }
  }

  /* ----------------------- FETCH + CACHE ----------------------- */

  async fetchWithCache(path) {
    const cacheKey = `db:${this.subject}:${this.slug}`;
    const now = Date.now();

    // Try cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { time, data } = JSON.parse(cached);
        if (now - time < 7 * 24 * 60 * 60 * 1000) return data;
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    // Fetch fresh
    const res = await fetch(path, { cache: "no-cache", headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();

    // Handle double-stringified / malformed JSON gracefully
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn("Primary JSON.parse failed, attempting to repair...");
      const repaired = text
        // common slip: trailing commas
        .replace(/,(\s*[}\]])/g, "$1")
        // stray BOM
        .replace(/^\uFEFF/, "");
      data = JSON.parse(repaired);
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ time: now, data }));
    } catch {
      // storage full or disabled — ignore
    }
    return data;
  }

  /* ----------------------- DATA NORMALIZATION ----------------------- */

  normalizeDataset(data) {
    // Accepted shapes:
    // 1) { normal:[], moderate:[], hard:[], jee:[] }
    // 2) { questions: [...] }
    // 3) [ ...flat questions ]
    if (!data) return { normal: [], moderate: [], hard: [], jee: [] };

    const lowerKey = (k) => (typeof k === "string" ? k.toLowerCase() : k);

    // Normalize keys to lowercase
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const normalizedObj = {};
      Object.keys(data).forEach((k) => (normalizedObj[lowerKey(k)] = data[k]));
      data = normalizedObj;
    }

    // Prefer tiered
    if (data.normal || data.moderate || data.hard || data.jee || data.neet) {
      const out = {
        normal: (data.normal || []).map((q) => this.safeNormalizeQuestion(q)).filter(Boolean),
        moderate: (data.moderate || []).map((q) => this.safeNormalizeQuestion(q)).filter(Boolean),
        hard: (data.hard || []).map((q) => this.safeNormalizeQuestion(q)).filter(Boolean),
        jee: (data.jee || []).map((q) => this.safeNormalizeQuestion(q)).filter(Boolean),
      };
      // biology NEET tier support
      if (data.neet) out.neet = (data.neet || []).map((q) => this.safeNormalizeQuestion(q)).filter(Boolean);
      return out;
    }

    // Questions array
    if (Array.isArray(data.questions)) {
      return {
        normal: data.questions.map((q) => this.safeNormalizeQuestion(q)).filter(Boolean),
        moderate: [],
        hard: [],
        jee: [],
      };
    }

    // Flat array
    if (Array.isArray(data)) {
      return {
        normal: data.map((q) => this.safeNormalizeQuestion(q)).filter(Boolean),
        moderate: [],
        hard: [],
        jee: [],
      };
    }

    // Fallback empty
    return { normal: [], moderate: [], hard: [], jee: [] };
  }

  // Repairs a single question object to guaranteed-safe shape
  safeNormalizeQuestion(q) {
    if (!q || typeof q !== "object") return null;

    // Unify statement field
    if (!q.statement && q.question) q.statement = q.question;

    // Ensure options array
    if (typeof q.options === "string") {
      // Convert "['a','b']" → ["a","b"]
      try {
        const repaired = q.options.replace(/'/g, '"');
        const parsed = JSON.parse(repaired);
        if (Array.isArray(parsed)) {
          q.options = parsed;
          console.warn(`⚙️ Auto-fixed stringified options${q.id ? " for " + q.id : ""}`);
        } else {
          q.options = [String(q.options)];
        }
      } catch {
        q.options = [String(q.options)];
      }
    }
    if (!Array.isArray(q.options) || q.options.length === 0) {
      // Last-ditch: seed options from answer
      if (q.answer !== undefined && q.answer !== null) {
        q.options = [String(q.answer)];
      } else {
        q.options = ["N/A"];
      }
    }

    // Ensure answer exists
    if (q.answer === undefined || q.answer === null) q.answer = q.options[0];

    // Ensure type
    if (!q.type) q.type = this.detectQuestionType(q);

    // Trim & normalize strings
    q.statement = this.coerceString(q.statement);
    q.options = q.options.map((o) => this.coerceString(o));
    q.answer = typeof q.answer === "number" ? q.answer : this.coerceString(q.answer);

    return q;
  }

  coerceString(v) {
    if (v == null) return "";
    return String(v).trim();
  }

  /* ----------------------- QUESTION SELECTION ----------------------- */

  processQuestionsByDifficulty(data, diff, questionCount) {
    let pool = [];
    if (Array.isArray(data)) pool = data;
    else if (data.questions) pool = data.questions;
    else if (data[diff]) pool = data[diff];
    else pool = Object.values(data).flat();

    // Normalize & validate
    pool = (pool || []).map((q) => this.safeNormalizeQuestion(q)).filter((q) => this.validateQuestion(q));

    if (!pool.length) return [];
    return this.getRandomQuestions(pool, questionCount);
  }

  getMixedQuestions(data, totalQuestions) {
    const levels = ["normal", "moderate", "hard", "jee", "neet"];
    const byLevel = {};
    levels.forEach((lv) => {
      const arr = (data[lv] || []).map((q) => this.safeNormalizeQuestion(q)).filter((q) => this.validateQuestion(q));
      if (arr.length) byLevel[lv] = arr;
    });

    const available = Object.keys(byLevel);
    if (!available.length) return [];

    const per = Math.ceil(totalQuestions / available.length);
    const mixed = [];
    available.forEach((lv) => {
      const take = Math.min(per, byLevel[lv].length);
      mixed.push(...this.shuffleArray([...byLevel[lv]]).slice(0, take));
    });

    return this.shuffleArray(mixed).slice(0, totalQuestions);
  }

  getRandomQuestions(questions, count) {
    const arr = this.shuffleArray([...questions]);
    return arr.slice(0, Math.min(count, arr.length));
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /* ----------------------- VALIDATION / ANSWERS ----------------------- */

  validateQuestion(q) {
    if (!q || (!q.statement && !q.question)) {
      console.warn("Question missing statement:", q);
      return false;
    }
    if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
      console.warn("Question missing options:", q);
      return false;
    }
    if (q.answer === undefined || q.answer === null) {
      console.warn("Question missing answer:", q);
      return false;
    }
    return true;
  }

  // Robust matcher: supports numeric index, string value, trimmed Tex, and loose equality
  getCorrectIndex(q) {
    if (typeof q.answer === "number") {
      if (q.answer >= 0 && q.answer < q.options.length) return q.answer;
    }

    const norm = (s) =>
      String(s)
        .replace(/\s+/g, " ")
        .replace(/\\,|\\;|\\!/g, "") // remove TeX spacing commands
        .trim();

    const ans = norm(q.answer);
    const idx = q.options.findIndex((opt) => norm(opt) === ans);
    if (idx !== -1) return idx;

    // If answer looks like an index in string form
    const num = parseInt(q.answer, 10);
    if (!isNaN(num) && num >= 0 && num < q.options.length) return num;

    console.warn("Could not determine correct index for:", q);
    return 0;
  }

  detectQuestionType(q) {
    const text = ((q.statement || q.question || "") + " " + (q.explanation || "")).toLowerCase();

    if (/\b(find|calculate|determine|evaluate|compute|solve|simplify|derive|obtain|ratio|velocity|speed|acceleration|energy|power|mass|charge|potential|distance|time|period|radius|temperature|concentration|pressure|current|voltage|resistance|weight|frequency|wavelength|momentum|magnitude|work|heat|enthalpy|moles|volume|equilibrium|displacement|atomic|number)\b/.test(text))
      return "numerical";

    if (/\b(prove|show|derive|deduce|verify|establish|explain why|reason|relation|expression|law|equation|derive the relation|graph of|plot|represent|draw)\b/.test(text))
      return "analytical";

    if (/\b(graph|plot|curve|locus|diagram|arrangement|structure|shape|representation|bond|orbital|molecular|arranged|layout)\b/.test(text))
      return "graphical";

    if (/\b(experiment|observe|measurement|apparatus|device|setup|instrument|reading|method|procedure|test|indicator|detect|record)\b/.test(text))
      return "experimental";

    if (/\b(function|role|organ|process|enzyme|cycle|phase|stage|mechanism|structure|synthesis|pathway|cell|tissue|organism|gene|protein|replication|division|respiration|photosynthesis)\b/.test(text))
      return "descriptive";

    if (/\b(concept|definition|which|true|false|reason|assertion|property|principle|statement|inference|based on|reasoning|type of|depends|is called|results in|caused by|because)\b/.test(text))
      return "conceptual";

    // fallback heuristic
    if (text.match(/\d|=|\+|-|\/|\*|√/)) return "numerical";
    return "conceptual";
  }


  /* ----------------------- RENDERING ----------------------- */

  renderQuiz(mins) {
    const chapters = document.getElementById("chapters");
    const quiz = document.getElementById("quiz");
    if (!chapters || !quiz) return;

    chapters.classList.add("hidden");
    quiz.classList.remove("hidden");

    quiz.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-header">
          <div class="quiz-title">${this.title}</div>
          <div class="timer" id="timer">${mins > 0 ? `${mins}:00` : "No timer"}</div>
        </div>
        <div id="quiz-root" class="quiz-slide"></div>
      </div>
    `;

    this.currentIndex = 0;
    this.selected = null;
    this.startTimer(mins);
    this.renderQuestion();
    if (this.keyHandlerBound) document.removeEventListener("keydown", this.keyHandlerBound);
    this.keyHandlerBound = (e) => this.keyHandler(e);
    document.addEventListener("keydown", this.keyHandlerBound);
  }

  async renderQuestion(direction = "right") {
    clearTimeout(this.renderTimeout);
    this.renderTimeout = setTimeout(async () => {
      const root = document.getElementById("quiz-root");
      if (!root) return;

      let q = this.questions[this.currentIndex];
      if (!q) return this.showResults();

      // Last-moment normalization (in case)
      q = this.safeNormalizeQuestion(q);
      if (!this.validateQuestion(q)) {
        console.warn("Skipping malformed question at index", this.currentIndex);
        this.currentIndex++;
        return this.renderQuestion(direction);
      }

      const progress = ((this.currentIndex + 1) / this.questions.length) * 100;

      root.classList.remove("slide-in-left", "slide-in-right");
      void root.offsetWidth;

      const optHtml = q.options
        .map(
          (opt, i) =>
            `<div class="option" data-i="${i}" role="button" tabindex="0">${this.normalizeMathInText(String(opt))}</div>`
        )
        .join("");

      root.innerHTML = `
        <div class="progress"><div class="progress-bar" style="width:${progress}%"></div></div>
        <div class="question-header"><span class="question-number">Question ${this.currentIndex + 1} of ${
        this.questions.length
      }</span></div>
        <div class="question">${this.normalizeMathInText(q.statement || q.question)}</div>
        <div class="options">${optHtml}</div>
        <div class="btn-container"><button class="btn" id="nextBtn" disabled>Confirm Answer</button></div>
      `;

      root.classList.add(direction === "left" ? "slide-in-left" : "slide-in-right");
      this.setupQuestionInteractions(root);

      if (window.MathJax?.typesetPromise) {
        // Wait for DOM update and then typeset
        setTimeout(() => {
          MathJax.typesetPromise([root])
            .then(() => {
              // If needed, re-run typeset after a moment to catch any delayed content
              setTimeout(() => {
                MathJax.typesetPromise([root]).catch(() => {});
              }, 500);
            })
            .catch(() => {});
        }, 100);
      }
    }, 16);

  }

  setupQuestionInteractions(root) {
    this.selected = null;
    const nextBtn = document.getElementById("nextBtn");
    if (!nextBtn) return;

    const options = root.querySelectorAll(".option");
    const pick = (el) => {
      options.forEach((o) => o.classList.remove("selected"));
      el.classList.add("selected");
      this.selected = +el.dataset.i;
      nextBtn.disabled = false;
    };

    options.forEach((el) => {
      el.onclick = () => pick(el);
      el.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick(el);
        }
      };
    });

    nextBtn.onclick = () => this.confirmSelection();
  }

  async confirmSelection() {
    if (this.selected === null) return;

    const root = document.getElementById("quiz-root");
    if (!root) return;
    const q = this.questions[this.currentIndex];
    const options = root.querySelectorAll(".option");
    const nextBtn = document.getElementById("nextBtn");
    if (!nextBtn || nextBtn.dataset.confirmed === "true") return;

    nextBtn.dataset.confirmed = "true";
    options.forEach((opt) => (opt.style.pointerEvents = "none"));
    nextBtn.disabled = true;

    const correctIndex = this.getCorrectIndex(q);
    const isCorrect = this.selected === correctIndex;

    options[this.selected]?.classList.add(isCorrect ? "correct" : "wrong");
    if (!isCorrect && options[correctIndex]) options[correctIndex].classList.add("correct");

    this.updateStats(q, isCorrect);
    this.showFeedback(root, nextBtn, q, isCorrect, correctIndex);

    if (window.MathJax?.typesetPromise) {
      setTimeout(() => {
        const el = root.querySelector(".answer-feedback");
        if (el) MathJax.typesetPromise([el]).catch(() => {});
      }, 40);
    }
  }

  updateStats(q, isCorrect) {
    const type = (q.type || this.detectQuestionType(q) || "misc").toLowerCase();
    if (!this.stats[type]) this.stats[type] = { correct: 0, total: 0 };
    this.stats[type].total++;
    if (isCorrect) this.stats[type].correct++;
  }

  showFeedback(root, nextBtn, q, isCorrect, correctIndex) {
    const feedbackEl = document.createElement("div");
    feedbackEl.className = "answer-feedback";
    const correctVal = this.normalizeMathInText(q.options[correctIndex]);

    feedbackEl.innerHTML = `
      <div class="feedback-content ${isCorrect ? "success" : "error"}">
        <h4>${isCorrect ? "✨ Correct!" : "❌ Incorrect"}</h4>
        ${!isCorrect ? `<p>The correct answer is: <span class="math-content">${correctVal}</span></p>` : ""}
        ${q.explanation ? `<p class="explanation">${q.explanation}</p>` : ""}
      </div>
    `;

    const btnContainer = nextBtn.parentElement;
    if (btnContainer) root.insertBefore(feedbackEl, btnContainer);

    nextBtn.textContent = "Next Question →";
    nextBtn.disabled = false;
    nextBtn.onclick = () => {
      this.currentIndex++;
      this.renderQuestion("left");
    };
  }

  async showResults() {
    clearInterval(this.timerInterval);
    if (this.keyHandlerBound) document.removeEventListener("keydown", this.keyHandlerBound);

    const root = document.getElementById("quiz-root");
    if (!root) return;

    this.calculatePerformanceMetrics();
    const accuracyByType = Object.entries(this.stats).map(([type, data]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      accuracy: Math.round((data.correct / data.total) * 100),
      correct: data.correct,
      total: data.total,
    }));

    root.innerHTML = `
      <div class="results-container">
        <h2 style="text-align:center; margin-bottom: 2rem; background: linear-gradient(135deg, #64b5f6, #2ecc71); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🎯 Quiz Completed!</h2>
        <div class="performance-summary">
          <div class="score-card">
            <div class="score-value">${this.performanceMetrics.overallScore}%</div>
            <div class="score-label">Overall Score</div>
          </div>
          <div class="stats-grid">
            <div class="stat-item"><div class="stat-value">${this.performanceMetrics.totalQuestions}</div><div class="stat-label">Total Questions</div></div>
            <div class="stat-item"><div class="stat-value">${this.performanceMetrics.correctAnswers}</div><div class="stat-label">Correct Answers</div></div>
            <div class="stat-item"><div class="stat-value">${this.performanceMetrics.incorrectAnswers}</div><div class="stat-label">Incorrect Answers</div></div>
          </div>
        </div>
        <div class="chart-section">
          <h3 style="text-align:center; margin-bottom: 1.5rem;">Performance Breakdown</h3>
          <div class="chart-container"><canvas id="resultsChart" width="600" height="400"></canvas></div>
        </div>
        <div class="profile-section" id="profileSection" style="margin-top:2rem;">
          <h3 style="text-align:center;">📈 Personal Performance Summary</h3>
          <pre id="profileDump" style="background:rgba(0,0,0,.2); padding:1rem; border-radius:8px; overflow-x:auto;"></pre>
        </div>
        <div style="text-align:center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border-color);">
          <button class="btn ghost" onclick="location.reload()" style="margin-right: 1rem;">Back to Chapters</button>
          <button class="btn" onclick="window.DeltaBase.retryQuiz()" style="margin-right: 1rem;">Retry Same Quiz</button>
          <button class="btn ghost" onclick="window.DeltaBase.startNewQuiz()">New Quiz Settings</button>
        </div>
      </div>
    `;
    this.updateProfile();
    await this.renderChart();
    this.renderProfileSummary();
  }

  calculatePerformanceMetrics() {
    let totalCorrect = 0;
    let total = 0;
    Object.values(this.stats).forEach((c) => {
      totalCorrect += c.correct;
      total += c.total;
    });
    this.performanceMetrics = {
      overallScore: total ? Math.round((totalCorrect / total) * 100) : 0,
      totalQuestions: total,
      correctAnswers: totalCorrect,
      incorrectAnswers: total - totalCorrect,
      categories: Object.keys(this.stats),
    };
  }

  async renderChart() {
    if (!Object.keys(this.stats).length) return;
    await this.loadChartJS();

    const ctx = document.getElementById("resultsChart");
    if (!ctx) return;

    const labels = Object.keys(this.stats).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    const performanceData = Object.values(this.stats).map((c) => Math.round((c.correct / c.total) * 100));
    const questionCounts = Object.values(this.stats).map((c) => c.total);
    const correctCounts = Object.values(this.stats).map((c) => c.correct);

    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Performance Score (%)",
            data: performanceData,
            backgroundColor: ["rgba(100,181,246,.8)", "rgba(46,204,113,.8)", "rgba(155,89,182,.8)", "rgba(241,196,15,.8)", "rgba(230,126,34,.8)", "rgba(231,76,60,.8)"],
            borderColor: ["rgba(100,181,246,1)", "rgba(46,204,113,1)", "rgba(155,89,182,1)", "rgba(241,196,15,1)", "rgba(230,126,34,1)", "rgba(231,76,60,1)"],
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false
          },
          {
            label: "Question Count",
            data: questionCounts,
            type: "line",
            borderColor: "rgba(255,255,255,.6)",
            backgroundColor: "rgba(255,255,255,.1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(255,255,255,.8)",
            pointBorderColor: "rgba(255,255,255,1)",
            pointRadius: 6,
            pointHoverRadius: 8,
            yAxisID: "y1",
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: "rgba(255,255,255,.1)", drawBorder: false }, ticks: { color: "rgba(255,255,255,.8)", callback: (v) => v + "%" } },
          y1: { position: "right", beginAtZero: true, grid: { color: "rgba(255,255,255,.05)", drawBorder: false }, ticks: { color: "rgba(255,255,255,.8)" } },
          x: { grid: { color: "rgba(255,255,255,.1)", drawBorder: false }, ticks: { color: "rgba(255,255,255,.8)" } }
        },
        plugins: { legend: { position: "top", labels: { color: "rgba(255,255,255,.8)" } } }
      }
    });
  }

  async loadChartJS() {
    if (window.Chart) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ----------------------- MATH TEXT NORMALIZER ----------------------- */

  normalizeMathInText(str) {
    if (!str || typeof str !== "string") return str;
    // You can add light cleanups here if needed; keep it conservative for MathJax.
    return str;
  }

  /* ----------------------- FLOW HELPERS ----------------------- */

  retryQuiz() {
    this.currentIndex = 0;
    this.selected = null;
    this.stats = {};
    this.performanceMetrics = {};
    this.renderQuestion();
  }

  startNewQuiz() {
    const quiz = document.getElementById("quiz");
    const chapters = document.getElementById("chapters");
    if (quiz && chapters) {
      quiz.classList.add("hidden");
      chapters.classList.remove("hidden");
    }
  }

  keyHandler(e) {
    if (e.key === "Enter") {
      const nextBtn = document.getElementById("nextBtn");
      if (nextBtn && !nextBtn.disabled) {
        if (nextBtn.textContent.includes("Next Question")) {
          this.currentIndex++;
          this.renderQuestion("left");
        } else {
          this.confirmSelection();
        }
      }
    }
  }

  startTimer(mins) {
    clearInterval(this.timerInterval);
    if (!mins || mins <= 0) return;

    let time = mins * 60;
    const timerEl = document.getElementById("timer");

    this.timerInterval = setInterval(() => {
      time--;
      if (time < 0) {
        clearInterval(this.timerInterval);
        this.showResults();
      } else if (timerEl) {
        const m = Math.floor(time / 60);
        const s = String(time % 60).padStart(2, "0");
        timerEl.textContent = `${m}:${s}`;
      }
    }, 1000);
  }

    loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(this.profileKey)) || {};
    } catch {
      return {};
    }
  }

  saveProfile() {
    try {
      localStorage.setItem(this.profileKey, JSON.stringify(this.profile));
    } catch {}
  }

  updateProfile() {
    const subj = (this.subject || "unknown").toLowerCase();
    if (!this.profile[subj]) this.profile[subj] = {};

    // totals
    if (!this.profile[subj].totals) this.profile[subj].totals = { correct: 0, total: 0 };
    this.profile[subj].totals.correct += this.performanceMetrics.correctAnswers;
    this.profile[subj].totals.total += this.performanceMetrics.totalQuestions;

    // per type
    Object.entries(this.stats).forEach(([type, data]) => {
      if (!this.profile[subj][type]) this.profile[subj][type] = { correct: 0, total: 0 };
      this.profile[subj][type].correct += data.correct;
      this.profile[subj][type].total += data.total;
    });

    // global summary
    let globalCorrect = 0, globalTotal = 0;
    Object.values(this.profile).forEach((s) => {
      if (s.totals) {
        globalCorrect += s.totals.correct;
        globalTotal += s.totals.total;
      }
    });

    this.profile.__overall = {
      correct: globalCorrect,
      total: globalTotal,
      accuracy: globalTotal ? Math.round((globalCorrect / globalTotal) * 100) : 0
    };

    this.saveProfile();
  }

  renderProfileSummary() {
    const el = document.getElementById("profileDump");
    if (!el) return;
    const p = this.profile;
    const lines = [];

    lines.push(`Overall accuracy: ${p.__overall?.accuracy || 0}%`);
    Object.keys(p)
      .filter(k => !k.startsWith("__"))
      .forEach(subj => {
        const s = p[subj];
        const tot = s.totals || {correct:0,total:0};
        const acc = tot.total ? Math.round((tot.correct/tot.total)*100) : 0;
        lines.push(`\n📘 ${subj.toUpperCase()}: ${acc}% (${tot.correct}/${tot.total})`);
        Object.entries(s).forEach(([type,v])=>{
          if(type==="totals") return;
          const tAcc = v.total ? Math.round((v.correct/v.total)*100) : 0;
          lines.push(`   • ${type}: ${tAcc}% (${v.correct}/${v.total})`);
        });
      });

    el.textContent = lines.join("\n");
  }


  destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.keyHandlerBound) document.removeEventListener("keydown", this.keyHandlerBound);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    if (this.renderTimeout) clearTimeout(this.renderTimeout);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

/* ----------------------- Bootstrap ----------------------- */

document.addEventListener("DOMContentLoaded", () => {
  // Preload indexes (optional hints for CDN / dev server)
  ["physics", "chemistry", "math", "biology"].forEach((s) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = `./data/${s}/index.json`;
    link.as = "fetch";
    document.head.appendChild(link);
  });

  window.DeltaBase = new DeltaBase();
  window.DeltaBase.init();
});

window.addEventListener("beforeunload", () => {
  if (window.DeltaBase) window.DeltaBase.destroy();
});