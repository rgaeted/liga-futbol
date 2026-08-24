import { describe, expect, it } from 'vitest'
import {
  canViewMatchLive,
  friendlyLineupLinkLabel,
  isMatchFormationReadOnly,
  matchLiveLinkLabel,
} from '@/lib/match-player-links'

describe('match-player-links', () => {
  it('allows live view for finished and in-progress matches', () => {
    expect(canViewMatchLive('FINISHED')).toBe(true)
    expect(canViewMatchLive('LIVE')).toBe(true)
    expect(canViewMatchLive('HALFTIME')).toBe(true)
    expect(canViewMatchLive('SCHEDULED')).toBe(false)
  })

  it('labels live links by status', () => {
    expect(matchLiveLinkLabel('FINISHED')).toBe('Ver partido')
    expect(matchLiveLinkLabel('LIVE')).toBe('EN VIVO')
  })

  it('locks formation editing after the match ends', () => {
    expect(isMatchFormationReadOnly('FINISHED')).toBe(true)
    expect(isMatchFormationReadOnly('LIVE')).toBe(false)
    expect(friendlyLineupLinkLabel('FINISHED')).toBe('Ver formación')
    expect(friendlyLineupLinkLabel('SCHEDULED')).toBe('Editar formación')
  })
})
