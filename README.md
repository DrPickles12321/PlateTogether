# Plate Together

Meal support for families in eating-disorder recovery, built mainly for parents of a teen with anorexia. A parent logs meals on a phone in a few taps; a linked clinician sees how the week went, writes session notes, and sets the family's care plan, all from one shared record.

Live at https://platetogether.web.app. Started at HackPrinceton and now being turned into a real product. The app stores sensitive health data about mostly-minor patients, so read [AGENTS.md](AGENTS.md) before touching data code.

## What it does

Every meal is logged as one of four outcomes, drawn in the same colour so none looks like a failure or a win: **Ate it all**, **Ate some**, **Didn't eat**, **Not served**. Parents never see scores or percentages.

**Parent side** (`/parent`, mobile-first)
- **Next meal**: log the coming meal in a few taps, with the family's own foods, "usual meals" and same-as-yesterday. If a meal is refused, the clinician's plan for refused meals is shown right away.
- **Today**: the day's meals, distress before and after (optional), and the supplement checklist.
- **Week**: the week at a glance, with a plain-words summary.
- **Notes**: write to the care team and read the clinician's notes.
- **Account**: the family code, the care team (revoke or restore a clinician), delete account.
- **Need help**: always available; a request for support goes to the care team, with an emergency call button next to it.

**Clinician side** (`/clinician`)
- **Families, ordered by need**: whoever asked for support comes first, then families with meals not eaten this week, then unread notes or nothing logged for a few days. Each family shows the reason in plain words.
- **Overview**: "Worth talking about" (hard meals, unread notes, challenge foods tried, distress change, each with the entries behind it) and the week-at-a-glance grid.
- **Insights**: week in review, eating rhythm, weekly trend, and an AI clinical digest.
- **Care plan**: lines to read at the table, the steps to follow when a meal is refused, challenge foods, supplements, and whether the parent sees nutrition numbers.
- **Notes**: read the parent's notes (mark read or hide, never edit), write session notes.

Food search uses USDA FoodData Central through the Worker, with free caching. Foods can be typed as familiar, working on or challenge, or left without a type.

Access is code-based: a parent shares a family code, a clinician links to it, and the parent can revoke or restore that access at any time. Security rules enforce that a clinician can never alter or erase a parent's own note (only add a `read_at` timestamp), can only edit their own session notes, and loses all access once revoked.

## Tech stack

