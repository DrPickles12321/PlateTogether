import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'
import {
  initializeFirestore, connectFirestoreEmulator, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
} from 'firebase/firestore'
import { keepsRecordOnDevice, browserStorage } from './lib/offlineDevice'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const app = initializeApp(firebaseConfig)

// App Check — proves requests come from your real app (blocks scripted abuse of
// the DB from outside the app). Only initializes when a reCAPTCHA v3 site key is
// configured, so the app runs normally before/without App Check being set up.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
if (recaptchaSiteKey) {
  // In local dev, register a debug token (printed to the console on first run,
  // then add it under App Check → Manage debug tokens) so localhost isn't blocked
  // once enforcement is on. Never set this in production.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-undef
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const auth = getAuth(app)
export const db = getDatabase(app)
// Firestore refuses undefined fields; Realtime Database quietly dropped them, and the app relies on that.
// On a device where a parent has signed in, the family's record is also kept on the device, so meals logged
// offline survive a reload and send when the connection is back (roadmap C4; lib/offlineDevice.js says when).
// Everywhere else, and for clinicians, it stays in memory only. Sign-out clears it (lib/signOut.js).
export const fsdb = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: keepsRecordOnDevice(browserStorage())
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache(),
})

// Local development against the Firebase emulators (fake data only). Set
// VITE_USE_EMULATOR=true when running `npm run dev`; it is ignored in production builds.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectDatabaseEmulator(db, '127.0.0.1', 9000)
  connectFirestoreEmulator(fsdb, '127.0.0.1', 8080)
}
