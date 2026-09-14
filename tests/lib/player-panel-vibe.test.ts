import { describe, it, expect } from 'vitest'
import { playerPanelVibe } from '@/lib/player-panel-vibe'

describe('playerPanelVibe', () => {
  it('returns rookie when no matches', () => {
    expect(playerPanelVibe([], 0, { won: 0, drawn: 0, lost: 0 }).title).toBe('Rookie del lunes')
  })

  it('returns modo bestia on three win streak', () => {
    const vibe = playerPanelVibe(['W', 'W', 'W'], 3, { won: 3, drawn: 0, lost: 0 })
    expect(vibe.title).toBe('Modo bestia')
  })
})
