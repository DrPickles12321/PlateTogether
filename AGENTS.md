# AGENTS.md

Shared instructions for every coding agent working in this repo (Claude Code, Hermes, anyone else).
Claude Code reads this through `CLAUDE.md`, which just imports it. Edit this file, not that one.

## What this is

**Plate Together** is a meal-support app for families in eating-disorder recovery. A parent logs meals; a
linked clinician reviews progress, writes session notes, and adjusts a care plan. It started as a
HackPrinceton demo and is now being turned into a real product. Live at https://platetogether.web.app.

It stores **sensitive health data** about mostly-minor patients. Read "Hard rules" below before touching data code.

## Stack

- Frontend: React 19 + Vite 8, React Router 7, Tailwind 4, framer-motion, dnd-kit, fuse.js
- Data + auth: Firebase Realtime Database (rules in `database.rules.json`) + Firebase Auth
- AI: Cloudflare Worker in `worker/` proxies Anthropic Claude (clinical digest, chat, food lookup via USDA).
  The browser never holds an Anthropic key; it calls `VITE_AI_PROXY_URL` with a Firebase ID token.
- Optional iMessage companion: `agent/` (Node + spectrum-ts + Supabase). Not on the critical path.
- Tests: Vitest. Hosting: Firebase Hosting via GitHub Actions.

## Layout

```
src/pages/         route-level views (Parent*, Clinician*, Daily/Weekly/Stats/Notes/Account)
src/components/    UI pieces (nutrition/ subfolder for nutrition panels)
src/contexts/      AuthContext, FirebaseDataContext, NutritionalTargetsContext
src/lib/           pure logic: trends, weekStats, weekFacts, mealTiming, insights, chatService, nutrition*
src/data/          nutritionDb.json, commonFoods.js (static food data; considered outdated)
worker/            Cloudflare Worker (AI proxy + USDA food lookup), deployed separately with Wrangler
agent/             iMessage agent
supabase/          SQL from an earlier Supabase design; the live app uses Firebase
docs/superpowers/  past specs and plans, useful for history
MOBILE.md CAPACITOR.md COMPLIANCE.md   mobile plan, native packaging plan, HIPAA/GDPR gap list
```