- **Frontend**: React 19 + Vite, React Router 7, Tailwind 4, DM Sans; forest-and-sage design tokens in `src/index.css`
- **Backend**: Firebase Realtime Database (data + rules) and Firebase Auth
- **AI and food data**: Cloudflare Worker (`worker/`) proxying Anthropic Claude (clinical digest, chat) and USDA FoodData Central (food lookup, cached). The browser never holds an API key; it calls the Worker with a Firebase ID token.
- **Optional iMessage companion** (`agent/`): a standing agent (via [spectrum-ts](https://www.npmjs.com/package/spectrum-ts)) that sends dinner-window reminders, weekly summaries, and SOS follow-ups over iMessage, backed by Supabase
- **Testing**: Vitest

## Project layout

```
src/            React app (pages/, components/, contexts/, hooks/, lib/)
worker/         Cloudflare Worker — AI proxy + food-lookup (Wrangler)
agent/          Optional iMessage companion agent (Node, Supabase)
database.rules.json   Firebase Realtime Database security rules
tests/rules/    Security-rules tests (run in the Firebase emulator)
scripts/        One-time admin scripts (e.g. revocation-flag migration)
```

## Getting started

```bash
npm install
cp .env.example .env   # fill in Firebase config (see below)
npm run dev
```

### Environment variables (`.env`)

| Variable | Description |
|---|---|
| `VITE_FIREBASE_*` | Firebase project config (API key, auth domain, database URL, project ID, storage bucket, messaging sender ID, app ID, measurement ID) |
| `VITE_AI_PROXY_URL` | URL of the deployed Cloudflare Worker AI proxy |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key for Firebase App Check (optional — leave blank to disable) |

### Scripts

```bash
npm run dev       # start the Vite dev server
npm run build     # production build
npm run preview   # preview the production build
npm test          # run the Vitest suite
npm run lint      # ESLint
npm run test:rules  # security-rules tests in the Firebase emulator (see below)
```

### Testing the security rules

`npm run test:rules` starts the Realtime Database emulator and runs `tests/rules/`. It needs the Firebase CLI and Java 21 or newer. On a Mac where the default Java is older, point `JAVA_HOME` at a newer one first (for example `JAVA_HOME=/opt/homebrew/opt/openjdk`). The first run downloads the emulator jar. Run it whenever `database.rules.json` changes.

Revoking a clinician writes two things in one update: `careTeam/{clinician}/active = false` and a parent-only flag `revokedClinicians/{clinician} = true`. Every clinician access rule checks the flag, and a clinician can create their own `careTeam` entry once but never overwrite or delete it. This is why a revoked clinician cannot get back in by deleting their record.

### Running the app against local emulators (fake data)

To try the app without touching the real Firebase project, start the Auth and Database emulators and the dev server with these variables set (use made-up accounts and foods only):

```bash
VITE_USE_EMULATOR=true \
VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_AUTH_DOMAIN=demo-plate.firebaseapp.com \
VITE_FIREBASE_DATABASE_URL=https://demo-plate-default-rtdb.firebaseio.com \
VITE_FIREBASE_PROJECT_ID=demo-plate VITE_FIREBASE_APP_ID=demo-app npm run dev
```

The emulators need a config with `emulators.auth` (port 9099) and `emulators.database` (port 9000), for example `firebase emulators:start --only auth,database --project demo-plate --config <your-emulator-config>.json`. The switch lives in `src/firebase.js` and is ignored in production builds. The AI worker is not started, so food lookups return "No data" locally.

## Deploying

The app deploys to Firebase Hosting on every push to `main` via GitHub Actions (`.github/workflows/`).

```bash
npm run build
firebase deploy --only hosting   # deploy the web app
firebase deploy --only database  # deploy database.rules.json (after reviewing changes)
```

Rollout order for the revocation change, because the new app writes the `revokedClinicians` flag and the old rules reject it:

1. Dry run `node scripts/migrate-revoked-flags.mjs --project <id>`, read the output, then re-run with `--apply` to flag existing revoked clinicians.
2. Deploy the database rules.
3. Deploy the web app.

The AI proxy worker deploys separately from `worker/`:

```bash
cd worker
npm run deploy
```

## Where things stand

The plan is in [docs/plans/2026-11-26-roadmap.md](docs/plans/2026-11-26-roadmap.md).

- **Done:** phase 0 (open items, except the clinician wording review), phase 1 (fast food entry: usual meals, family foods first) and phase 2 (USDA nutrition data, cached, with a clinician switch for showing numbers to parents). The clinician screens were redesigned around families ordered by need.
- **Now, phase 3: statistics for clinicians.** It starts with a decision a clinician has to make: which numbers to show. The draft to react to is [docs/clinical/2026-11-27-clinician-metrics-draft.md](docs/clinical/2026-11-27-clinician-metrics-draft.md). The agreed list then becomes one tested module, `src/lib/clinicianStats.js`.
- **Waiting on a clinician:** the wording review in [docs/clinical/2026-11-26-wording-review.md](docs/clinical/2026-11-26-wording-review.md) and the metrics draft above.
- **Later:** phase 4 (the gate before any AI sees patient data: BAA, storage, compliance) and phase 5 (a clinician assistant grounded in vetted sources).
- **Known gap:** `npm run lint` reports existing errors (mostly in `agent/` and older contexts). New code is kept lint-clean.

## More docs

- [AGENTS.md](AGENTS.md): rules for every coding agent and human working here (hard rules, clinical-safety rules, conventions)
- [docs/plans/](docs/plans/): product direction, the anorexia focus, the design pass and the roadmap
- [docs/clinical/](docs/clinical/): documents for a clinician to review
- [MOBILE.md](MOBILE.md) — mobile UI plan and pre-launch checklist
- [CAPACITOR.md](CAPACITOR.md) — scoping for native iOS/Android wrapping
- [COMPLIANCE.md](COMPLIANCE.md) — HIPAA/GDPR gap list before onboarding real patients or clinicians
