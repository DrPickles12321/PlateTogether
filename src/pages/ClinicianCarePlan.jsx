import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { RevealSection, SectionCard, ClinicianSupplementEditor } from './ClinicianView'
import ChallengeAssigner from '../components/ChallengeAssigner'
import FamilyPlanEditor from '../components/FamilyPlanEditor'
import NutritionDisplaySwitch from '../components/NutritionDisplaySwitch'
import WeeklyGoals from '../components/WeeklyGoals'
import NutritionalTargets from '../components/NutritionalTargets'
import { useIsMobile } from '../hooks/useIsMobile'

export default function ClinicianCarePlan() {
  const {
    allMealItems: parentMealItems,
    prescribedSupplements,
    savePrescribedSupplements,
    assignedChallenges,
    addAssignedChallenge,
    removeAssignedChallenge,
    carePlan,
    saveCarePlan,
    viewingPatientUid,
    nutritionDisplay,
    setNutritionDisplay,
  } = useFirebaseData()
  const isMobile = useIsMobile()

  return (
    <>
      <RevealSection eyebrow="Family's meal plan">
        <SectionCard>
          <FamilyPlanEditor key={`${viewingPatientUid}-${carePlan?.updatedAt || ''}`} plan={carePlan} onSave={saveCarePlan} />
        </SectionCard>
      </RevealSection>

      <RevealSection eyebrow="Nutrition numbers">
        <SectionCard>
          <NutritionDisplaySwitch key={viewingPatientUid} setting={nutritionDisplay} onChange={setNutritionDisplay} />
        </SectionCard>
      </RevealSection>

      <RevealSection eyebrow="Challenge foods">
        <SectionCard>
          <ChallengeAssigner
            challenges={assignedChallenges}
            onAdd={addAssignedChallenge}
            onRemove={removeAssignedChallenge}
          />
        </SectionCard>
      </RevealSection>

      <RevealSection eyebrow="Weekly goals" delay={1}>
        <SectionCard>
          <WeeklyGoals allMealItems={parentMealItems} />
        </SectionCard>
      </RevealSection>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginTop: 32 }}>
        <RevealSection eyebrow="Supplements" style={{ marginTop: 0 }}>
          <SectionCard style={{ height: '100%' }}>
            <ClinicianSupplementEditor
              prescribedSupplements={prescribedSupplements}
              onSave={savePrescribedSupplements}
            />
          </SectionCard>
        </RevealSection>
        <RevealSection eyebrow="Nutritional targets" delay={1} style={{ marginTop: 0 }}>
          <SectionCard style={{ height: '100%' }}>
            <NutritionalTargets />
          </SectionCard>
        </RevealSection>
      </div>
    </>
  )
}
