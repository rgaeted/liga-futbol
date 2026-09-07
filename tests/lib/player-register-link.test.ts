import { beforeEach, describe, expect, it } from 'vitest'
import { verifyPlayerClaimToken } from '@/lib/player-claim-token'
import { playerRegisterPath } from '@/lib/player-register-link'

describe('playerRegisterPath', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret'
  })

  it('builds a signed register link for one player', () => {
    const path = playerRegisterPath('p1')
    const url = new URL(path, 'http://localhost')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('mode')).toBe('register')
    expect(url.searchParams.get('player')).toBe('p1')
    const token = url.searchParams.get('token')
    expect(token).toBeTruthy()
    expect(verifyPlayerClaimToken('p1', token!)).toBe(true)
  })

  it('adds the org landing as callback when a slug is given', () => {
    const path = playerRegisterPath('p1', 'loslunes')
    const url = new URL(path, 'http://localhost')
    expect(url.searchParams.get('callbackUrl')).toBe('/loslunes')
  })
})
