# Anorexia focus: what families and clinicians struggle with, and what the product should do

Status: **proposal, not clinically reviewed.** Built from a few literature searches (sources at the
bottom) plus my own reasoning. Rows marked *(inference)* are my guess at a real problem, not
something I found a study for. Every clinical claim needs a clinician to confirm it before we
build on it.

Scope: adolescent anorexia nervosa treated with family-based treatment (FBT), where parents take
charge of meals at home and a clinician coaches them.

## The short version

1. The app should **support parents at the table and give the clinician a clear weekly picture.**
   Logging is only the input. The value is what the clinician and parents can do with it.
2. **Do not show calorie or nutrient numbers to parents or the teen.** Calorie-tracking apps are
   linked to more restraint and eating disorder symptoms in people with eating disorders (mostly
   survey studies, so correlation, not proof). The clinician can still see what they need.
3. Three jobs, in this order: **(A) help at the table, (B) catch warning signs early,
   (C) give the clinician a useful week-in-review.**
4. The clinician should **create the family and invite the parents**, instead of parents signing
   up with a code. That also gives us the per-family "app type" setting in the right place.
5. Keep it small. Most of this is a few screens and some simple rules, not new technology.

## Problems and what the product could do

| Problem | What helps in the product | Evidence |
|---|---|---|
| Parents cannot tell "hard but normal" from "call someone today". | A short **warning-signs card** written by the clinician: what to watch for, and exactly who to call and when. Fainting, chest pain, a pulse the clinician has flagged, or refusing food and drink for a day each show a fixed "call now" message. The app never decides or diagnoses. | Medical instability signs (low heart rate, fainting, low temperature, rapid weight loss) are well described; the exact thresholds are expert opinion and vary by source. Clinician sets them. |
| A meal turns into a standoff and the parent freezes. | A **"this is hard" button** at the table that shows 2 or 3 short, clinician-approved prompts and can send a quick message to the care team. We already have an SOS flow. | FBT's core is parents leading meals and being coached. Which prompts work is a clinician question. |
| The clinician sees the family once a week and is blind in between. | A **weekly summary** of what happened: meals finished, partly and refused, which meals are hardest, distress trend, days not logged, each with the entries behind it. Ready before the session. | *(inference)*, but it matches the one-session-a-week shape of FBT. |
| Numbers feed the illness. | Log **how it went and how hard it was**, plus whether a **challenge food** was attempted. No calories, macros, or "goals met" rings for the family. | Calorie and fitness tracking is associated with eating disorder symptoms; one study found about 73% of app users with eating disorders felt the app contributed to theirs. Mostly cross-sectional. |
| Parents burn out or lose confidence. | A **one-question weekly check-in for the parent** ("how are you coping?") that the clinician sees, and a clear "you are doing the right thing" message. | Caregiver anxiety and low confidence are linked with worse FBT outcomes, and burden usually falls over treatment. Studies suggest screening caregivers early. |
| Treatment changes over time. | The clinician sets the **phase**: parents fully in charge at first, then control handed back to the teen in steps. The app's screens and wording follow the phase. | FBT has distinct phases and early progress predicts outcome. Exactly what each phase needs from an app is a clinician question. |
| Clinic measurements (weight, pulse) are not in the app. | The **clinician** can record clinic numbers; they show on the clinician side only, as a trend. Not shown to parents or the teen unless the clinician chooses. | *(inference)*. Whether parents should see weight is a clinician decision. |
| Plans and instructions get lost between sessions. | **Clinician notes and assignments** (challenge foods, goals for the week) that the parent can read and tick off. Much of this exists already. | *(inference)* |
| It is slow to log at a stressful meal. | Three taps, repeat meals in one tap. Done in the mobile-logging branch. | Our own audit. |

## What to leave out

- Calories, macros, nutrient rings, "goals met", streaks, scores, anything that looks like a game.
- Any weight shown to the teen. Parent access to weight is a clinician decision.
- The AI saying anything that sounds like a diagnosis, a number to aim for, or a way to restrict or
  compensate. The safety layer already blocks these in the chat.
- Anything built for people tracking their own eating. That is a different, riskier product.

## "Clinician gives parents logins"

Today a parent signs up and shares a family code, and the clinician links to it. The goal is the
other direction:

1. The clinician creates a family (a case) and sets its **treatment type and phase**.
2. The clinician **invites the parent** by email. The parent opens the link and sets a password.
3. The family's data is visible to that clinician and the parents from the start. Revoking access
   uses the revoked-flag rule already merged.

