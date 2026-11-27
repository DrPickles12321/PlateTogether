// A few everyday family foods per meal, offered to families who are just starting so the add-food
// sheet isn't empty. Deliberately neutral: no "safe" or "challenge" labels, because each family sets
// its own types with its clinician. DRAFT for clinician review (docs/clinical/2026-11-26-wording-review.md).
export const STARTER_FOODS = {
  breakfast: ['Toast', 'Oatmeal', 'Cereal with milk', 'Yogurt', 'Banana', 'Scrambled eggs', 'Bagel', 'Pancakes'],
  lunch: ['Turkey sandwich', 'Grilled cheese', 'Pasta', 'Quesadilla', 'Soup', 'Mac and cheese', 'Chicken wrap', 'Pizza'],
  snack: ['Apple', 'Cheese and crackers', 'Granola bar', 'Pretzels', 'Grapes', 'Peanut butter crackers', 'Trail mix', 'Muffin'],
  dinner: ['Pasta with sauce', 'Rice', 'Chicken', 'Tacos', 'Salmon', 'Burger', 'Potatoes', 'Stir fry'],
}

export const ALL_STARTER_FOODS = [...new Set(Object.values(STARTER_FOODS).flat())]

// Fewer saved foods than this and the sheet opens with starter ideas.
export const NEW_FAMILY_FOODS = 8

// Starter ideas for one meal, leaving out foods the family already has.
export function starterIdeas(mealKey, existingNames = []) {
  const have = new Set(existingNames.map(n => String(n).trim().toLowerCase()))
  return (STARTER_FOODS[mealKey] || []).filter(n => !have.has(n.toLowerCase()))
}
