// Phone notifications for tag-in (roadmap C3). Off unless VITE_FIREBASE_VAPID_KEY (the Web Push key from the
// Firebase console) and the Worker are configured. Each phone that turns them on stores its Firebase
// Messaging token in users/{uid}/private/push; the Worker sends to the other caregivers' tokens.
//
// The notification never carries meal, child or family details (Firebase Cloud Messaging is outside Google's
// BAA), only "Someone in your family is asking for you". The app shows the rest once opened.
import { doc, setDoc, deleteField } from 'firebase/firestore'
import { app, fsdb } from '../firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL

export function pushSupport() {
  if (!VAPID_KEY || !PROXY_URL) return 'off'
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
    // iPhones only allow web notifications for an app added to the Home Screen.
    return /iPhone|iPad/.test(navigator?.userAgent || '') ? 'install' : 'unsupported'
  }
  return Notification.permission === 'denied' ? 'blocked' : 'ready'
}

async function messagingToken() {
  const { getMessaging, getToken } = await import('firebase/messaging')
  const registration = await navigator.serviceWorker.ready
  return getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
}

// Asks permission (from a tap) and saves this phone's token. Returns 'on' | 'blocked' | 'failed'.
export async function enablePush(uid) {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'blocked'
    const token = await messagingToken()
    if (!token) return 'failed'
    await setDoc(doc(fsdb, `users/${uid}/private/push`), { tokens: { [token]: { addedAt: Date.now() } } }, { merge: true })
    localStorage.setItem('pt_push_token', token)
    return 'on'
  } catch {
    return 'failed'
  }
}

export async function disablePush(uid) {
  const token = localStorage.getItem('pt_push_token')
  try {
    const { getMessaging, deleteToken } = await import('firebase/messaging')
    await deleteToken(getMessaging(app))
  } catch { /* already gone */ }
  if (token) await setDoc(doc(fsdb, `users/${uid}/private/push`), { tokens: { [token]: deleteField() } }, { merge: true }).catch(() => {})
  localStorage.removeItem('pt_push_token')
}

export const pushOnHere = () => {
  try { return !!localStorage.getItem('pt_push_token') && Notification.permission === 'granted' } catch { return false }
}

// Asks the Worker to notify the family's other caregivers. Fire and forget: the in-app banner works without it.
export function requestTagInPush(user, familyId, { url = PROXY_URL, fetchImpl = typeof fetch === 'undefined' ? null : fetch } = {}) {
  if (!user || !familyId || !url || !fetchImpl || !VAPID_KEY) return Promise.resolve(null)
  return user.getIdToken()
    .then(idToken => fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ action: 'tagIn', familyId }),
    }))
    .then(res => (res.ok ? res.json() : null))
    .catch(() => null)
}
