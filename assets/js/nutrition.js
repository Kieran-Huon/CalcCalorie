export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function dateKey(d = new Date()) {
  // local yyyy-mm-dd
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatFRDate(d = new Date()) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/**
 * Convert a base macro per 100g (or unit base) to portion based on qty.
 * Convention:
 * - if qtyUnit is g or ml: base is per 100g/ml, multiplier = qty/100
 * - if qtyUnit is portion: base is per 1 portion, multiplier = qty
 */
export function computePortionMacros(food, qty, qtyUnit) {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return { kcal:0, protein:0, carbs:0, fat:0 };

  let mul = 1;
  if (qtyUnit === "portion") mul = q;     // base per 1 portion
  else mul = q / 100;                    // base per 100g/ml

  return {
    kcal: round1(food.kcal * mul),
    protein: round1(food.protein * mul),
    carbs: round1(food.carbs * mul),
    fat: round1(food.fat * mul)
  };
}

// Mifflin-St Jeor
export function computeBMR({ sex, age, height, weight }) {
  const a = Number(age), h = Number(height), w = Number(weight);
  if (![a,h,w].every(Number.isFinite)) return 0;
  const s = sex === "female" ? -161 : 5;
  return Math.round((10*w) + (6.25*h) - (5*a) + s);
}

export function computeTDEE(bmr, activity) {
  const act = Number(activity);
  if (!Number.isFinite(act) || act <= 0) return 0;
  return Math.round(bmr * act);
}

export function computeGoalKcal(tdee, goal, delta) {
  const d = Number(delta) || 0;
  if (goal === "cut") return Math.max(1200, Math.round(tdee - d));
  if (goal === "bulk") return Math.round(tdee + d);
  return Math.round(tdee);
}

export function sumEntries(entries) {
  let kcal=0, p=0, c=0, f=0;
  for (const e of entries) {
    kcal += e.kcal || 0;
    p += e.protein || 0;
    c += e.carbs || 0;
    f += e.fat || 0;
  }
  return {
    kcal: round1(kcal),
    protein: round1(p),
    carbs: round1(c),
    fat: round1(f)
  };
}
