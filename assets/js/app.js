import {
  getFavorites,
  toggleFavorite,
  isFavorite,
  addJournalEntry,
  removeJournalEntry,
  clearMeal,
  clearDay,
  getJournal,
  ensureDay,
  getProfile,
  setProfile
} from "./storage.js";

import {
  computePortionMacros,
  dateKey,
  formatFRDate,
  sumEntries,
  computeBMR,
  computeTDEE,
  computeGoalKcal
} from "./nutrition.js";

import { CATEGORIES, loadAllFoods } from "./dataLoader.js";

const state = {
  foods: [],
  activeView: "dashboard",
  dayKey: dateKey(),
  activeMeal: "breakfast",
  query: "",
  category: "all",
  qty: 100,
  qtyUnit: "g",
  addMeal: "breakfast",
};

const $ = (sel) => document.querySelector(sel);

function setView(view) {
  state.activeView = view;
  document.querySelectorAll(".view").forEach(v => {
    v.classList.toggle("hidden", v.dataset.view !== view);
  });
  document.querySelectorAll(".navbtn").forEach(b => {
    b.classList.toggle("active", b.dataset.go === view);
  });

  // refresh content
  renderAll();
}

function setMeal(meal) {
  state.activeMeal = meal;
  // update chips
  document.querySelectorAll("#mealTabs .chip").forEach(c => {
    c.classList.toggle("active", c.dataset.meal === meal);
  });
  renderJournal();
}

function foodLabel(food) {
  return `${food.name} • ${food.kcal} kcal/${food.unit || "100g"}`;
}

function createItem({
  title,
  subtitle,
  right,
  onAdd,
  onStar,
  starred,
  onDelete,
  deleteLabel = "Supprimer"
}) {
  const el = document.createElement("div");
  el.className = "item";

  const main = document.createElement("div");
  main.className = "item-main";

  const t = document.createElement("div");
  t.className = "item-title";
  t.textContent = title;

  const sub = document.createElement("div");
  sub.className = "item-sub";
  sub.textContent = subtitle;

  main.appendChild(t);
  main.appendChild(sub);

  const actions = document.createElement("div");
  actions.className = "item-actions";

  if (right) {
    const r = document.createElement("div");
    r.className = "item-sub";
    r.textContent = right;
    actions.appendChild(r);
  }

  if (onStar) {
    const star = document.createElement("button");
    star.className = "iconbtn star" + (starred ? " active" : "");
    star.textContent = "⭐";
    star.title = starred ? "Retirer des favoris" : "Ajouter aux favoris";
    star.addEventListener("click", onStar);
    actions.appendChild(star);
  }

  if (onAdd) {
    const add = document.createElement("button");
    add.className = "iconbtn";
    add.textContent = "➕";
    add.title = "Ajouter au journal";
    add.addEventListener("click", onAdd);
    actions.appendChild(add);
  }

  if (onDelete) {
    const del = document.createElement("button");
    del.className = "iconbtn delete";
    del.textContent = "🗑️";
    del.title = deleteLabel;
    del.addEventListener("click", onDelete);
    actions.appendChild(del);
  }

  el.appendChild(main);
  el.appendChild(actions);
  return el;
}

function getTodayEntries() {
  const journal = ensureDay(getJournal(), state.dayKey);
  const day = journal[state.dayKey];
  const all = [
    ...day.breakfast,
    ...day.lunch,
    ...day.dinner,
    ...day.snack
  ];
  return { day, all };
}

function getGoalKcalFromProfile() {
  const p = getProfile();
  const bmr = computeBMR(p);
  const tdee = computeTDEE(bmr, p.activity);
  const goal = computeGoalKcal(tdee, p.goal, p.delta);
  return { bmr, tdee, goal };
}

