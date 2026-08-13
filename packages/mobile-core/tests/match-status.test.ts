import { describe, expect, it } from 'vitest'
import { formatMatchStatus } from '../src/match-status'

describe('formatMatchStatus', () => {
  it('formats LIVE in Chilean Spanish', () => {
    expect(formatMatchStatus('LIVE')).toBe('En juego')
  })
})
