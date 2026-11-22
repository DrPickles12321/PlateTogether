# Product direction: focus, data, nutrition, clinician assistant, UI

Status: **proposal for the founders to decide on.** Written from reading the code, not from user research.
Items marked *(verify)* are things I could not confirm and need a human or a clinician advisor.

## 1. Focus: pick one condition and one treatment model

Feedback was that the app does too much and isn't tied to a specific eating disorder. Recommended focus:

**Adolescent anorexia nervosa, supporting families who use Family-Based Treatment (FBT, also called Maudsley).**

Why this one:
- The app's existing shape already matches FBT: parents take charge of meals at home, a clinician reviews
  progress and coaches the parents. That is the core of FBT, so little needs to change in the model.
- FBT is a first-line, evidence-backed treatment for adolescents with anorexia *(verify with a clinician advisor)*.
- It gives a clear user (a parent at a dinner table, stressed, on a phone) and a clear buyer (clinics running FBT).

Alternatives, and why not first: ARFID (different needs, little parent-vs-clinician difference), bulimia and
binge-eating (patient self-monitoring models, which is a different product and riskier to build).

**Decision needed:** confirm the focus with a clinician who runs FBT before building around it.

## 2. Design principles that follow from the focus

- **Parents log, the teen doesn't see numbers.** Calorie and weight displays can harm people with
  eating disorders. Meals are tracked as completed, partly completed, or refused, plus a difficulty rating.
  Question for the clinician advisor: should parents see nutrition numbers at all, or only "challenge foods
  attempted" and variety?
- **Few taps at the table.** Logging a meal should take three taps: which meal, how it went, how hard it was.
  Everything else is optional and can wait until after the meal.
- **Escalate, don't advise.** The app never diagnoses or prescribes. The new code-level safety layer
  (`src/lib/aiSafety.js`) enforces this for the chat.
- **The clinician sees patterns, not raw noise:** streaks of refused meals, rising distress, missed
  logging, with the evidence one tap away.

## 3. Mobile first

What exists: a service worker and manifest (`public/sw.js`, `public/manifest.webmanifest`), `MOBILE.md` and
`CAPACITOR.md` plans, and a bottom tab bar.

Proposed order: finish the phone experience as an installable web app first, then decide on Capacitor
packaging. Concretely:
1. One-tap meal logging from the Today screen (see principle above).
2. "Same as yesterday" and recent foods instead of searching every time.
3. Test every screen at 375px with touch only. Drag-and-drop is already slated for replacement by tap-to-add.

## 4. Food entry and nutrition data

What the code does today (read from `src/lib/nutritionService.js` and `nutritionApi.js`):
- A static list of about 60 foods with fuzzy matching.
- If nothing matches, it **invents numbers**: a fixed fallback of 200 to 450 kcal depending on category.
- The Open Food Facts path assumes every food is a 150 g serving (`serving = 1.5`), so serving sizes are wrong
  for most foods. It is also called from the browser.
- The worker already has a USDA FoodData Central lookup (`worker/src/index.js`) that the app barely uses.

Proposal:
1. Use USDA FoodData Central as the main source, through the worker so keys stay server-side and results are cached.
   Use its real portion sizes instead of a fixed multiplier.
2. **Never fabricate numbers.** If there is no match, show "no data" and let the parent enter the food manually.
   Show the source and confidence for every number.
3. A "My foods" list ordered by recent and frequent use, so repeat meals are one tap.
4. Decide with the clinician whether numbers are shown to parents at all (section 2). If not, much of this
   shrinks to a food name, a food group, and "challenge food" tags, which is a lot less to build.

## 5. Data storage

Today: Firebase Realtime Database as one JSON tree under `users/{uid}`, protected by hand-written rules
(`database.rules.json`). The duet review of those rules already found that a revoked clinician can delete their
own `careTeam` entry and regain access (see `~/plate-agents/THREAD.md`, to be confirmed in the emulator).

