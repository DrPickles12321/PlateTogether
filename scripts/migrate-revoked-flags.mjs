#!/usr/bin/env node
// One-time migration: for every careTeam entry with active === false, set the
// parent-only users/{parent}/revokedClinicians/{clinician} flag that the new
// rules check. Dry run by default; it prints uids only, never emails or health data.
//
//   node scripts/migrate-revoked-flags.mjs --project <firebase-project-id>          # dry run
//   node scripts/migrate-revoked-flags.mjs --project <firebase-project-id> --apply  # writes
//
// Uses the signed-in Firebase CLI (`firebase login`), so run it as someone with
// database admin rights. Deploy the new rules AFTER this runs, not before.
import { execFileSync } from 'node:child_process'
import { planRevokedFlags } from '../src/lib/revokedMigration.js'

const args = process.argv.slice(2)
const project = args[args.indexOf('--project') + 1]
const apply = args.includes('--apply')
if (!args.includes('--project') || !project || project.startsWith('--')) {
  console.error('usage: migrate-revoked-flags.mjs --project <id> [--apply]')
  process.exit(2)
}

const fb = (...a) => execFileSync('firebase', [...a, '--project', project], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const getJson = path => JSON.parse(fb('database:get', path) || 'null')

const uids = Object.keys(JSON.parse(fb('database:get', '/users', '--shallow') || '{}'))
const careTeamByParent = {}, revokedByParent = {}
for (const uid of uids) {
  const team = getJson(`/users/${uid}/careTeam`)
  if (!team) continue
  // Keep only the flag we need; never hold emails or other fields.
  careTeamByParent[uid] = Object.fromEntries(Object.entries(team).map(([c, e]) => [c, { active: e?.active }]))
  revokedByParent[uid] = getJson(`/users/${uid}/revokedClinicians`) || {}
}

const plan = planRevokedFlags(careTeamByParent, revokedByParent)
console.log(`${uids.length} users scanned, ${plan.length} revoked links need a flag`)
for (const { parentUid, clinicianUid } of plan) {
  console.log(`${apply ? 'set' : 'would set'} users/${parentUid}/revokedClinicians/${clinicianUid} = true`)
  if (apply) fb('database:update', `/users/${parentUid}/revokedClinicians`, '--data', JSON.stringify({ [clinicianUid]: true }), '--force')
}
if (!apply && plan.length) console.log('Dry run only. Re-run with --apply to write.')
