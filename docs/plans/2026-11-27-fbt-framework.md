# The FBT framework: what Plate Together is, and how it is built

Status: **agreed direction (founders, 2026-11-27); details still need clinicians.** This is the design the
roadmap (`2026-11-26-roadmap.md`) now follows. It replaces "parents log meals, clinicians read them" with a
clearer product: **the tool that keeps family-based treatment (FBT) for teen anorexia on track, at home and in
the clinic.** Meal logging is how information gets in; it is not the product.

Where this doc says what clinicians or families need, it is reasoning from the research below, not something a
clinician has confirmed. `docs/clinical/2026-11-27-fbt-interview-guide.md` is how we check it.

---

## 1. Who it is for

- **Teens about 12 to 18 with anorexia nervosa (including atypical anorexia), in family-based treatment**,
  standard or "separated" format (parents seen without the teen). Not adults, not other eating disorders yet.
- **Their caregivers**, one or more, in one or more households.
- **Their care team**: an FBT therapist (lead), and optionally a dietitian, pediatrician or adolescent-medicine
  doctor, psychiatrist, and a clinic coordinator.

Why FBT: it is the first-line treatment for adolescent anorexia. In the main trial, 49% of teens were in full
remission at the end of FBT against 23% with individual therapy [1][2]. A separated format did better than
standard FBT in one trial (43% vs 22%) [9], so the app supports both.

## 2. The problems, with evidence

| # | Problem | Evidence |
|---|---|---|
| 0 | Why it matters | Anorexia's standardized mortality ratio is about 5.9; about 1 in 5 deaths is suicide [3]. |
| 1 | The clinician can't see the 30+ meals a week between sessions | FBT outcomes "depend almost entirely on parental action", with little data on how parents carry it out at home [8]. |
| 2 | Parents are alone at the hard moment | Heavy caregiver burden, distress and grief in every treatment approach [6][7]. Emotion coaching lowered burden more than a support group [5]. |
| 3 | No early warning | Gaining at least 2.88% of ideal body weight by session 4 best predicted remission [4]; other studies found about 2.3 to 2.8 kg by sessions 3 to 5 [10]. |
| 4 | The care team is fragmented | Closer coordination went with better early weight gain in 171 adolescents [11]; NICE: poor coordination "has the potential to delay recovery" [12]. |
| 5 | Caregivers are inconsistent | Parents taking control and being united predicted weight gain [13]; fathers are underrepresented [9]. |
| 6 | Transitions cause relapse | About 31% relapse after treatment, mostly in the first year [14]; up to 50% within a year after hospital [15]. |
| 7 | Access | Under 20% get appropriate treatment [16]; under 5% of certified FBT clinicians accept Medicaid [17]; about 2.5 years untreated on average [18]. |
| 8 | Wrong tools | 73% of clinic patients who used MyFitnessPal felt it contributed to their disorder (self-report; causation not shown) [19][20]. |
| 9 | FBT is often not delivered as designed | About a third of clinicians who say they do FBT deviate heavily from it; using a manual went with better adherence [21]. |

**Competitor to know:** Recovery Record for Families already offers parent meal logging linked to a clinician
app, with weight goals and messaging [22]. No outcome study found. Plate Together must not be "another meal
tracker"; what sets it apart is in sections 5 to 7.

## 3. The core idea

Not a diary with charts, but **a shared plan, carried out by a team, with early warnings**:

- the **plan** is what the clinician decides (meals, refusal steps, challenge foods, phase);
- the **team** is the caregivers, the teen when appropriate, and the clinicians, each with a role;
- **carrying it out** happens at the table, mostly by parents;
- **early warnings** tell the right person, early, when the plan isn't working.

The claim to test in a pilot: **more families on track by session 4.**

## 4. Five layers

```
  5. Screens per role    parent · co-parent · teen · therapist · dietitian · doctor · coordinator
         ▲
  4. Routing             who gets told what, when, and who follows up
         ▲
  3. Signals             early response, patterns, parent strain, parents in sync, relapse watch
         ▲
  2. Plan                instructions, each with an owner role, a phase and a history
         ▲
  1. Record              append-only events: meals, check-ins, clinic measurements, sessions
```