`DESIGN.md` currently holds an Airbnb design-system analysis, not this app's own design system.
Treat it as reference only. A redesign is planned (see "Direction").

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm test           # vitest run
npm run lint       # eslint
npm run build      # production build into dist/
```

Before calling any task done: `npm test`, `npm run lint`, and `npm run build` must all pass. Report real
output. If something fails, say so; do not claim success.

## Data model (Realtime Database)

Top-level nodes: `familyCodes/{code} -> parentUid` and `users/{uid}`.

Under `users/{uid}` (parent or clinician): `email`, `role` (write-once), `familyCode`, `consent`.

Parent-owned data: `mealLogs`, `mealTimes`, `supplementLog`, `foodItems`, `insights`, `lastResetWeek`,
`parentNotes/{date}`, `hiddenClinicianNoteIds`, `hiddenParentNoteIds`, `clinicianNotesRead`, `savedClinicianNotes`.

Linking: a clinician holds `users/{clinicianUid}/patients/{parentUid}` (must prove the family `code`); the parent
holds `users/{parentUid}/careTeam/{clinicianUid}` with an `active` flag. Revoking access sets `active=false`;
every clinician read/write rule checks that flag.

Shared-write nodes (parent or an active linked clinician): `nutritionalTargets`, `prescribedSupplements`, `sos`,
`assignedChallenges`. Clinician-only write: `clinicianNotes`.

**The data model is under review** (see "Direction"). Do not refactor storage without an approved plan.
When you change shape, update `database.rules.json`, the readers in `src/contexts/FirebaseDataContext.jsx`,
and the tests together.

## Hard rules

1. **Never read, print, commit, or paste `.env`, `.dev.vars`, `agent/.env`, or any key.** Use the `*.example` files.
2. **No real patient data in dev, tests, prompts, logs, or screenshots.** Use obviously fake seed data.
   Do not send app data to any LLM provider outside the Worker path.
3. **Security rules are invariants, not suggestions.** In particular: a clinician can never edit or erase a parent's
   note (only add `read_at`); a revoked clinician (`active === false`) loses all access; a clinician link requires
   proving the family code; `role` is write-once. If a change would weaken any of these, stop and ask.
4. **Never deploy.** No `firebase deploy`, no `wrangler deploy`, no pushing to `main` (pushes to `main`
   auto-deploy hosting through GitHub Actions). Work on a branch and open a PR. A human merges.
5. **No new PHI sinks.** Don't add logging of request bodies, analytics, or third-party SDKs that would see
   meal, distress, or note content. `COMPLIANCE.md` lists what is already open; don't make it longer.
6. Don't add dependencies casually. If you must, say why in the PR.

## Clinical-safety rules for anything the AI says

The AI features (digest, chat, and the planned clinician assistant) talk about eating disorders to families and clinicians.

- It supports, it never diagnoses, and it never prescribes calories, weights, or meal plans.
- It must not give numbers to restrict, compensate, or "burn off". No weight-loss framing, ever.
- Any mention of self-harm, purging, fainting, chest pain, or refusal to eat for a day or more routes to a
  human escalation message, not advice.
- Clinician-facing suggestions are clearly labelled as suggestions to review, with the evidence they were
  based on shown next to them.
- Prompts live in code and get reviewed like code. Changing one needs a test or a written before/after example.

## Code conventions

- JavaScript (not TypeScript), ES modules, function components with hooks. Match surrounding style.
- Put logic in `src/lib/` as pure functions with a `*.test.js` beside it; keep components thin.
- Mobile first: every screen must work at 375px wide with touch only. No drag-only interactions.
- Accessibility: real buttons and labels, visible focus, contrast that passes WCAG AA.
- Comments explain why, not what. No dead code, no commented-out blocks.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.

## Direction (decided with the user, in rough priority order)

These come from the founders and an investor conversation. They are goals, not finished decisions.
Ask before assuming details.

1. **Narrow the scope.** Feedback was that the app tries to do too much. Pick one eating disorder (or one
   clear patient population) and design for it. Which one is not decided yet.
2. **Mobile-first.** See `MOBILE.md` and `CAPACITOR.md`. Logging a meal on a phone has to take seconds.
3. **Easy food entry and current nutrition data.** Replace stale `nutritionDb.json` data with a maintained
   source (USDA FoodData Central is already used in the Worker), and make adding food fast.
4. **Re-think data storage** for growth and for HIPAA-style requirements (see `COMPLIANCE.md`).
   Nothing is chosen yet. Realtime Database may or may not stay.
5. **Clinician assistant.** An LLM that helps a clinician reason about a patient's patterns and "what is
   normal vs. a warning sign". It must be grounded in vetted clinical sources (retrieval, not just a prompt),
   advisory only, and evaluated before it ships. It must never see identifiable data without a signed BAA.
6. **A real design.** It should look hand-designed for this audience (calm, warm, not clinical): no purple
   gradients, no default Inter-on-white look, no generic card grids. Distinct type pairing, a considered palette.

## Working with other agents

Two or more agents (Claude Code, Hermes) and two humans work in this repo. To avoid stepping on each other:

- Each agent works on **its own branch, in its own git worktree**:
  `git worktree add ../plate-<agent>-<task> -b <agent>/<task>`.
- Before starting, read `docs/agents/BOARD.md`. Add a row claiming the files or area you'll touch.
  Don't edit files another row has claimed.
- When you finish or get blocked, update your row and add a short note under "Handoffs"
  saying what changed, what is unverified, and what the next agent should do.
- Disagree with another agent's approach? Write it in the Handoffs section with your reasoning and
  leave the decision to a human. Don't silently overwrite their work.
- Verify claims from other agents against the code or by running the tests. A handoff note is a report,
  not proof.
