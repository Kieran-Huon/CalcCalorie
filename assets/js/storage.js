const KEYS = {
  FAVORITES: "ct_favorites_v1",
  JOURNAL: "ct_journal_v1",
  PROFILE: "ct_profile_v1",
};

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getFavorites() {
  return loadJSON(KEYS.FAVORITES, []);
}

export function setFavorites(ids) {
  saveJSON(KEYS.FAVORITES, ids);
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

export function toggleFavorite(id) {
  const favs = new Set(getFavorites());
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  const out = Array.from(favs);
  setFavorites(out);
  return out;
}

export function getJournal() {
  // Structure: { "YYYY-MM-DD": { breakfast:[], lunch:[], dinner:[], snack:[] } }
  return loadJSON(KEYS.JOURNAL, {});
}

export function setJournal(j) {
  saveJSON(KEYS.JOURNAL, j);
}

export function ensureDay(journal, dayKey) {
  if (!journal[dayKey]) {
    journal[dayKey] = { breakfast: [], lunch: [], dinner: [], snack: [] };
  } else {
    // ensure meals exist
    for (const m of ["breakfast","lunch","dinner","snack"]) {
      if (!Array.isArray(journal[dayKey][m])) journal[dayKey][m] = [];
    }
  }
  return journal;
}

export function addJournalEntry(dayKey, meal, entry) {
  const journal = ensureDay(getJournal(), dayKey);
  journal[dayKey][meal].push(entry);
  setJournal(journal);
  return journal;
}

export function removeJournalEntry(dayKey, meal, entryId) {
  const journal = ensureDay(getJournal(), dayKey);
  journal[dayKey][meal] = journal[dayKey][meal].filter(e => e.entryId !== entryId);
  setJournal(journal);
  return journal;
}

export function clearMeal(dayKey, meal) {
  const journal = ensureDay(getJournal(), dayKey);
  journal[dayKey][meal] = [];
  setJournal(journal);
  return journal;
}

export function clearDay(dayKey) {
  const journal = getJournal();
  delete journal[dayKey];
  setJournal(journal);
  return journal;
}

export function getProfile() {
  return loadJSON(KEYS.PROFILE, {
    sex: "male",
    age: 25,
    height: 175,
    weight: 70,
    activity: 1.55,
    goal: "maintain",
    delta: 300
  });
}

export function setProfile(p) {
  saveJSON(KEYS.PROFILE, p);
}
