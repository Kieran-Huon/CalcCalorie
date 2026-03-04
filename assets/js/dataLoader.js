// Liste des catégories (fichiers) à charger.
// Tu peux en ajouter facilement (ex: "poissons", "sauces", etc.)
export const CATEGORIES = [
  { key: "fruits", label: "Fruits" },
  { key: "legumes", label: "Légumes" },
  { key: "feculents", label: "Féculents" },
  { key: "viandes", label: "Viandes" },
  { key: "produits_laitiers", label: "Produits laitiers" },
  { key: "boissons", label: "Boissons" },
  { key: "snacks", label: "Snacks" },
];

export async function loadAllFoods() {
  const all = [];
  for (const cat of CATEGORIES) {
    const res = await fetch(`./data/aliments/${cat.key}.json`);
    if (!res.ok) {
      console.warn(`Catégorie manquante: ${cat.key}.json`);
      continue;
    }
    const items = await res.json();
    for (const item of items) {
      all.push({
        ...item,
        category: cat.key,
        categoryLabel: cat.label
      });
    }
  }
  return all;
}
