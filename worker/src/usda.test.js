import { describe, it, expect } from 'vitest'
import { tidyUsdaName, pickResults, mapCategoryToGroup, extractNutrients, isRelevant, relevantCount } from './usda'

describe('branded names', () => {
  it('drops package sizes and counts, and quietens shouting capitals', () => {
    expect(tidyUsdaName("Smucker's 1.8 Ounce Uncrustables Chocolate Hazelnut 10 Pack")).toBe("Smucker's Uncrustables Chocolate Hazelnut")
    expect(tidyUsdaName("SMUCKER'S 1.8 OUNCE UNCRUSTABLES PEANUT BUTTER ONLY 10 Pack")).toBe("Smucker's uncrustables peanut butter only")
    expect(tidyUsdaName('Goldfish Crackers 6.6 oz')).toBe('Goldfish Crackers')
  })
})

describe('isRelevant and relevantCount', () => {
  it('needs every typed word, allowing plurals', () => {
    expect(isRelevant('Goldfish crackers, cheddar', 'goldfish crackers')).toBe(true)
    expect(isRelevant('Crackers, rice', 'goldfish crackers')).toBe(false)
    expect(isRelevant('Cracker chips', 'crackers')).toBe(true)
  })
  it('counts only relevant results, so generic lists still trigger the branded search', () => {
    expect(relevantCount([{ name: 'Crackers, rice' }, { name: 'Cracker chips' }, { name: 'Crackers, milk' }], 'goldfish crackers')).toBe(0)
  })
})

describe('tidyUsdaName', () => {
  it('drops USDA filler and keeps the food', () => {
    expect(tidyUsdaName('Garlic bread, NFS')).toBe('Garlic bread')
    expect(tidyUsdaName('Pasta, NS as to type, cooked')).toBe('Pasta, cooked')
  })
  it('turns all-caps brand labels into sentence case', () => {
    expect(tidyUsdaName('GARLIC BREAD')).toBe('Garlic bread')
  })
  it('title-cases a brand written in capitals inside a label', () => {
    expect(tidyUsdaName('Cereals ready-to-eat, GENERAL MILLS, CHEERIOS')).toBe('Cereals ready-to-eat, General Mills, Cheerios')
  })
  it('keeps at most three parts and 60 characters', () => {
    expect(tidyUsdaName('Milk, whole, 3.25% milkfat, with added vitamin D')).toBe('Milk, whole, 3.25% milkfat')
    expect(tidyUsdaName('Garlic bread, with parmesan cheese, from fast food / restaurant')).toBe('Garlic bread, with parmesan cheese')
  })
  it('handles empty input', () => {
    expect(tidyUsdaName('')).toBe('')
    expect(tidyUsdaName(null)).toBe('')
  })
})

describe('pickResults', () => {
  const foods = [
    { description: 'Garlic bread, with melted cheese, from frozen', foodCategory: 'Yeast breads' },
    { description: 'Garlic bread, NFS', foodCategory: 'Yeast breads' },
    { description: 'GARLIC BREAD', foodCategory: 'Breads & Buns' },
    { description: 'Bread, garlic, frozen', foodCategory: 'Baked Products' },
    { description: 'Garlic bread, frozen', foodCategory: 'Baked Products' },
  ]
  it('dedupes tidied names and puts the simplest best match first', () => {
    const got = pickResults(foods, 'garlic bread', 8).map(r => r.name)
    expect(got).toEqual(['Garlic bread', 'Garlic bread, frozen', 'Garlic bread, with melted cheese, from frozen', 'Bread, garlic, frozen'])
  })
  it('respects the limit and carries group and nutrition', () => {
    const got = pickResults(foods, 'garlic', 2)
    expect(got).toHaveLength(2)
    expect(got[0]).toHaveProperty('group', 'grain')
    expect(got[0]).toHaveProperty('nutrition')
  })
})

describe('mapCategoryToGroup and extractNutrients', () => {
  it('maps categories to coarse groups', () => {
    expect(mapCategoryToGroup('Dairy and Egg Products')).toBe('dairy')
    expect(mapCategoryToGroup({ description: 'Fruits and Fruit Juices' })).toBe('produce')
    expect(mapCategoryToGroup('')).toBe('mixed')
  })
  it('reads kcal energy and macros, rounded', () => {
    const food = { foodNutrients: [
      { nutrientName: 'Energy', unitName: 'KCAL', value: 350.04 },
      { nutrientName: 'Energy', unitName: 'kJ', value: 1464 },
      { nutrientName: 'Protein', value: 8.26 },
      { nutrientName: 'Carbohydrate, by difference', value: 42.1 },
      { nutrientName: 'Total lipid (fat)', value: 16.7 },
    ] }
    expect(extractNutrients(food)).toEqual({ calories: 350, protein_g: 8.3, carbs_g: 42.1, fat_g: 16.7, fiber_g: 0 })
  })
})