| Layer | What it does | Borrowed from |
|---|---|---|
| 1. Record | Every input is an event that is added, never overwritten. Corrections are new events. All numbers are computed from events. | Bank ledgers and Git: nothing is lost, every number is traceable, and it is the audit trail health rules expect. |
| 2. Plan | Each instruction has an owner role, a phase, and a version history. Only the owner (or the lead therapist) changes it. The family sees "From your dietitian, updated Tuesday". | GitHub code owners; Google Docs version history. |
| 3. Signals | Pure, tested functions over the record, each returning a result and the events behind it. Thresholds are set by the clinician. | Measurement-based care platforms (Lyra, Spring Health); service-level targets with alerts when you fall behind. |
| 4. Routing | Each signal goes to the role that owns it, with a fallback if nobody acknowledges it. Emergencies always show the family the fixed call-now message. | PagerDuty / Opsgenie escalation policies. |
| 5. Screens | One record, a different first screen per role (see `2026-11-27-care-team.md`). Parents: fast and calm. Clinicians: dense, with the evidence behind every point. | Role-based home screens in clinical and team tools. |

## 5. The engine: program × phase

Two settings on the family drive everything: the **program** (`anorexia-fbt` now; more later) and the **phase**
(`1`, `2`, `3`, `maintenance`). Each program-and-phase pair is one config block in code (`src/lib/programs.js`):

```js
'anorexia-fbt': {
  label: 'Anorexia (family-based treatment)',
  phases: {
    1: { parentSeesNumbers: false, teen: 'none',      signals: ['earlyResponse', 'hardMeals', 'strain', 'sync'], guide: 'phase1' },
    2: { parentSeesNumbers: false, teen: 'proposals', signals: ['hardMeals', 'relapseWatch', 'handover'],    guide: 'phase2' },
    3: { parentSeesNumbers: false, teen: 'reflect',   signals: ['relapseWatch'],                              guide: 'phase3' },
    maintenance: { logging: 'light', teen: 'reflect', signals: ['relapseWatch'], guide: 'maintenance' },
  },
}
```

Borrowed from feature flags (LaunchDarkly) and app-store age settings. Adding a program means adding a block and
its clinician-reviewed content, not new screens. The clinician sets the program and the phase; parents see both
but can't change them. A phase change is an explicit event with a short checklist the clinician confirms.

## 6. How each problem is answered

**1. Visibility between sessions.** Built: families ordered by need, session summary, "since your last session".
Next: the record covers every caregiver, and every team member gets "since you last saw them".

**2. Hard meal mode** (the parent is alone at the table). The parent taps "This meal is hard":
- **Calm screen:** the clinician's own lines for this child, one at a time; "stay at the table" guidance with a
  gentle timer. Borrowed from aviation checklists: under stress, a short checklist beats remembered advice.
- **Tag in:** one tap sends the other caregiver a push ("Dinner is hard, can you come?").
- **Debrief:** three skippable taps afterwards on what happened and what helped. The clinician sees it next session.
- Works offline (installed web app). Medical red flags still route to the emergency message.

**3. Early response.** The clinician records weight at clinic visits (clinician-only area). The clinician sees
"on track / not yet on track by session 4" with the evidence; default thresholds come from [4][10] and the
clinician can change them. The app suggests nothing clinical; what to do is the clinician's call. In standard
FBT the therapist often shares weight with the family, so "parents can see weight" is the clinician's choice per
family; the teen never sees it in the app. **Decision needed** (roadmap).

**4 and 5. One family, one team.** A `families/` record with members and roles: caregivers (both parents,
separate households included), an optional teen, and an optional team. Invites, removal, and the family can
remove anyone at any time. Parents see each other's logs; "parents in sync" shows gaps by meal or household.
Borrowed from Slack / Google Workspace roles and Apple Family Sharing.

**The teen.** Phase 1: no access to anything about food. Phase 2: "propose and approve", borrowed from Apple's
Ask to Buy: the teen proposes a snack or meal choice, a parent approves or declines, which makes the phase 2
handover concrete and visible to the clinician. Phase 3 and maintenance: their own check-ins and goals. Never
weight, numbers or meal logs. **Needs clinician review.**

**6. Transitions.** Phase changes are events with a checklist ("relapse warning signs written?"). After
discharge or phase 3, a **maintenance** phase: lighter logging, the clinician's personal warning-sign list, and
a quiet relapse watch (refusals creeping back up) routed to the therapist.

