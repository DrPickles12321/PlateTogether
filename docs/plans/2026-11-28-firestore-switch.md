# Switching the app to Firestore (roadmap B5)

Status: **built and tested on the emulators; the switch is off.** The live app still runs on Realtime Database.
This doc is the checklist for turning it on. Don't flip the switch on its own: the order below matters.

## What exists

- `src/lib/backend.js`: the switch. `CHOSEN = 'rtdb'` today; the switch-over changes it to `'firestore'`.
  In local development `VITE_DATA_BACKEND=firestore` tries Firestore without changing code.
- `src/contexts/FirestoreDataProvider.jsx`: the Firestore data layer. It offers exactly the same values and
  functions as the Realtime Database one (`src/contexts/dataLayers.test.js` checks the two lists match), so
  screens don't change. Meals, notes, supplements and support requests are written as append-only events.
- `src/lib/accounts.js`: role lookup at sign-in and new-account setup for both databases.
- `firestore.rules` (38 emulator tests), `scripts/migrate-to-firestore.mjs` (B4).
- Account deletion in the Worker (below), with 3 emulator tests in `tests/firestore/accountDeletion.test.js`.

## Tested on the emulators (fake accounts only)

- Sign-up as a parent: account, family, first caregiver and family code are created; the family code shows.
- Parent: log a meal (the next meal moves on straight away), write a note, send a support request, save the
  child's name and birth year, see the clinician's table line and note, remove and restore a clinician.
- Clinician: sign up, add the family by code, see it first in the list with "Asked for support · 1 unread note",
  open the file, set phase 1, mark a session, acknowledge the request, save a table line, mark the parent's note
  read, write a note to the family. After the parent removed access: "Access removed" and no data, not even the
  child's name. After the parent restored it: active again, revoked marker gone.
- A migrated family (seeded in Realtime Database, moved with the script): shows in the clinician's list with the
  right summary, and the week grid, challenge foods and distress trend match.
- Account deletion: a parent's family with 450 events, its members, plan, notes and code, their account and
  sign-in, and the old Realtime Database copy are all gone; the clinician's other family is untouched. Deleting
  a clinician switches off their membership and removes their email but keeps the family's records. A second
  run finishes cleanly.

One bug found and fixed while testing: on a brand-new account the app started reading the family before
sign-up finished creating it; Firestore refused, and a refused listener stops for good, so screens didn't update
until a reload. Now the family is listed on the account last, and the app only reads a family once it's listed.

## Account deletion (built, not set up)

On Firestore the record is append-only by design, so the app can't erase a family. The Worker does it with
admin rights: `worker/src/accountDeletion.js` decides what goes, `worker/src/googleStore.js` talks to Google's
REST APIs, `worker/src/googleAuth.js` gets the access token. The app asks with
`{ action: 'deleteAccount', confirm: 'DELETE' }` and its ID token (`src/lib/accountDeletion.js`).

- Who: always the signed-in person from their verified token, never a uid in the request. They must have signed
  in within the last 5 minutes, or the app asks them to sign in again (the same as today).
- What goes: the family and everything under it (only if they created it), its family code, its entry on every
  member's family list, their own account documents, their copy in the old Realtime Database (so a later
  migration run can't bring it back), and last the sign-in account, so a failed run can be repeated.
- What stays: a clinician's notes and records in a family's file. Deleting a clinician account switches off
  their membership and removes their email; the family's record keeps what they wrote.
- Logs: only the failing operation and HTTP status, never a response body or a uid.

**Chosen for now: the Worker, not a Cloud Function** (decided 2026-11-27, to avoid turning on billing yet).
The cost is a Google key with admin rights over the data, held outside Google by Cloudflare, which has no BAA
with us. Move this to a Cloud Function (no key leaves Google, covered by Google's BAA) before real families sign
up. `accountDeletion.js` has no Worker-specific code, so it moves as is; only the store changes.

### Setting it up (a human, once)

1. Google Cloud console, project `platetogether-66beb`, IAM → Service accounts → create `account-deletion`.
   Give it only these roles: **Cloud Datastore User**, **Firebase Authentication Admin**, **Firebase Realtime
   Database Admin**. Not Owner or Editor.
2. On that account, Keys → Add key → JSON. If an organisation policy blocks key creation, that is the sign to go
   straight to a Cloud Function instead.
3. `cd worker && npx wrangler secret put GOOGLE_SERVICE_ACCOUNT < /path/to/key.json`, then delete the downloaded
   file. Never commit it or paste it anywhere.
4. Deploy the Worker (`cd worker && npm run deploy`). Until the secret is set the Worker answers deletion with
   "not configured" and the app shows "Something went wrong".
5. If the key ever leaks: disable it on the service account at once, then make a new one.

Not tested: the hop from the app through a deployed Worker to the real Google APIs. The emulators don't issue
tokens the Worker accepts, so the tests call the deletion code directly. Check it with a throwaway account at
step 6 below.

## Blockers before switching

1. **Set up account deletion** (above) and check it with a throwaway account.
2. **The Firestore rules must be deployed first**, or every read is refused (production mode blocks all).

Not blockers, worth knowing:
- The Firestore SDK is now part of the app bundle even with the switch off (about 1.19 MB minified, 354 KB
  gzipped in total). It could be split out later.
- AI insights and chat (`src/lib/aiInsights.js`, `chatService.js`) don't touch the database, so they're unaffected.

## Switch-over steps (a human runs these, in this order)

1. Set up account deletion (above) and deploy the Worker.
2. `firebase deploy --only firestore:rules` from `main`.
3. Dry run: `node scripts/migrate-to-firestore.mjs --project <id>` with Google application-default credentials
   of a project owner (`gcloud auth application-default login`). Read the counts.
4. `node scripts/migrate-to-firestore.mjs --project <id> --apply`. It must end with "all match".
5. Straight away, merge a PR that sets `CHOSEN = 'firestore'` in `src/lib/backend.js`. Hosting deploys on merge.
   Anything written to Realtime Database between step 4 and the deploy is not copied: run step 4 again just
   before merging if there was a gap (it overwrites, never duplicates).
6. Check the live site with test accounts: sign in, log a meal, see it as a linked clinician. Then delete the
   test parent account from Account and confirm it can't sign in again and the clinician no longer lists it.
7. Keep Realtime Database read-only for a while (rules can be tightened to read-only), then delete it once
   nobody needs it. Rolling back means setting `CHOSEN = 'rtdb'` again; data written on Firestore after the
   switch would not be in Realtime Database.
