/* =========================================================
   VARIABLES GLOBALES
========================================================= */

let allQuestions = [];     // Toutes les questions
let questions = [];        // Questions du quiz courant
let index = 0;             // Index question courante
let reponses = {};         // Réponses utilisateur
let temps = 1200;          // 20 minutes
let themeChoisi = null;    // Thème sélectionné
let timerInterval = null;  // Timer


/* =========================================================
   CHARGEMENT DES QUESTIONS
========================================================= */

fetch("questions.json")
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
    afficherThemes();
  })
  .catch(() => alert("Erreur chargement questions.json"));


/* =========================================================
   THÈMES
========================================================= */

function afficherThemes() {
  const container = document.getElementById("themes");
  container.innerHTML = "";

  const themes = [...new Set(allQuestions.map(q => q.theme))];

  themes.forEach(theme => {
    const div = document.createElement("div");
    div.className = "theme-option";
    div.textContent = theme;
    div.onclick = () => selectionTheme(div, theme);
    container.appendChild(div);
  });

  // Thème aléatoire
  const random = document.createElement("div");
  random.className = "theme-option";
  random.textContent = "🎲 Aléatoire (toutes questions)";
  random.onclick = () => selectionTheme(random, "ALEATOIRE");
  container.appendChild(random);
}

function selectionTheme(el, theme) {
  document.querySelectorAll(".theme-option")
    .forEach(e => e.classList.remove("selected"));

  el.classList.add("selected");
  themeChoisi = theme;
}


/* =========================================================
   DÉMARRAGE DU QUIZ
========================================================= */

document.getElementById("start").onclick = () => {
  if (!themeChoisi) {
    alert("Veuillez choisir un thème");
    return;
  }

  // Sélection questions
  if (themeChoisi === "ALEATOIRE") {
    questions = [...allQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, 20);
  } else {
    questions = allQuestions.filter(q => q.theme === themeChoisi);
  }

  // Reset état
  index = 0;
  reponses = {};
  temps = 1200;

  document.getElementById("theme-screen").style.display = "none";
  document.getElementById("quiz-screen").style.display = "block";

  afficherQuestion();
  updateUI();
  lancerTimer();
};


/* =========================================================
   TIMER
========================================================= */

function lancerTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    temps--;
    document.getElementById("timer").textContent = `⏱ ${temps}s`;
    if (temps <= 0) terminerQCM();
  }, 1000);
}


/* =========================================================
   AFFICHAGE DES QUESTIONS
========================================================= */

function afficherQuestion() {
  const q = questions[index];
  const quiz = document.getElementById("quiz");
  quiz.innerHTML = "";

  /* ===== QUESTION ORDRE ===== */
  if (q.type === "order") {
    const ordre = reponses[index] || [...q.options];

    quiz.innerHTML = `
      <div class="quiz-question">${q.question}</div>
      <div class="order-list">
        ${ordre.map(o => `<div class="order-item">${o}</div>`).join("")}
      </div>
    `;

    activerOrdre();
    return;
  }

  /* ===== QUESTION SINGLE / MULTIPLE ===== */
  quiz.innerHTML = `
    <div class="quiz-question">${q.question}</div>
    <div class="quiz-options">
      ${q.options.map(o => `
        <div class="quiz-option ${q.type}
          ${reponses[index]?.includes(o) ? "selected" : ""}"
          data-value="${o}">
          ${o}
        </div>
      `).join("")}
    </div>
  `;

  activerSelection(q);
}


/* =========================================================
   SÉLECTION SINGLE / MULTIPLE
========================================================= */

function activerSelection(question) {
  document.querySelectorAll(".quiz-option").forEach(opt => {
    opt.onclick = () => {
      const val = opt.dataset.value;

      if (question.type === "single") {
        document.querySelectorAll(".quiz-option")
          .forEach(o => o.classList.remove("selected"));
        reponses[index] = [val];
        opt.classList.add("selected");
      }

      if (question.type === "multiple") {
        reponses[index] ??= [];
        const pos = reponses[index].indexOf(val);

        if (pos >= 0) {
          reponses[index].splice(pos, 1);
          opt.classList.remove("selected");
        } else {
          reponses[index].push(val);
          opt.classList.add("selected");
        }
      }
    };
  });
}


/* =========================================================
   ORDRE — CLICK / TAP + ÉCHANGE (FIABLE MOBILE)
========================================================= */

function activerOrdre() {
  let selectedItem = null;

  document.querySelectorAll(".order-item").forEach(item => {
    item.onclick = () => {

      // 1er clic → sélection
      if (!selectedItem) {
        selectedItem = item;
        item.classList.add("selected");
        return;
      }

      // Clic sur le même → annuler
      if (selectedItem === item) {
        item.classList.remove("selected");
        selectedItem = null;
        return;
      }

      // Échange des positions
      const list = item.parentNode;
      const item1 = selectedItem;
      const item2 = item;
      const next = item1.nextSibling === item2 ? item1 : item1.nextSibling;

      list.insertBefore(item1, item2);
      list.insertBefore(item2, next);

      item1.classList.remove("selected");
      selectedItem = null;
    };
  });
}


/* =========================================================
   SAUVEGARDE ORDRE
========================================================= */

function sauvegarderReponse() {
  const q = questions[index];
  if (q.type === "order") {
    reponses[index] =
      [...document.querySelectorAll(".order-item")]
        .map(e => e.textContent);
  }
}


/* =========================================================
   NAVIGATION
========================================================= */

document.getElementById("next").onclick = () => {
  sauvegarderReponse();
  if (index < questions.length - 1) index++;
  afficherQuestion();
  updateUI();
};

document.getElementById("prev").onclick = () => {
  sauvegarderReponse();
  if (index > 0) index--;
  afficherQuestion();
  updateUI();
};


/* =========================================================
   FIN DU QUIZ
========================================================= */

function terminerQCM() {
  clearInterval(timerInterval);
  sauvegarderReponse();

  let score = 0;
  questions.forEach((q, i) => {
    const r = reponses[i] || [];
    if (r.length === q.answer.length &&
        q.answer.every(v => r.includes(v))) {
      score++;
    }
  });

  document.getElementById("quiz").innerHTML = "";
  document.getElementById("result").innerHTML =
    `📊 Score final : <strong>${score}</strong> / ${questions.length}`;

  document.getElementById("end-actions").style.display = "flex";
  document.querySelector(".card-footer").style.display = "none";
  document.getElementById("submit").style.display = "none";
}


/* =========================================================
   UI
========================================================= */

function updateUI() {
  document.getElementById("progress").textContent =
    `Question ${index + 1} / ${questions.length}`;

  document.getElementById("submit").style.display =
    index === questions.length - 1 ? "block" : "none";
}

document.getElementById("submit").onclick = terminerQCM;


/* =========================================================
   ACTIONS FIN
========================================================= */

document.getElementById("restart").onclick = () => {
  index = 0;
  reponses = {};
  temps = 1200;

  document.getElementById("quiz-screen").style.display = "none";
  document.getElementById("theme-screen").style.display = "block";
  document.getElementById("result").innerHTML = "";
  document.getElementById("end-actions").style.display = "none";
  document.querySelector(".card-footer").style.display = "flex";
};
