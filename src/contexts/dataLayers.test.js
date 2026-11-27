import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// Screens read one context; both data layers must fill exactly the same names, or a screen breaks on
// switch-over (lib/backend.js).
const valueNames = file => {
  const src = readFileSync(new URL(file, import.meta.url), 'utf8')
  const block = src.slice(src.indexOf('<FirebaseDataContext.Provider value={{'), src.indexOf('}}>', src.indexOf('<FirebaseDataContext.Provider value={{')))
  return [...block.matchAll(/^ {6}(\w+)[,:]/gm)].map(m => m[1]).sort()
}

describe('the two data layers', () => {
  it('offer the same values and functions', () => {
    const rtdb = valueNames('./FirebaseDataContext.jsx')
    const firestore = valueNames('./FirestoreDataProvider.jsx')
    expect(rtdb.length).toBeGreaterThan(60)
    expect(firestore).toEqual(rtdb)
  })
})
