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

One bug found and fixed while testing: on a brand-new account the app started reading the family before
sign-up finished creating it; Firestore refused, and a refused listener stops for good, so screens didn't update
until a reload. Now the family is listed on the account last, and the app only reads a family once it's listed.

## Blockers before switching

1. **Deleting an account.** On Firestore the record is append-only by design, so the app can't erase a family.
   `deleteAccount` returns an error in Firestore mode. It needs a small server-side job with admin rights
   (a Cloud Function or the Worker with a service account) that deletes the family, its subcollections, the
   family code, the user documents and the sign-in account, only when the signed-in caregiver who created the
   family asks. Account deletion is a privacy requirement, so the switch waits for this.
2. **The Firestore rules must be deployed first**, or every read is refused (production mode blocks all).

Not blockers, worth knowing:
- The Firestore SDK is now part of the app bundle even with the switch off (about 1.19 MB minified, 354 KB
  gzipped in total). It could be split out later.
- AI insights and chat (`src/lib/aiInsights.js`, `chatService.js`) don't touch the database, so they're unaffected.

## Switch-over steps (a human runs these, in this order)

1. Merge the account-deletion job (blocker 1) and check it on the emulators.
2. `firebase deploy --only firestore:rules` from `main`.
3. Dry run: `node scripts/migrate-to-firestore.mjs --project <id>` with Google application-default credentials
   of a project owner (`gcloud auth application-default login`). Read the counts.
4. `node scripts/migrate-to-firestore.mjs --project <id> --apply`. It must end with "all match".
5. Straight away, merge a PR that sets `CHOSEN = 'firestore'` in `src/lib/backend.js`. Hosting deploys on merge.
   Anything written to Realtime Database between step 4 and the deploy is not copied: run step 4 again just
   before merging if there was a gap (it overwrites, never duplicates).
6. Check the live site with a test account: sign in, log a meal, see it as a linked clinician.
7. Keep Realtime Database read-only for a while (rules can be tightened to read-only), then delete it once
   nobody needs it. Rolling back means setting `CHOSEN = 'rtdb'` again; data written on Firestore after the
   switch would not be in Realtime Database.
