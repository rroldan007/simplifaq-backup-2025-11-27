// Basic FR/EN token-level synonyms to improve product search matching
// Strategy: map common variants to a canonical token. We keep it simple and
// conservative to avoid over-matching.

const TOKEN_SYNONYMS: Record<string, string> = {
  // FR ↔ EN meats and forms
  boeuf: 'beef',
  boeufs: 'beef',
  porc: 'pork',
  poulet: 'chicken',
  dinde: 'turkey',
  agneau: 'lamb',
  hache: 'minced',
  hachee: 'minced',
  haches: 'minced',
  hachees: 'minced',
  mince: 'minced',
  minced: 'minced',
  ground: 'minced',

  // Vegetables
  aubergine: 'eggplant',
  aubergines: 'eggplant',
  courgette: 'zucchini',
  courgettes: 'zucchini',
  coriandre: 'cilantro',
  laitue: 'lettuce',

  // Potatoes/fries
  frites: 'fries',
  chips: 'fries', // UK -> US

  // Sugar types
  sucre: 'sugar',
  glace: 'powdered', // "sucre glace" -> powdered sugar (approx.)
  icing: 'powdered',
  caster: 'powdered',

  // Misc
  oeuf: 'egg',
  oeufs: 'egg',
};

export function applySynonyms(tokens: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    const canon = TOKEN_SYNONYMS[t] || t;
    if (!seen.has(t)) { seen.add(t); out.push(t); }
    if (!seen.has(canon)) { seen.add(canon); out.push(canon); }
  }
  return out;
}