function renderRing(sumKcal, goalKcal) {
  const ring = $("#ring");
  const pct = goalKcal > 0 ? Math.min(100, Math.round((sumKcal / goalKcal) * 100)) : 0;
  $("#ringPercent").textContent = `${pct}%`;

  const deg = Math.round((pct / 100) * 360);
  ring.style.background = `conic-gradient(var(--accent) ${deg}deg, rgba(255,255,255,.08) 0deg)`;
}

function renderDashboardTotals() {
  const { all } = getTodayEntries();
  const sums = sumEntries(all);

  $("#sumKcal").textContent = sums.kcal;
  $("#sumP").textContent = sums.protein;
  $("#sumC").textContent = sums.carbs;
  $("#sumF").textContent = sums.fat;

  const { goal } = getGoalKcalFromProfile();
  $("#goalKcal").textContent = goal > 0 ? `${goal} kcal` : "—";
  renderRing(sums.kcal, goal);
}

function renderJournal() {
  const { day } = getTodayEntries();
  const list = $("#journalList");
  list.innerHTML = "";

  const entries = day[state.activeMeal] || [];
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Aucune entrée dans ce repas pour le moment.";
    list.appendChild(empty);
    return;
  }

  for (const e of entries.slice().reverse()) {
    const el = createItem({
      title: e.name,
      subtitle: `${e.qty}${e.qtyUnit} • ${e.kcal} kcal | P ${e.protein}g • G ${e.carbs}g • L ${e.fat}g`,
      right: e.categoryLabel,
      onDelete: () => {
        removeJournalEntry(state.dayKey, state.activeMeal, e.entryId);
        renderAll();
      },
      deleteLabel: "Supprimer cette entrée"
    });
    list.appendChild(el);
  }
}

function filteredFoods() {
  const q = state.query.trim().toLowerCase();
  return state.foods.filter(f => {
    const okCat = state.category === "all" ? true : f.category === state.category;
    const okQ = q ? f.name.toLowerCase().includes(q) : true;
    return okCat && okQ;
  });
}

function addFoodToJournal(food) {
  const qty = Number(state.qty);
  const qtyUnit = state.qtyUnit;

  const macros = computePortionMacros(food, qty, qtyUnit);
  const entry = {
    entryId: crypto.randomUUID(),
    foodId: food.id,
    name: food.name,
    category: food.category,
    categoryLabel: food.categoryLabel,
    qty,
    qtyUnit,
    ...macros
  };
  addJournalEntry(state.dayKey, state.addMeal, entry);
  setView("dashboard");
}

function renderFavoritesBlock(targetEl, { allowAdd = true } = {}) {
  targetEl.innerHTML = "";
  const favIds = getFavorites();
  const favFoods = favIds
    .map(id => state.foods.find(f => f.id === id))
    .filter(Boolean);

  if (favFoods.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Aucun favori pour le moment. Ajoute-en avec ⭐.";
    targetEl.appendChild(empty);
    return;
  }

  for (const f of favFoods) {
    const el = createItem({
      title: f.name,
      subtitle: `${f.kcal} kcal/${f.unit || "100g"} • ${f.categoryLabel}`,
      onStar: () => {
        toggleFavorite(f.id);
        renderAll();
      },
      starred: true,
      onAdd: allowAdd ? () => addFoodToJournal(f) : null
    });
    targetEl.appendChild(el);
  }
}

function renderResults() {
  const list = $("#resultsList");
  list.innerHTML = "";

  const items = filteredFoods().slice(0, 80);
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Aucun résultat. Essaie une autre recherche.";
    list.appendChild(empty);
    return;
  }

  for (const f of items) {
    const el = createItem({
      title: f.name,
      subtitle: `${f.kcal} kcal/${f.unit || "100g"} • P ${f.protein}g • G ${f.carbs}g • L ${f.fat}g`,
      right: f.categoryLabel,
      starred: isFavorite(f.id),
      onStar: () => {
        toggleFavorite(f.id);
        renderAll();
      },
      onAdd: () => addFoodToJournal(f)
    });
    list.appendChild(el);
  }
}

