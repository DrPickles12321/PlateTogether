# Plate Together

Shared meal support for families navigating eating-disorder recovery. Parents log meals day-to-day, and a linked clinician reviews progress, leaves session notes, and adjusts a care plan — all from one shared record.

Built at HackPrinceton.

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
```

## Deploying

The app deploys to Firebase Hosting on every push to `main` via GitHub Actions (`.github/workflows/`).

```bash
npm run build
firebase deploy --only hosting   # deploy the web app
firebase deploy --only database  # deploy database.rules.json (after reviewing changes)
```

The AI proxy worker deploys separately from `worker/`:

```bash
cd worker
npm run deploy
```

## More docs

- [MOBILE.md](MOBILE.md) — mobile UI plan and pre-launch checklist
- [CAPACITOR.md](CAPACITOR.md) — scoping for native iOS/Android wrapping
- [COMPLIANCE.md](COMPLIANCE.md) — HIPAA/GDPR gap list before onboarding real patients or clinicians
