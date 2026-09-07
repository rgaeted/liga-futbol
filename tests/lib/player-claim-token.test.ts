import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPlayerClaimToken, verifyPlayerClaimToken } from '@/lib/player-claim-token'

describe('player claim token', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret'
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
  })

  it('verifies a token issued for the same player', () => {
    const token = createPlayerClaimToken('player-1')
    expect(verifyPlayerClaimToken('player-1', token)).toBe(true)
  })

  it('rejects tokens for another player', () => {
    const token = createPlayerClaimToken('player-1')
    expect(verifyPlayerClaimToken('player-2', token)).toBe(false)
  })

  it('rejects tampered tokens', () => {
    const token = createPlayerClaimToken('player-1')
    expect(verifyPlayerClaimToken('player-1', `${token}x`)).toBe(false)
  })
})
