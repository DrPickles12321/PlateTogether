// Asks the Worker to delete the signed-in account (worker/src/accountDeletion.js). Used on Firestore, where
// the app can't erase the family record itself. Returns { success } or { error: 'reauth' | 'failed' }, the
// same answers the Realtime Database path gives, so DeleteAccountModal works unchanged.
const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL

export async function requestAccountDeletion(user, { url = PROXY_URL, fetchImpl = fetch } = {}) {
  if (!user || !url) return { error: 'failed' }
  try {
    const idToken = await user.getIdToken()
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ action: 'deleteAccount', confirm: 'DELETE' }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body?.success) return { success: true }
    return { error: body?.error === 'reauth' ? 'reauth' : 'failed' }
  } catch {
    return { error: 'failed' }
  }
}
