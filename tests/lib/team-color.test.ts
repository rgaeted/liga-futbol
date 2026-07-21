import { describe, it, expect } from 'vitest'
import {
  deriveTeamColor,
  resolveTeamColor,
  resolveEventTeamColor,
  contrastTextColor,
  TEAM_COLOR_PALETTE,
} from '@/lib/team-color'

describe('team-color', () => {
  it('derives stable color from seed', () => {
    expect(deriveTeamColor('Blancos')).toBe(deriveTeamColor('Blancos'))
    expect(TEAM_COLOR_PALETTE).toContain(deriveTeamColor('Negros'))
  })

  it('uses stored color when valid', () => {
    expect(resolveTeamColor('#2563EB', 'X')).toBe('#2563EB')
  })

  it('falls back to derived color', () => {
    expect(resolveTeamColor(null, 'Blancos')).toBe(deriveTeamColor('Blancos'))
  })

  it('maps event team to side color', () => {
    const sides = {
      homeName: 'Blancos',
      awayName: 'Negros',
      homeColor: '#F5F5F5',
      awayColor: '#1A1A1A',
    }
    expect(resolveEventTeamColor('Blancos', sides)).toBe('#F5F5F5')
    expect(resolveEventTeamColor('Negros', sides)).toBe('#1A1A1A')
  })

  it('picks readable text on light and dark backgrounds', () => {
    expect(contrastTextColor('#F5F5F5')).toBe('#111827')
    expect(contrastTextColor('#1A1A1A')).toBe('#ffffff')
  })
})