The data is relational: families, parents, clinicians, links between them, meals, notes, care plans, alerts.
It also needs things the tree makes hard: an audit log of who viewed what, trend queries over weeks, data
export and deletion, and retention rules.

Options:
| Option | For | Against |
|---|---|---|
| Stay on Realtime Database | No migration | Rules are easy to get wrong; weak audit and query story |
| Firestore | Same ecosystem, better queries | Still document rules; migration cost |
| Postgres with row-level security (Supabase or Cloud SQL) | Relational fit, real audit log, SQL for trends | Migration; need a BAA that covers the exact services *(verify)* |

Recommendation: **Postgres with row-level security**, with `audit_log` as a first-class table, once the focus
is decided. Do not migrate before section 1 is settled, because the entities depend on it. Before real patients:
sign BAAs with every vendor that touches patient data (see `COMPLIANCE.md`).

Sketch of entities: `family`, `member` (parent, clinician, patient-as-pseudonym), `care_link` (family to
clinician, with status and revoked_at), `meal`, `meal_item`, `note` (author, visibility), `care_plan`,
`alert` (SOS), `audit_log`.

## 6. Clinician assistant

Goal from the founders: help a clinician who is stuck, using knowledge of the condition ("what is normal,
what is a warning sign"). Treat it as three stages, each shippable on its own.

**Stage 0 (safest, build first): ask-the-guidelines, with no patient data at all.**
The clinician asks a general question; the assistant answers from a vetted corpus with citations. Because no
patient data goes in, it sidesteps most HIPAA exposure for the model vendor. Corpus candidates: published
clinical guidelines and position papers from professional bodies. Licensing for each source must be checked
before ingesting *(verify)*.

**Stage 1: patient-aware summaries.** Deterministic code first: compute streaks, trends, and flags from the
database without any model. The model only rewrites those facts into prose and never counts or invents
numbers (the same pattern already used by the parent chat). Inputs are pseudonymous (no names, relative
dates). Needs a BAA with the model vendor, or a self-hosted model.

**Stage 2: suggestions.** "Consider asking about X" tied to evidence in the chart, always labelled as a
suggestion, always showing the data behind it, never sent to families automatically.

Cross-cutting requirements:
- Retrieval over a vetted corpus with citations on every claim; an answer with no supporting source says so.
- A clinician-written evaluation set, including red-team cases (restriction advice, diagnosis, crisis).
- The output checks in `aiSafety.js` run on every reply, extended with clinician-specific rules.
- Logging without patient content; human review of prompt changes.
- If the model is uncertain or the question is novel, it says so. It does not guess.

Which model to use is a later decision. It depends on the BAA situation and cost, not on capability alone.

## 7. UI

I have not seen the running app, so this is from the code only. `src/index.css` already uses a warm terracotta
and sage palette with Cormorant Garamond and Outfit. That avoids the purple-gradient and default-Inter look,
so "looks generic" may not be the real problem. More likely candidates are density, hierarchy, and the
mobile layout. Before changing styles: run the app at 375px, take screenshots, and have two or three real
parents and a clinician try the logging flow. Then redesign what they trip over.

## 8. Suggested order

1. **Decisions (days):** condition and treatment model, clinician advisor, storage direction, whether
   parents see numbers.
2. **Safe now (done in this branch):** code-level safety layer for the parent chat.
3. **Next:** fix the revocation hole in the rules (after the duet and an emulator test), one-tap mobile
   logging, stop fabricating nutrition numbers.
4. **Then:** storage migration with audit log, BAAs, consent flow, account deletion (see `COMPLIANCE.md`).
5. **Then:** assistant stage 0, then stage 1.

## 9. Open questions for the founders

1. Is FBT for adolescent anorexia the right focus, and do you have access to a clinician who can confirm it?
2. Should parents see nutrition numbers, or only meal completion and challenge foods?
3. Who is the buyer: individual families, or clinics?
4. What can you afford: BAAs and hosting that meet them cost money, and that shapes the storage choice.
