# Plate Together

Shared meal support for families navigating eating-disorder recovery. Parents log meals day-to-day, and a linked clinician reviews progress, leaves session notes, and adjusts a care plan — all from one shared record.

Started at HackPrinceton.

## What it does

**Parent side** (`/parent`)
- **Today** — log breakfast/lunch/snack/dinner, mark meal status and distress, track daily supplements against nutritional targets
- **Week** — a week-at-a-glance view of meals and rhythm
- **Insights** — progress over time, eating-rhythm regularity, weekly trends
- **Notes** — read and hide clinician notes, write your own notes back to the care team (with real delete)
- **Account** — manage the care team (revoke/restore a clinician's access), delete account

**Clinician side** (`/clinician`)
- Link to a family by code, switch between multiple patients
- **Overview** — SOS alerts, week-at-a-glance grid
- **Insights** — progress, eating rhythm, weekly trends, an AI-generated clinical digest
- **Care Plan** — assign challenge foods, set weekly nutritional goals and prescribed supplements
- **Notes** — read the parent's notes (hide from view, never edit/delete their record), write and delete your own session notes

Access is code-based: a parent shares a family code, a clinician links to it, and the parent can revoke or restore that access at any time. Security rules enforce that a clinician can never alter or erase a parent's own note — only add a `read_at` timestamp — so a shared record can't be silently rewritten from the other side.

## Tech stack

- **Frontend**: React 19 + Vite, React Router v6, Tailwind
- **Backend**: Firebase Realtime Database (data + rules) and Firebase Auth
- **AI**: Cloudflare Worker (`worker/`) proxying Anthropic Claude for the clinical digest and food-lookup helpers
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

## More docs

- [MOBILE.md](MOBILE.md) — mobile UI plan and pre-launch checklist
- [CAPACITOR.md](CAPACITOR.md) — scoping for native iOS/Android wrapping
- [COMPLIANCE.md](COMPLIANCE.md) — HIPAA/GDPR gap list before onboarding real patients or clinicians
