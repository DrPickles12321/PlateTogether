#!/usr/bin/env node
// One-time move from Realtime Database to Firestore (roadmap B4; plan in src/lib/familyMigration.js).
// Dry run by default. Prints counts and family ids only: never names, emails or health data.
//
//   node scripts/migrate-to-firestore.mjs --project <id>            # dry run: read and count
//   node scripts/migrate-to-firestore.mjs --project <id> --apply    # write, then check every family
//   node scripts/migrate-to-firestore.mjs --project <id> --verify   # check only, after an earlier --apply
//
// Against the local emulators, set FIREBASE_DATABASE_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST first.
// Against the real project, sign in with Google application-default credentials as a project owner
// (`gcloud auth application-default login`). Run it while the app is still on Realtime Database; it only
// reads Realtime Database, so the old data stays as it was. Re-running overwrites the same documents.
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { getFirestore } from 'firebase-admin/firestore'
import { planMigration, summarize, verifyFamily } from '../src/lib/familyMigration.js'

const args = process.argv.slice(2)
const project = args[args.indexOf('--project') + 1]
const apply = args.includes('--apply')
const verifyOnly = args.includes('--verify')
if (!args.includes('--project') || !project || project.startsWith('--')) {
  console.error('usage: migrate-to-firestore.mjs --project <id> [--apply | --verify]')
  process.exit(2)
}

const emulated = !!(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_DATABASE_EMULATOR_HOST)
initializeApp({
  projectId: project,
  databaseURL: `https://${project}-default-rtdb.firebaseio.com`,
  ...(emulated ? {} : { credential: applicationDefault() }),
})
const rtdb = getDatabase()
const fs = getFirestore()

const users = (await rtdb.ref('users').get()).val() || {}
const plan = planMigration(users)
console.log(`${emulated ? '[emulators] ' : ''}project ${project}`)
console.log(JSON.stringify(summarize(plan), null, 2))

if (!apply && !verifyOnly) {
  console.log('Dry run only. Re-run with --apply to write.')
  process.exit(0)
}

if (apply) {
  const writer = fs.bulkWriter()
  writer.onWriteError(err => { console.error(`write failed: ${err.documentRef.path} (${err.code})`); return false })
  for (const [uid, { doc, private: priv }] of Object.entries(plan.userDocs)) {
    writer.set(fs.doc(`users/${uid}`), doc)
    if (Object.keys(priv).length) writer.set(fs.doc(`users/${uid}/private/settings`), priv)
  }
  for (const [code, data] of Object.entries(plan.familyCodes)) writer.set(fs.doc(`familyCodes/${code}`), data)
  for (const f of plan.families) {
    const base = `families/${f.familyId}`
    writer.set(fs.doc(base), f.family)
    for (const key of ['members', 'revoked', 'sessions', 'events', 'plan', 'foods', 'usualMeals', 'clinicianNotes']) {
      for (const [id, data] of Object.entries(f[key])) writer.set(fs.doc(`${base}/${key}/${id}`), data)
    }
  }
  await writer.close()
  console.log(`Wrote ${plan.families.length} families.`)
}

// Check every family: its events in Firestore must show exactly what the parent's old data shows.
let bad = 0
for (const f of plan.families) {
  const snap = await fs.collection(`families/${f.familyId}/events`).get()
  const problems = verifyFamily(users[f.parentUid], snap.docs.map(d => d.data()))
  if (problems.length) {
    bad += 1
    console.log(`MISMATCH ${f.familyId}: ${problems.join(', ')}`)
  }
}
console.log(bad ? `${bad} of ${plan.families.length} families differ.` : `Checked ${plan.families.length} families: all match.`)
process.exit(bad ? 1 : 0)
