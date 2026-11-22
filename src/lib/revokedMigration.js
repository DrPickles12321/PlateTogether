// Pure planning step for the one-time revocation migration: which parents need
// a revokedClinicians flag for a careTeam entry that is already inactive.
export function planRevokedFlags(careTeamByParent, revokedByParent = {}) {
  const plan = []
  for (const [parentUid, team] of Object.entries(careTeamByParent || {})) {
    const already = revokedByParent[parentUid] || {}
    for (const [clinicianUid, entry] of Object.entries(team || {})) {
      if (entry?.active === false && !already[clinicianUid]) plan.push({ parentUid, clinicianUid })
    }
  }
  return plan
}