function renderCategorySelect() {
  const sel = $("#categorySelect");
  sel.innerHTML = `<option value="all">Toutes catégories</option>`;
  for (const c of CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = c.key;
    opt.textContent = c.label;
    sel.appendChild(opt);
  }
  sel.value = state.category;
}

function renderProfile() {
  const p = getProfile();
  $("#sex").value = p.sex;
  $("#age").value = p.age;
  $("#height").value = p.height;
  $("#weight").value = p.weight;
  $("#activity").value = String(p.activity);
  $("#goal").value = p.goal;
  $("#delta").value = p.delta;

  const bmr = computeBMR(p);
  const tdee = computeTDEE(bmr, p.activity);
  const goal = computeGoalKcal(tdee, p.goal, p.delta);

  $("#bmrOut").textContent = `${bmr} kcal`;
  $("#tdeeOut").textContent = `${tdee} kcal`;
  $("#goalOut").textContent = `${goal} kcal`;
}

function renderAll() {
  $("#todayLabel").textContent = formatFRDate(new Date());

  renderDashboardTotals();
  renderJournal();

  // ADD view blocks
  renderCategorySelect();
  renderFavoritesBlock($("#favoritesList"), { allowAdd: true });
  renderResults();

  // favorites page
  renderFavoritesBlock($("#favoritesPageList"), { allowAdd: true });

  // profile
  renderProfile();
}

/* Events */
function bindEvents() {
  // nav
  document.querySelectorAll(".navbtn").forEach(btn => {
    btn.addEventListener("click", () => setView(btn.dataset.go));
  });

  // search
  $("#searchInput").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderResults();
  });

  // category
  $("#categorySelect").addEventListener("change", (e) => {
    state.category = e.target.value;
    renderResults();
  });

  // qty
  $("#qtyInput").addEventListener("input", (e) => {
    state.qty = Math.max(1, Number(e.target.value || 1));
  });
  $("#qtyUnit").addEventListener("change", (e) => {
    state.qtyUnit = e.target.value;
  });

  // add meal target
  $("#addMealSelect").addEventListener("change", (e) => {
    state.addMeal = e.target.value;
  });

  // dashboard meal
  $("#mealSelect").addEventListener("change", (e) => {
    setMeal(e.target.value);
  });

  $("#mealTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const meal = btn.dataset.meal;
    $("#mealSelect").value = meal;
    setMeal(meal);
  });

  $("#clearMealBtn").addEventListener("click", () => {
    clearMeal(state.dayKey, state.activeMeal);
    renderAll();
  });

  $("#resetDayBtn").addEventListener("click", () => {
    if (!confirm("Réinitialiser toutes les entrées d’aujourd’hui ?")) return;
    clearDay(state.dayKey);
    renderAll();
  });

  // profile save
  $("#saveProfileBtn").addEventListener("click", () => {
    const p = {
      sex: $("#sex").value,
      age: Number($("#age").value),
      height: Number($("#height").value),
      weight: Number($("#weight").value),
      activity: Number($("#activity").value),
      goal: $("#goal").value,
      delta: Number($("#delta").value),
    };
    setProfile(p);
    renderAll();
    alert("Profil enregistré ✅");
  });

  $("#resetProfileBtn").addEventListener("click", () => {
    if (!confirm("Réinitialiser le profil ?")) return;
    setProfile({
      sex: "male",
      age: 25,
      height: 175,
      weight: 70,
      activity: 1.55,
      goal: "maintain",
      delta: 300
    });
    renderAll();
  });
}

async function init() {
  // default selects
  $("#qtyUnit").value = state.qtyUnit;
  $("#addMealSelect").value = state.addMeal;
  $("#mealSelect").value = state.activeMeal;

  bindEvents();

  // load foods
  state.foods = await loadAllFoods();
  // if no foods, show something
  if (!state.foods.length) console.warn("Aucun aliment chargé. Vérifie /data/aliments/*.json");

  renderAll();
}

init();
