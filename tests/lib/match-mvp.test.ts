import { describe, it, expect } from 'vitest'
import { resolveMvpLabel, resolveMvpPlayerId } from '@/lib/match-mvp'
import { setMatchMvpSchema } from '@/lib/validations/mvp'

describe('resolveMvpLabel', () => {
  it('returns league player name', () => {
    expect(
      resolveMvpLabel({
        matchType: 'LEAGUE',
        mvpPlayer: { user: { name: 'Juan Pérez' } },
      })
    ).toBe('Juan Pérez')
  })

  it('returns friendly player name', () => {
    expect(
      resolveMvpLabel({
        matchType: 'FRIENDLY',
        mvpFriendlyPlayer: { firstName: 'Ana', lastName: 'López' },
      })
    ).toBe('Ana López')
  })

  it('returns null when unset', () => {
    expect(resolveMvpLabel({ matchType: 'LEAGUE' })).toBeNull()
  })
})

describe('resolveMvpPlayerId', () => {
  it('returns friendly id for amistoso', () => {
    expect(
      resolveMvpPlayerId({
        matchType: 'FRIENDLY',
        mvpPlayerId: null,
        mvpFriendlyPlayerId: 'fp-1',
      })
    ).toBe('fp-1')
  })

  it('returns player id for liga', () => {
    expect(
      resolveMvpPlayerId({
        matchType: 'LEAGUE',
        mvpPlayerId: 'p-1',
        mvpFriendlyPlayerId: null,
      })
    ).toBe('p-1')
  })
})

describe('setMatchMvpSchema', () => {
  it('accepts league mvp', () => {
    const result = setMatchMvpSchema.safeParse({ playerId: 'player-1' })
    expect(result.success).toBe(true)
  })

  it('accepts clearing mvp', () => {
    const result = setMatchMvpSchema.safeParse({ playerId: null })
    expect(result.success).toBe(true)
  })

  it('rejects both ids', () => {
    const result = setMatchMvpSchema.safeParse({
      playerId: 'p-1',
      friendlyPlayerId: 'fp-1',
    })
    expect(result.success).toBe(false)
  })
})
