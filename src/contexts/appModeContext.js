import { createContext } from 'react'

export const AppModeContext = createContext({ mode: 'general', setMode: () => {}, hideNutritionNumbers: false })
