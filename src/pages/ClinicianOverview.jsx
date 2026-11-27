import { useOutletContext } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { RevealSection } from './ClinicianView'
import WeeklyGrid from '../components/WeeklyGrid'
import SosAlert from '../components/SosAlert'
import WorthTalkingAbout from '../components/WorthTalkingAbout'
import { familyName } from '../lib/childProfile'

export default function ClinicianOverview() {
  const {
    parentNotesArray: parentNotes,
    allMealItems: parentMealItems,
    mealStatuses: parentMealStatuses,
    mealDistress: parentMealDistress,
    markPatientParentNoteReadById,
    patients,
    viewingPatientUid,
    patientSos,
    acknowledgeSos,
    patientsWithOpenSos,
    childProfile,
  } = useFirebaseData()
  const { setSelectedDay } = useOutletContext()

  return (
    <>
      <SosAlert
        sos={patientSos}
        patientEmail={familyName(childProfile, patients.find(p => p.uid === viewingPatientUid)?.email)}
        onAcknowledge={acknowledgeSos}
      />
      <div style={{ marginTop: 20 }}>
        <WorthTalkingAbout
          mealStatuses={parentMealStatuses}
          mealDistress={parentMealDistress}
          allMealItems={parentMealItems}
          parentNotes={parentNotes}
          sosOpen={!!patientsWithOpenSos[viewingPatientUid]}
        />
      </div>
      <RevealSection eyebrow="Week at a glance">
        <WeeklyGrid
          onDayClick={(day, date) => setSelectedDay({ key: day, date })}
          parentNotes={parentNotes}
          onMarkNoteRead={markPatientParentNoteReadById}
          parentMealItems={parentMealItems}
          mealStatuses={parentMealStatuses}
          mealDistress={parentMealDistress}
        />
      </RevealSection>
    </>
  )
}