What this needs: an invites table, an email sending path (a vendor, which has a cost and privacy
implications), and the per-family treatment setting stored on the family record. That touches the
data model, so it should be designed together with the storage decision, not before.

## The test-only "type of app" chooser (shipped in this branch)

**Removed 2026-11-27.** The anorexia version is now the only app: parents don't see nutrition numbers unless their clinician turns them on, and the chooser is gone. The text below is kept for history.

On the sign-in screen (development builds, or the live site with `?testmode` in the address) you
can pick **General meal support** (today's app) or **Anorexia (family-based)**. It is remembered
on that device only. It is a testing aid so you can try the focused version without changing real
data.

In Anorexia mode, **parent-facing screens wired:** the daily progress rings on Today, the
nutrition "i" button in the Add food sheet, the "Nutrition facts" item in the desktop food menu,
and on the Week tab the daily nutrition summary and the "Produce servings" chip (day headers no
longer open anything).

**Left alone on purpose:** the clinician screens (Insights, Care plan, week grid badges) still
show nutrition numbers, because the clinician may need them. Whether they should is question 2
below.

**Added in this mode:**
- **"When to get help" card** on Today (Anorexia mode only). Fixed text: 911 for fainting, chest
  pain, trouble breathing, seizure or suicide talk (988); call the care team today for a full day of
  refusing food and drink, purging or laxatives, new dizziness, feeling very cold or a racing
  heartbeat. It is the same wording the chat's safety layer uses. It is **not** yet clinician-written:
  letting a clinician edit it needs new stored data, so it waits for the storage decision.
- **"Week in review" card** at the top of the clinician Insights tab, built by `src/lib/sessionPrep.js`.
  It shows meals logged, days with nothing logged, hard meals (with each date), challenge foods tried,
  and post-meal distress against last week. Every line lists the entries behind it. It states facts
  and does not interpret them.

**Not verified in a browser:** the Week tab, food menu, warning card and week-in-review card pass
tests and the build, but I have not clicked through them. The challenge-foods line assumes logged
meal items carry their `category`; if they do not, that line simply stays empty.

## Questions for a clinician (please get these answered before building more)

1. Is FBT for adolescent anorexia the right focus, and which version of it do you use?
2. Should parents see any nutrition numbers or weights at all? Should the teen see anything?
3. Is "partly finished" the same as "difficult" for your purposes? (Today it is stored as difficult.)
4. What are the warning signs and call-now rules you give families? Which belong in the app?
5. What short prompts do you give parents at a stuck meal? Can we use them, and who owns the wording?
6. What do you wish you knew about the week before each session?
7. What does each treatment phase need from an app?
8. Would you use the app to enter clinic weights and pulse, and who should see them?

## Sources

I read search summaries, not every full paper. Please treat the numbers as pointers.

- FBT as the best-supported outpatient treatment for adolescent anorexia: [AACAP Clinics 2015](https://www.aacap.org/App_Themes/AACAP/Docs/member_resources/family_psych_toolkit/evidence/Clinics_2015-FBT_for_Adolescents_with_Eating_Disorders.pdf), [Psychiatric Times review](https://psychiatrictimes.com/family-therapy-adolescents-anorexia-nervosa-brief-review-family-based-treatment)
- Calorie and fitness tracking and eating disorder symptoms: [Calorie counting and fitness tracking technology: associations with eating disorder symptomatology (2017)](https://pubmed.ncbi.nlm.nih.gov/28214452/), [MyFitnessPal use in eating disorders](https://pubmed.ncbi.nlm.nih.gov/28843591/), [Duke Psychiatry: The Trouble with Tracking](https://psychiatry.duke.edu/blog/trouble-tracking)
- Digital tools for FBT: [Telehealth delivery of FBT](https://pubmed.ncbi.nlm.nih.gov/28801943/), [Online grocery tool for parents of youth with anorexia](https://pubmed.ncbi.nlm.nih.gov/36737256/)
- Medical instability warning signs: [Royal Children's Hospital Melbourne guideline](https://www.rch.org.au/clinicalguide/guideline_index/Management_of_Eating_Disorders_in_the_Emergency_Department/), [Hopkins All Children's clinical pathway](https://www.hopkinsmedicine.org/-/media/files/allchildrens/clinical-pathways/eating-disorders-clinical-pathway-8202025revisions.pdf?openpdf=1)
- Caregiver burden and FBT: [Predictors of caregiver burden before FBT](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9944026/)

**Gaps:** I found no good evidence on mealtime conflict or on which in-the-moment prompts help
parents, so those rows are inference. This doc is a starting point for a conversation with a
clinician, not a clinical guideline.