**7. Access.** A **session guide per phase**: our own short summaries of what each FBT phase and session covers,
reviewed by a clinician (we can't copy manual text), built into the session summary so generalist therapists
and pediatricians deliver FBT more faithfully [21]. Telehealth-friendly summaries [23]. Possibly the data clinics
need to bill for remote monitoring (believed to need data on 16 of 30 days; **unverified**).

**8 and 9. The best statistics.** Only signals a clinician has agreed on (`docs/clinical/2026-11-27-clinician-metrics-draft.md`),
each pure, tested and traceable. Clinicians see numbers; parents see sentences; the teen sees nothing about food.

## 7. Data collection

### What changes

Today each meal is one slot under the parent's account, and every save overwrites it:

```
users/{parentUid}/mealLogs/2026-11-27/dinner = { status, items, distress }
```

That loses who logged it, when, what changed, and any link to the plan. In the new design **every tap is an
event that is added, never overwritten**, and screens show the latest event per meal. For parents, the logging
flow stays the same few taps.

### Shape (in Firestore; see section 8)

Each line below is a Firestore collection or document under `families/{familyId}`; `{id}` entries are documents
in a subcollection.

```
families/{familyId}/
  profile        { name, birthYear, treatmentStart }                 caregivers write
  program        "anorexia-fbt"                                       lead therapist writes
  phase          { value: 1|2|3|"maintenance", since, setBy }         lead therapist writes
  members/{uid}  { role, active, addedAt, addedBy, household? }      caregivers manage; role set at join
  revoked/{uid}  true                                                 caregivers only; outranks everything
  events/{id}    { type, date, meal?, value, by, at, v }              append-only; `by` must be the writer
  plan/{itemId}  { kind, body, ownerRole, phase?, version, updatedAt, updatedBy }
  planHistory/{itemId}/{version}                                      append-only
  measurements/{id}  { kind: weight|heartRate|bloodPressure, value, unit, at, by }   team only
  measurementsShared  true|false                                      lead therapist; parents may read weight if true
  sessions/{memberUid}/{id}  { at, kind }                             each member's own marks
  checkins/{caregiverUid}/{isoWeek}  { strain: 1-5, support: 1-5 }    caregivers
  alerts/{id}    { type, toRole, createdAt, ackBy?, ackAt?, escalatedAt? }
  rollups/{isoWeek}  pre-summed week, written by the Worker only
  teamNotes/{id} { body, by, role, at }                               team only; see "Team-only notes"
users/{uid}      { email, accountType: family|clinician, families/{familyId}: role }
invites/{code}   { familyId, role, createdBy, expiresAt, usedBy? }
```

Event types: `meal.outcome`, `meal.foods`, `meal.distress`, `meal.time`, `hardMeal.start`, `hardMeal.tagIn`,
`hardMeal.end`, `debrief`, `note.caregiver`, `supplement.given`, `teen.proposal`, `teen.proposal.decision`,
`sos.open`, `sos.resolve`, `phase.change`.

### New inputs, each tied to a problem

| Input | Who | How often | Effort | Problem |
|---|---|---|---|---|
| Who/when/how late a meal was logged | automatic | every log | none | 1, 5 |
| Hard meal mode: start, tag-in, end | caregiver | hard meals only | taps already being made | 2, 5 |
| Debrief | caregiver | after a hard meal | 3 taps, skippable | 1, 3 |
| Weekly check-in | each caregiver | weekly | 2 questions | 2 |
| Clinic weight and vitals | clinician | at visits | typed at the session | 3 |
| Session held, phase change | clinician | per session | 1 tap | 4, 6 |
| Proposal, approved or declined | teen, caregiver | phase 2+ | 1 tap each | 6 |

### What stays out on purpose

Weight entered by parents; calories shown to parents; stored food photos (a photo may only be used to suggest
food names, then discarded, and only after the BAA); location or passive tracking.

### Rules and invariants (each needs an emulator test)

- Events are append-only: create only, `by === auth.uid`, no update or delete, for everyone.
- A team member never edits or erases a caregiver's note or event (today's `read_at` exception carries over as
  its own event).
- A removed member (`active === false` or in `revoked/`) loses all access; only caregivers write `revoked/`.
- Joining needs proof: a family code or an unexpired invite.
- `accountType` on the user is write-once; a family role is set at join and changed only by caregivers or a
  coordinator.
