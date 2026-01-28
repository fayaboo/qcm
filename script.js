/* =========================================================
   VARIABLES GLOBALES
========================================================= */

// Toutes les questions chargées depuis questions.json
let allQuestions = [];

// Questions du quiz en cours
let questions = [];

// Index de la question courante
let index = 0;

// Réponses utilisateur (clé = index question)
let reponses = {};

// Score final
let scoreFinal = 0;

// Temps restant (en secondes)
let temps = 1200;

// Thème sélectionné
let themeChoisi = null;

// Intervalle du timer
let timerInterval = null;


/* =========================================================
   OUTILS
========================================================= */

/**
 * Mélange un tableau (Fisher-Yates)
 * → fiable, sans biais
 */
function melanger(tableau) {
  const arr = [...tableau];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


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
   AFFICHAGE DES THÈMES
========================================================= */

function afficherThemes() {
  const container = document.getElementById("themes");
  container.innerHTML = "";

  // Récupération des thèmes uniques
  const themes = [...new Set(allQuestions.map(q => q.theme))];

  themes.forEach(theme => {
    const div = document.createElement("div");
    div.className = "theme-option";
    div.textContent = theme;
    div.onclick = () => selectionTheme(div, theme);
    container.appendChild(div);
  });

  // Bouton aléatoire
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

  // Sélection + mélange des questions
  let baseQuestions =
    themeChoisi === "ALEATOIRE"
      ? melanger(allQuestions).slice(0, 20)
      : melanger(allQuestions.filter(q => q.theme === themeChoisi));

  // Mélange des réponses (sauf pour les questions ordre)
  questions = baseQuestions.map(q => {
    if (q.type === "order") return q;
    return { ...q, options: melanger(q.options) };
  });

  // Réinitialisation
  index = 0;
  reponses = {};
  scoreFinal = 0;
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

    if (temps <= 0) {
      clearInterval(timerInterval);
      terminerQCM();
    }
  }, 1000);
}


/* =========================================================
   AFFICHAGE D’UNE QUESTION
========================================================= */

function afficherQuestion() {
  const q = questions[index];
  const quiz = document.getElementById("quiz");
  quiz.innerHTML = "";

  // ----- QUESTION ORDRE -----
  if (q.type === "order") {
    const ordre = reponses[index] || [...q.options];

    quiz.innerHTML = `
      <div class="quiz-question">${q.question}</div>
      <div class="order-hint">👆 Tape sur 2 éléments pour les échanger</div>
      <div class="order-list">
        ${ordre.map(o => `<div class="order-item">${o}</div>`).join("")}
      </div>
    `;

    activerOrdre();
    return;
  }

  // ----- SINGLE / MULTIPLE -----
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

      // SINGLE
      if (question.type === "single") {
        document.querySelectorAll(".quiz-option")
          .forEach(o => o.classList.remove("selected"));
        reponses[index] = [val];
        opt.classList.add("selected");
      }

      // MULTIPLE
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
   QUESTIONS ORDRE (CLICK / TAP – MOBILE SAFE)
========================================================= */

function activerOrdre() {
  let selectedItem = null;

  document.querySelectorAll(".order-item").forEach(item => {
    item.onclick = () => {

      // 1er tap → sélection
      if (!selectedItem) {
        selectedItem = item;
        item.classList.add("selected");
        return;
      }

      // Tap sur le même → annuler
      if (selectedItem === item) {
        item.classList.remove("selected");
        selectedItem = null;
        return;
      }

      // Échange
      const list = item.parentNode;
      const a = selectedItem;
      const b = item;
      const next = a.nextSibling === b ? a : a.nextSibling;

      list.insertBefore(a, b);
      list.insertBefore(b, next);

      // Feedback visuel + vibration
      a.classList.add("swapped");
      b.classList.add("swapped");
      if (navigator.vibrate) navigator.vibrate(30);

      setTimeout(() => {
        a.classList.remove("swapped");
        b.classList.remove("swapped");
      }, 300);

      a.classList.remove("selected");
      selectedItem = null;

      // Sauvegarde immédiate
      reponses[index] =
        [...document.querySelectorAll(".order-item")]
          .map(e => e.textContent);
    };
  });
}


/* =========================================================
   NAVIGATION
========================================================= */

document.getElementById("next").onclick = () => {
  if (index < questions.length - 1) index++;
  afficherQuestion();
  updateUI();
};

document.getElementById("prev").onclick = () => {
  if (index > 0) index--;
  afficherQuestion();
  updateUI();
};


/* =========================================================
   FIN DU QUIZ
========================================================= */

function terminerQCM() {
  clearInterval(timerInterval);
  scoreFinal = 0;

  questions.forEach((q, i) => {
    const r = reponses[i] || [];
    if (r.length === q.answer.length &&
        q.answer.every(v => r.includes(v))) {
      scoreFinal++;
    }
  });

  const quiz = document.getElementById("quiz");
  quiz.innerHTML = `
    <div class="result-final">
      📊 Résultat final<br>
      <strong>${scoreFinal} / ${questions.length}</strong>
    </div>
  `;

  document.getElementById("end-actions").style.display = "flex";
  document.querySelector(".card-footer").style.display = "none";

  setTimeout(() => {
    quiz.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

document.getElementById("submit").onclick = terminerQCM;


/* =========================================================
   CORRECTION
========================================================= */

function afficherCorrection() {
  const quiz = document.getElementById("quiz");
  quiz.innerHTML = "";

  questions.forEach((q, i) => {
    const user = reponses[i] || [];

    let html = `
      <div class="correction-card">
        <div class="quiz-question">${i + 1}. ${q.question}</div>
    `;

    if (q.type === "order") {
      html += `
        <div class="good">✅ Bon ordre</div>
        ${q.answer.map(o => `<div class="order-item good">${o}</div>`).join("")}
        <div class="bad">❌ Ton ordre</div>
        ${user.map(o => `<div class="order-item bad">${o}</div>`).join("")}
      `;
    } else {
      html += `<div class="quiz-options">`;
      q.options.forEach(opt => {
        let cls = "quiz-option";
        if (q.answer.includes(opt)) cls += " good";
        if (user.includes(opt) && !q.answer.includes(opt)) cls += " bad";
        html += `<div class="${cls}">${opt}</div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
    quiz.innerHTML += html;
  });

  quiz.innerHTML += `
    <div class="result-final">
      📊 Résultat final<br>
      <strong>${scoreFinal} / ${questions.length}</strong>
    </div>
  `;

  setTimeout(() => {
    quiz.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

document.getElementById("show-correction").onclick = afficherCorrection;


/* =========================================================
   UI
========================================================= */

function updateUI() {
  document.getElementById("progress").textContent =
    `Question ${index + 1} / ${questions.length}`;

  document.getElementById("submit").style.display =
    index === questions.length - 1 ? "block" : "none";
}


/* =========================================================
   RESTART
========================================================= */

document.getElementById("restart").onclick = () => {
  index = 0;
  reponses = {};
  scoreFinal = 0;
  temps = 1200;

  document.getElementById("quiz-screen").style.display = "none";
  document.getElementById("theme-screen").style.display = "block";
  document.getElementById("quiz").innerHTML = "";
  document.getElementById("end-actions").style.display = "none";
  document.querySelector(".card-footer").style.display = "flex";
};
