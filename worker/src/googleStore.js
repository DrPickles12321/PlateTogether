// The admin reads and writes account deletion needs (accountDeletion.js), over Google's REST APIs:
// Firestore, Identity Toolkit (sign-in accounts) and the Realtime Database. Google's admin library doesn't
// run in Workers, hence plain fetch. Errors carry the operation and HTTP status only, never a response body,
// so nothing from a family's record ends up in Worker logs.
//
// `hosts` points it at the local emulators (tests and local runs); the emulators accept the token "owner".

const enc = encodeURIComponent

export function fromValue(v) {
  if (!v || 'nullValue' in v) return null
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('timestampValue' in v) return v.timestampValue
  if ('referenceValue' in v) return v.referenceValue
  if ('mapValue' in v) return fromFields(v.mapValue.fields)
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue)
  return null
}
export const fromFields = (fields = {}) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]))

export function googleStore({ projectId, databaseUrl, getToken, hosts = {}, fetchImpl = fetch }) {
  const fsBase = hosts.firestore ? `http://${hosts.firestore}/v1` : 'https://firestore.googleapis.com/v1'
  const authBase = hosts.auth ? `http://${hosts.auth}/identitytoolkit.googleapis.com/v1` : 'https://identitytoolkit.googleapis.com/v1'
  const dbName = `projects/${projectId}/databases/(default)`
  const docs = `${fsBase}/${dbName}/documents`
  const token = async () => (hosts.firestore || hosts.auth || hosts.database ? 'owner' : getToken())

  async function call(what, url, { method = 'GET', body, ok = [] } = {}) {
    const res = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${await token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (ok.includes(res.status)) return null
    if (!res.ok) throw new Error(`${what} failed: HTTP ${res.status}`)
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }

  const store = {
    async getDoc(path) {
      const d = await call('read', `${docs}/${path}`, { ok: [404] })
      return d ? fromFields(d.fields) : null
    },

    async listDocs(collectionPath) {
      const out = []
      let pageToken = ''
      do {
        const page = await call('list', `${docs}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${enc(pageToken)}` : ''}`)
        for (const d of page?.documents || []) out.push({ id: d.name.split('/').pop(), ...fromFields(d.fields) })
        pageToken = page?.nextPageToken || ''
      } while (pageToken)
      return out
    },

    async deleteDoc(path) {
      await call('delete', `${docs}/${path}`, { method: 'DELETE', ok: [404] })
    },

    // The document and everything under it, at any depth. Each round finds up to 400 descendants by name
    // only (no fields come back) and deletes them in one commit, until none are left.
    async deleteTree(path) {
      for (;;) {
        const rows = await call('find', `${docs}/${path}:runQuery`, {
          method: 'POST',
          body: { structuredQuery: { from: [{ allDescendants: true }], select: { fields: [{ fieldPath: '__name__' }] }, limit: 400 } },
        })
        const names = (rows || []).map(r => r.document?.name).filter(Boolean)
        if (!names.length) break
        await call('delete', `${fsBase}/${dbName}/documents:commit`, { method: 'POST', body: { writes: names.map(name => ({ delete: name })) } })
      }
      await store.deleteDoc(path)
    },

    // Drops one key from a map field, only if the document still exists.
    async removeMapKey(path, field, key) {
      await call('unlink', `${docs}/${path}?updateMask.fieldPaths=${enc(`${field}.\`${key}\``)}&currentDocument.exists=true`, {
        method: 'PATCH', body: { fields: {} }, ok: [404],
      })
    },

    async leaveFamily(fid, uid) {
      await call('leave', `${docs}/families/${fid}/members/${uid}?updateMask.fieldPaths=active&updateMask.fieldPaths=email&currentDocument.exists=true`, {
        method: 'PATCH', body: { fields: { active: { booleanValue: false } } }, ok: [404],
      })
    },

    async deleteSignIn(uid) {
      try {
        await call('sign-in delete', `${authBase}/projects/${projectId}/accounts:delete`, { method: 'POST', body: { localId: uid } })
      } catch (err) {
        // Already gone counts as done, so a repeated run finishes. Identity Toolkit says so with a 400.
        if (!/HTTP 400/.test(err.message) || (await store.signInExists(uid))) throw err
      }
    },

    async signInExists(uid) {
      const r = await call('sign-in lookup', `${authBase}/projects/${projectId}/accounts:lookup`, { method: 'POST', body: { localId: [uid] } })
      return !!r?.users?.length
    },
  }

  const legacyBase = hosts.database ? `http://${hosts.database}` : databaseUrl?.replace(/\/+$/, '')
  if (legacyBase) {
    const url = path => `${legacyBase}/${path}.json${hosts.database ? `?ns=${enc(hosts.databaseNs || projectId)}` : ''}`
    store.legacy = {
      get: path => call('old read', url(path)),
      remove: path => call('old delete', url(path), { method: 'DELETE' }),
    }
  }
  return store
}