- The teen can't read events, plan internals, measurements or signals. A coordinator reads members and invites
  only, no meal data.
- Rules are written per collection in Firestore, so each role's visibility is its own rule; the family document
  itself holds no sensitive fields. (In Realtime Database read access cascades to every child, which made this
  awkward; one reason for the move.)
- Team notes are readable and writable by active team members only, each note editable only by its author.

### Team-only notes (decided 2026-11-27, with limits)

Clinicians need somewhere to coordinate ("pediatrician: vitals fine, keep phase 1"), so team notes exist, but
they are **hidden from the family's screens, not secret from the family**:

- Under HIPAA a parent is usually the child's personal representative and can ask for the child's records,
  subject to state law [24][25]. Only psychotherapy notes kept separate from the medical record are excluded
  [24], and those belong in the therapist's own system, not in Plate Together.
- Withholding records from a parent can count as information blocking under the 21st Century Cures Act unless an
  exception applies; whether teen confidentiality qualifies is contested and depends on state law [26][27].
- So the screen says plainly: "Team notes aren't shown in the family's app, but the family can ask for their
  records, which may include them." Team notes can be exported for a records request.
- Things a teen tells a clinician in confidence don't go in the app at all; they stay in the clinic's record.
- A clinic's privacy officer and a lawyer should check this before the pilot (roadmap G).

### Migration

One move, done once: from Realtime Database `users/{uid}/…` to Firestore `families/…`. A script reads the old
data and writes the new shape; each existing meal slot becomes one event marked "by the original parent, time
unknown". Dry run first, then `--apply` (the pattern used for the revocation flags). The app then reads only
Firestore, and the old Realtime Database data is kept read-only until a human deletes it.

### Cost

A family produces hundreds of events a week, so screens compute the week on the phone. For long trends the
Worker writes a weekly rollup so an 8-week view doesn't download every event.

## 8. How it is built

- **Storage: Firestore, with sign-in upgraded to Identity Platform** (decided 2026-11-27). Google's HIPAA page
  lists Firestore and Identity Platform as covered by its BAA [28]; Realtime Database and plain Firebase
  Authentication are not on that list, and Firebase's own terms prohibit health data in them without Google's
  written consent [29]. Identity Platform is the same sign-in SDK with an upgrade in the console; keep health
  data out of profile fields such as display names [28].
- **Other services and the BAA:** Firebase Hosting serves only the app's code, never health data. Cloud
  Messaging is not covered, so push text never contains health or meal content (already a rule). The Cloudflare
  Worker sees meal data when it calls the AI model, so before real families either Cloudflare and the model
  provider sign BAAs, or AI features stay off for real data (roadmap G).
- **Cost:** Firestore and Identity Platform have free tiers that should cover a pilot, but a BAA needs a Google
  Cloud billing account; check pricing before signing.
- **Logic:** every signal and config in `src/lib/` as pure functions with tests next to them, as today.
- **Notifications:** web push via Firebase Cloud Messaging (free); scheduled checks (reminders, alert fallbacks,
  relapse watch, rollups) as a Cloudflare Worker cron trigger (free tier). Notification text never includes meal
  content.
- **Privacy gate:** no real families before the BAAs, de-identification for any model call, and an audit log
  (roadmap phase G).

## 9. Decisions

**Decided 2026-11-27 (founders):**
1. **Storage:** Firestore with Identity Platform (section 8).
2. **Team-only notes:** yes, hidden from the family's screens but not secret, with the limits in section 7.

**Working defaults, accepted by the founders; a clinician confirms them in the interviews:**
3. **Weight:** recorded by clinicians at visits; parents see it only if the clinician turns that on; the teen
   never sees it in the app.
4. **The teen's role:** nothing about food in phase 1; propose-and-approve in phase 2; own check-ins and goals
   in phase 3 and maintenance.
5. **Alerts:** support requests and hard-meal patterns to the lead therapist; medical warning signs to the
   therapist and the pediatrician, with the fixed call-now message to the family; a reminder to the lead if an
   alert is not acknowledged within 24 hours. Every threshold is editable by the family's clinician.

