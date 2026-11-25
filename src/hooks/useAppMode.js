import { useContext } from 'react'
import { AppModeContext } from '../contexts/appModeContext'

export function useAppMode() {
  return useContext(AppModeContext)
}
