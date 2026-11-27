import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useAuth } from '../contexts/AuthContext'
import { RevealSection, SectionCard, ParentNotesPanel } from './ClinicianView'
import NotesPanel from '../components/NotesPanel'

export default function ClinicianNotesView() {
  const {
    parentNotesArray: parentNotes,
    markPatientParentNoteReadById,
    hiddenParentNoteIds,
    hideParentNote,
    unhideParentNote,
    clinicianNotesRead,
    clinicianNotes,
    writeClinicianNote,
    deleteClinicianNote,
  } = useFirebaseData()

  const { user } = useAuth()

  function handleSaveNote({ body, existingNoteId }) {
    writeClinicianNote({ body, existingNoteId })
  }

  return (
    <>
      <RevealSection eyebrow="Parent notes">
        <SectionCard>
          <ParentNotesPanel
            notes={parentNotes}
            onMarkRead={markPatientParentNoteReadById}
            hiddenNoteIds={hiddenParentNoteIds}
            onHideNote={hideParentNote}
            onUnhideNote={unhideParentNote}
          />
        </SectionCard>
      </RevealSection>

      <RevealSection eyebrow="Session notes" delay={1}>
        <SectionCard>
          <NotesPanel
            notes={clinicianNotes}
            mode="clinician"
            onSave={handleSaveNote}
            onDelete={deleteClinicianNote}
            notesReadByParent={clinicianNotesRead}
            currentUid={user?.uid || null}
          />
        </SectionCard>
      </RevealSection>
    </>
  )
}