**Still open:**
6. **The session guide's content** (clinician): which points per phase and session.
7. **Clinician statistics** (clinician): the metrics draft.

## Sources

1. Lock et al. 2010, FBT vs adolescent-focused therapy RCT. https://pubmed.ncbi.nlm.nih.gov/20921118/
2. Stanford news release on [1] (49.3% vs 23.2% full remission). https://med.stanford.edu/news/all-news/2010/10/family-therapy-for-anorexia-more-effective-than-individual-therapy-researchers-find.html
3. Arcelus et al. 2011, mortality meta-analysis (36 studies). https://pubmed.ncbi.nlm.nih.gov/21727255/
4. Doyle et al., early weight gain in FBT (2.88% IBW by session 4). https://pmc.ncbi.nlm.nih.gov/articles/PMC8693442
5. UCSF, emotion coaching vs support group for caregivers. https://escholarship.org/content/qt05633849/qt05633849.pdf
6. Scoping review of family wellbeing in adolescent AN (2024). https://pmc.ncbi.nlm.nih.gov/articles/pmid/38504003
7. Parental burden, distress and grief in adolescent AN. https://pmc.ncbi.nlm.nih.gov/articles/PMC9941225
8. Parents' weight-restoration actions in FBT (qualitative). https://pmc.ncbi.nlm.nih.gov/articles/PMC9730571
9. Review incl. separated vs standard FBT (43% vs 22%) and fathers' involvement. https://pmc.ncbi.nlm.nih.gov/articles/PMC7066118
10. Early weight gain thresholds by session 3 to 5. https://pmc.ncbi.nlm.nih.gov/articles/PMC4341963
11. Gould & Hendrickson, coordination of care and early outcomes (n = 171). https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_journals_1845981249
12. NICE quality standard QS175, statement 5. https://nice.org.uk/guidance/qs175/chapter/Quality-statement-5-Coordinated-care-across-services
13. Components of manualized FBT that predict weight gain. https://pubmed.ncbi.nlm.nih.gov/22270977/
14. Berends et al. 2018, relapse meta-analysis (31%). https://scholarlypublications.universiteitleiden.nl/handle/1887/3714455
15. Khalsa et al. 2017, relapse, remission and recovery review. https://pmc.ncbi.nlm.nih.gov/articles/PMC5470198/
16. CHOP PolicyLab, closing the treatment gap for teens. https://policylab.chop.edu/node/24497
17. Egbert et al. 2024, FBT barriers in community clinics (<5% Medicaid). https://link.springer.com/10.1186/s40337-024-01008-w
18. Narrative review, early intervention (2.5 years untreated). https://pmc.ncbi.nlm.nih.gov/articles/PMC10710219/
19. Levinson et al. 2017, MyFitnessPal in eating disorders. https://pubmed.ncbi.nlm.nih.gov/28843591/
20. Review: calorie-tracking apps and ED symptoms, mixed causal evidence. https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346
21. Kosmerly, Waller & Robinson, clinician adherence to FBT. https://eprints.whiterose.ac.uk/85467
22. Recovery Record for Families (App Store). https://apps.apple.com/app/id1552498936
23. Telehealth FBT pilot. https://pubmed.ncbi.nlm.nih.gov/28801943/
24. HHS: parents and a child's psychotherapy notes. https://www.hhs.gov/hipaa/for-professionals/faq/does-parent-have-right-receive-copy-psychotherapy-notes-about-childs-mental-health-treatment.html
25. HHS OCR letter on parental access to minors' records. https://www.hhs.gov/sites/default/files/ocr-letter-hipaa-privacy-rule-and-parental-access-to-minor-childrens-medical-records.pdf
26. AAP, pediatric information blocking use cases. https://www.aap.org/en/practice-management/health-information-technology/pediatric-information-blocking-use-cases/
27. Information blocking and adolescent confidentiality. https://pmc.ncbi.nlm.nih.gov/articles/PMC8791761
28. Google Cloud, HIPAA compliance (covered products, Identity Platform guidance). https://docs.cloud.google.com/docs/security/compliance/hipaa
29. Secondary summary of Firebase BAA coverage (Realtime Database and Firebase Auth not covered). https://www.hipaavault.com/resources/is-firebase-hipaa-compliant/

Figures were checked against abstracts and summaries, not every full text. Check the full paper before quoting
a number in a pitch.
