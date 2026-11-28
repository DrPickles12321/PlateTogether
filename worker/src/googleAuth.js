// A Google access token for the deletion service account (accountDeletion.js). The key is the JSON key file
// stored as the Worker secret GOOGLE_SERVICE_ACCOUNT; it signs a short-lived request for a one-hour token,
// which is reused until a minute before it runs out.
import { importPKCS8, SignJWT } from 'jose'

export const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform', // Firestore and sign-in accounts
  'https://www.googleapis.com/auth/firebase.database', // the old Realtime Database copy
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/firebase.messaging', // tag-in pushes
].join(' ')

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export function serviceAccountTokens(keyJson, { fetchImpl = fetch, now = () => Math.floor(Date.now() / 1000) } = {}) {
  const key = typeof keyJson === 'string' ? JSON.parse(keyJson) : keyJson
  if (!key?.client_email || !key?.private_key) throw new Error('service account key is incomplete')
  let cached = null

  return async function getToken() {
    const t = now()
    if (cached && cached.expiresAt - 60 > t) return cached.token
    const signingKey = await importPKCS8(key.private_key, 'RS256')
    const assertion = await new SignJWT({ scope: SCOPES })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', ...(key.private_key_id ? { kid: key.private_key_id } : {}) })
      .setIssuer(key.client_email)
      .setAudience(TOKEN_URL)
      .setIssuedAt(t)
      .setExpirationTime(t + 3600)
      .sign(signingKey)
    const res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
    })
    if (!res.ok) throw new Error(`Google token failed: HTTP ${res.status}`)
    const body = await res.json()
    cached = { token: body.access_token, expiresAt: t + (Number(body.expires_in) || 3600) }
    return cached.token
  }
}
