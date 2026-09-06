import { describe, expect, it } from 'vitest'
import { playerRegisterPath } from '@/lib/player-register-link'

describe('playerRegisterPath', () => {
  it('builds a register link for an unclaimed player', () => {
    expect(playerRegisterPath('p1')).toBe('/login?mode=register&player=p1')
  })

  it('adds the org landing as callback when a slug is given', () => {
    expect(playerRegisterPath('p1', 'loslunes')).toBe(
      '/login?mode=register&player=p1&callbackUrl=%2Floslunes',
    )
  })
})
