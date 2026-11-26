import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import MobileTabBar from '../components/MobileTabBar'
import ChatWidget from '../components/ChatWidget'
import WelcomeModal from '../components/WelcomeModal'

const PAGE_TITLES = {
  '/parent/daily': 'Today',
  '/parent/weekly': 'Week',
  '/parent/stats': 'Insights',
  '/parent/notes': 'Notes',
  '/parent/account': 'Account',
}

export default function ParentView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const isMobile = useIsMobile()
  const { pathname } = useLocation()

  const {
    allMealItems,
    mealStatuses,
    parentNotesArray: parentNotes,
    saveParentNote,
    deleteParentNote,
    clinicianNotesRead,
    markClinicianNoteRead,
    savedClinicianNotes,
    saveClinicianNote,
    unsaveClinicianNote,
    clearAllSavedNotes,
    setMealStatus,
    clinicianNotes,
  } = useFirebaseData()

  useEffect(() => {
    const page = PAGE_TITLES[pathname] || 'Plate Together'
    document.title = `${page} · Plate Together`
  }, [pathname])

  return (
    <>
      {/* Bottom padding clears the fixed tab bar so nothing hides behind it. */}
      <div key={pathname} className="pt-rise" style={{ width: '100%', padding: isMobile ? '4px 0 88px' : '16px 24px 88px' }}>
        <Outlet context={{ clinicianNotes, parentNotes, clinicianNotesRead, mealStatuses, savedClinicianNotes, allMealItems, weekOffset, setWeekOffset, saveParentNote, deleteParentNote, markClinicianNoteRead, saveClinicianNote, unsaveClinicianNote, clearAllSavedNotes, setMealStatus }} />
      </div>
      {isMobile && <MobileTabBar />}
      <ChatWidget />
      <WelcomeModal role="parent" />
    </>
  )
}
