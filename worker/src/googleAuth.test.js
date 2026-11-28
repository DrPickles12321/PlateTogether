import { describe, it, expect } from 'vitest'
import { generateKeyPair, exportPKCS8, jwtVerify } from 'jose'
import { serviceAccountTokens, SCOPES } from './googleAuth'

describe('service account tokens', () => {
  it('signs a token request Google can check, and reuses the token until it nearly runs out', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
    const key = { client_email: 'deleter@example-project.iam.gserviceaccount.com', private_key: await exportPKCS8(privateKey), private_key_id: 'k1' }
    let t = 1_000_000
    const seen = []
    const fetchImpl = async (url, init) => {
      const assertion = new URLSearchParams(init.body).get('assertion')
      const { payload, protectedHeader } = await jwtVerify(assertion, publicKey, { audience: url, issuer: key.client_email, currentDate: new Date(t * 1000) })
      seen.push({ payload, protectedHeader })
      return new Response(JSON.stringify({ access_token: `tok${seen.length}`, expires_in: 3600 }))
    }
    const getToken = serviceAccountTokens(JSON.stringify(key), { fetchImpl, now: () => t })

    expect(await getToken()).toBe('tok1')
    expect(seen[0].payload.scope).toBe(SCOPES)
    expect(seen[0].protectedHeader.kid).toBe('k1')
    t += 3000
    expect(await getToken()).toBe('tok1')
    t += 600
    expect(await getToken()).toBe('tok2')
  })

  it('refuses an incomplete key', () => {
    expect(() => serviceAccountTokens('{"client_email":"x"}')).toThrow('incomplete')
  })
})
