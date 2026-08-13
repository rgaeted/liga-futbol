import { describe, expect, it } from 'vitest'
import { MOBILE_TAB_TITLES } from '../../src/navigation/tab-config'
import { theme } from '../../src/theme'

describe('tab navigation', () => {
  it('registers the five-tab contract in Chilean Spanish', () => {
    expect([...MOBILE_TAB_TITLES]).toEqual([
      'Inicio',
      'Partidos',
      'Tabla',
      'Estadísticas',
      'Más',
    ])
  })

  it('uses the edition primary color', () => {
    expect(theme.primary).toBe('#CD212A')
  })
})
