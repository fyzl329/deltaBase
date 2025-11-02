class ProfilePage {
  constructor() {
    this.profileKey = "db:profile";
    this.profile = this.loadProfile();
    this.init();
  }

  loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(this.profileKey)) || {};
    } catch {
      return {};
    }
  }

  saveProfile() {
    localStorage.setItem(this.profileKey, JSON.stringify(this.profile));
  }

    init() {
    this.renderSummary();
    this.renderChart();
    this.loadUserName();
    this.setupNameEdit();
    }

    renderSummary() {
    const root = document.getElementById("summary");
    if (!root) return;

    const p = this.profile;
    if (!p.__overall) {
        root.innerHTML = `<div style="text-align:center;">No quiz data yet.<br>Take a quiz to see your performance!</div>`;
        return;
    }

    let html = `
        <div class="profile-wrapper">
        <div class="profile-header">
            <h1>📈 My Performance Profile</h1>
            <p style="color:rgba(255,255,255,0.7); margin-top:0.5rem;">
            Overall Accuracy: <strong>${p.__overall.accuracy}%</strong>
            </p>
        </div>
        <div class="profile-grid">
    `;

    Object.keys(p)
        .filter(k => !k.startsWith("__"))
        .forEach(subj => {
        const s = p[subj];
        const tot = s.totals || { correct: 0, total: 0 };
        const acc = tot.total ? Math.round((tot.correct / tot.total) * 100) : 0;

        html += `
            <div class="profile-card">
            <h3>${subj.toUpperCase()}</h3>
            <div class="profile-accuracy">${acc}%</div>
            <div class="profile-bar"><div class="profile-bar-fill" style="width:${acc}%;"></div></div>
            <p style="font-size:0.9rem; opacity:0.8;">${tot.correct}/${tot.total} correct</p>
            <ul class="profile-types">
        `;
        Object.entries(s).forEach(([type, v]) => {
            if (type === "totals") return;
            const tAcc = v.total ? Math.round((v.correct / v.total) * 100) : 0;
            html += `<li>• ${type}: <strong>${tAcc}%</strong> (${v.correct}/${v.total})</li>`;
        });
        html += `
            </ul>
            </div>
        `;
        });

    html += `
        </div>
        <div class="profile-chart">
            <canvas id="profileChart" width="800" height="400"></canvas>
        </div>
        </div>
    `;

    root.innerHTML = html;
    }


  renderChart() {
    if (!this.profile.__overall || !window.Chart) return;
    const ctx = document.getElementById("profileChart");
    if (!ctx) return;

    const subjects = Object.keys(this.profile).filter(k => !k.startsWith("__"));
    const accuracies = subjects.map(k => {
      const s = this.profile[k].totals;
      return s && s.total ? Math.round((s.correct / s.total) * 100) : 0;
    });

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: subjects.map(s => s.toUpperCase()),
        datasets: [{
          label: "Overall Accuracy (%)",
          data: accuracies,
          backgroundColor: "rgba(100,181,246,.8)",
          borderColor: "rgba(100,181,246,1)",
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, max: 100 }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

    loadUserName() {
    const input = document.getElementById("username");
    if (!input) return;
    const storedName = localStorage.getItem("db:userName") || "";
    input.value = storedName;
    }

    setupNameEdit() {
    const input = document.getElementById("username");
    const saveBtn = document.getElementById("saveName");
    const status = document.getElementById("saveStatus");

    if (!input || !saveBtn) return;

    saveBtn.onclick = () => {
        const name = input.value.trim();
        if (!name) {
        status.textContent = "Please enter a name.";
        status.style.color = "#ff7675";
        return;
        }

        localStorage.setItem("db:userName", name);
        status.textContent = "Saved!";
        status.style.color = "#2ecc71";

        setTimeout(() => (status.textContent = ""), 2000);
    };
    }


  resetProfile() {
    if (!confirm("This will clear all stored progress. Continue?")) return;
    localStorage.removeItem(this.profileKey);
    location.reload();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.Profile = new ProfilePage();
});
