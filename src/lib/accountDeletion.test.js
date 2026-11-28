import { describe, it, expect } from 'vitest'
import { requestAccountDeletion } from './accountDeletion'

const user = { getIdToken: async () => 'id-token' }
const answer = (status, body) => async (url, init) => {
  answer.last = { url, init }
  return new Response(JSON.stringify(body), { status })
}

describe('requestAccountDeletion', () => {
  it('sends the signed-in person\'s token and a confirmation, and reports success', async () => {
    const res = await requestAccountDeletion(user, { url: 'https://proxy.example', fetchImpl: answer(200, { success: true }) })
    expect(res).toEqual({ success: true })
    expect(answer.last.init.headers.Authorization).toBe('Bearer id-token')
    expect(JSON.parse(answer.last.init.body)).toEqual({ action: 'deleteAccount', confirm: 'DELETE' })
  })

  it('asks for a fresh sign-in when the Worker does', async () => {
    expect(await requestAccountDeletion(user, { url: 'https://proxy.example', fetchImpl: answer(401, { error: 'reauth' }) })).toEqual({ error: 'reauth' })
  })

  it('fails safely on any other answer, a network error, or no Worker', async () => {
    expect(await requestAccountDeletion(user, { url: 'https://proxy.example', fetchImpl: answer(500, { error: 'failed' }) })).toEqual({ error: 'failed' })
    expect(await requestAccountDeletion(user, { url: 'https://proxy.example', fetchImpl: async () => { throw new Error('offline') } })).toEqual({ error: 'failed' })
    expect(await requestAccountDeletion(user, { url: '' })).toEqual({ error: 'failed' })
  })
})
