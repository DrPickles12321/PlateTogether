# Agent board

Coordination file for agents working in parallel. See "Working with other agents" in `AGENTS.md`.
Keep rows short. Remove a row when its branch is merged.

## Claims

| Agent | Branch | Area / files claimed | Status | Updated |
|-------|--------|----------------------|--------|---------|

Status values: `in progress`, `blocked`, `ready for review`.

## Handoffs

Newest first. Each entry: who, what changed, what is unverified, what the next agent should do.

### 2026-11-27 claude -> humans: account deletion on Firestore, in the Worker
- Changed (branch claude/account-deletion): the Worker deletes an account on Firestore
  (`worker/src/accountDeletion.js`, `googleStore.js`, `googleAuth.js`); the Firestore data layer calls it.
  Realtime Database mode still deletes in the app, unchanged. 3 emulator tests, 14 unit tests.
- Unverified: the real path through a deployed Worker to Google; no key is set up. Steps in
  `docs/plans/2026-11-28-firestore-switch.md`.
- Next: a human creates the service account and sets `GOOGLE_SERVICE_ACCOUNT`. Move deletion to a Cloud
  Function before real families (the Worker holds an admin key outside Google's BAA).

### 2026-11-26 claude -> humans / hermes: follow-up on the Hermes rules review
- Checked each finding against the current rules (branch claude/rules-hardening).
- #1 revocation fails open: fixed earlier by the `revokedClinicians` markers that every clinician check now requires to be absent. #3 extra fields on parent notes: fixed earlier by `$other: false`.
- #2 clinician notes: fixed here. Notes carry `authorUid`; a clinician can only create as themselves and edit or delete their own; nobody can wipe the whole list. Older notes without an author stay editable and are claimed on edit. 9 emulator tests in `tests/rules/clinicianNotes.test.js`.
- #5 role: now only `parent` or `clinician`.
- Left as known, low risk: #4 any signed-in user can resolve a family code (linking needs it); #6 no shape checks on shared nodes, and a linked clinician reads the parent's whole node.
- Unverified: a second clinician's edit of someone else's note is now silently skipped in the app; the UI still shows the edit control.
- Next: deploy the rules after merge. A clinician fills in `docs/clinical/2026-11-26-wording-review.md`.

### 2026-11-26 claude -> humans
- Changed (branch claude/design-pass): notebook redesign, hard-meal support card, Need help, one outcome vocabulary, no scores for parents, clinician grid shows refusals and distress. Details: `docs/plans/2026-11-26-design-pass.md`.
- Unverified: real phones, live USDA and AI, desktop sidebars and clinician Care plan/Notes only re-coloured. New support wording is a draft for clinician review.
- Next: clinician reviews the wording; fix `viewingPatientUid` not resetting on sign-out (see the doc).

### 2026-11-22 claude -> humans / hermes
- Changed (branch claude/mobile-logging, stacked on claude/foundations): three-tap meal log, same-as-yesterday, recent foods, sheets and modals above the tab bar, no invented nutrition numbers. Details and screenshots in `docs/mobile/meal-logging-audit.md`.
- Unverified: real touch/iOS, the live USDA lookup (worker not run locally), the Week/Insights/Notes/Account tabs, clinician screens.
- Next: a clinician should confirm that "Partly" may map to the `difficult` status; decide whether parents see calorie numbers; then merge claude/foundations first.

### 2026-11-21 hermes -> all — security review of database.rules.json (no code changed)

- Changed: this board only (claim row + this entry), branch `hermes/review`.
- Scope: static review of `database.rules.json` cross-checked against
  `src/contexts/FirebaseDataContext.jsx` and `src/components/LoginScreen.jsx`.
- Unverified: nothing was run against the Firebase emulator or a live project; all findings
  below are from rule semantics and should be reproduced in the emulator before fixing.

Findings, most severe first (line numbers are database.rules.json):

1. HIGH — Revocation fails open when the careTeam record is absent. Every clinician access
   check uses `careTeam/{cid}/active !== false` (lines 11, 41, 42, 46, 49, 50, 51). A missing
   entry or missing `active` field reads as null, and `null !== false` is true, so access is
   GRANTED. The UI revoke (`revokeCareTeamAccess`, FirebaseDataContext.jsx:670) sets
   `active:false` and keeps the record, which is safe — but the rules also let the parent
   DELETE a careTeam entry, and `users/$uid` `.write` (line 12) lets the parent wipe their
   whole node. Once the record is gone, the clinician's own client silently re-creates it
   with `active:true` (backfill effect, FirebaseDataContext.jsx:239-249), because the
   careTeam `.validate` (line 26) accepts creation on the mere existence of the clinician's
   own `patients/{parentUid}` entry — no fresh code proof, no parent action. The clinician
   controls that patients entry and the parent cannot delete it. Net effect: any revocation
   by deletion (or any legacy/pre-hardening link with no careTeam record) is reversible by
   the clinician alone, and a missing record is invisible in the parent's CareTeamCard, so
   there is nothing to revoke. The comment at FirebaseDataContext.jsx:666-669 ("once revoked
   it stays revoked") only holds while the record exists. Fix direction: require
   `active === true` in all seven checks; drop the `patients exists` branch from careTeam
   creation (require code proof) or make careTeam creation parent-only; stop the clinician
   client from writing `active:true`.
2. MEDIUM — clinicianNotes (line 49) has no author enforcement: ANY active linked clinician
   can edit or delete every note, including other clinicians' session notes, and can wipe
   the whole node. The app comment at FirebaseDataContext.jsx:572 claims "only the clinician
   can delete their own note" — the rules do not enforce "own". Needs an author uid pinned
   on write and a `.validate` that edits/deletes only match the author.
3. MEDIUM — parentNotes/$date clinician write (line 46) pins only body/id/date/created_at.
   A clinician cannot change those or delete the note (good), but can add or alter ANY other
   field. The AGENTS.md invariant is "only add read_at"; the rule does not enforce it.
   Fix direction: pin every known field and reject unknown children via a `$other`
   catch-all `.validate: false`.
4. LOW — familyCodes `.read: auth != null` (line 5) lets any authenticated account resolve
   any known code to a parentUid and probe code existence. Brute force is impractical
   (codes are crypto-random 8 chars, LoginScreen.jsx:379-386), and linking itself does not
   need client read access (the `.validate` resolves root server-side), so reads could be
   owner-only (`data.val() === auth.uid`) with addPatientByCode attempting the link write
   directly. Note: the alphabet is 31 chars, not 32 as the comment claims; `b % 31` adds a
   small modulo bias.
5. LOW — `role` (line 15) is write-once but has no `.validate` on the value; a user can set
   any string. Rules never authorize by role, so impact is limited to app code that trusts
   it. `familyCode` (line 16) is freely rewritable and can desync from the familyCodes
   mapping (rules use familyCodes as truth, so this is a UX/consistency gap, not a bypass).
6. INFO — No `.validate` on shared clinical nodes (nutritionalTargets,
   prescribedSupplements, sos, assignedChallenges) or on parent-owned data: any authorized
   writer can store arbitrary shapes/sizes. Rules cannot judge clinical validity; shape
   checks belong in the app/Worker. Also, a linked clinician's `.read` at users/$uid
   (line 11) exposes the parent's ENTIRE node (consent, email, hidden-note ids) — confirm
   that is intended.

- Next: a human should triage #1 before any storage refactor (AGENTS.md Direction item 4);
  reproduce #1-#3 in the emulator, then fix rules + FirebaseDataContext together with tests
  per AGENTS.md. Do not weaken the write-once/role or parent-note invariants while fixing.

<!-- example:
### 2026-11-22 claude -> hermes
- Changed: added `src/lib/foodSearch.js` + tests (branch claude/food-search).
- Unverified: USDA rate limits under load.
- Next: wire it into AddFoodSheet.jsx.
-->
