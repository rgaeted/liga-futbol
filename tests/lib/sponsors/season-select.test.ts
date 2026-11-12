import { describe, expect, it } from 'vitest'
import { resolveSelectedSeasonId } from '@/lib/sponsors/season-select'

const seasons = [{ id: 'nueva' }, { id: 'vieja' }]

describe('resolveSelectedSeasonId', () => {
  it('respeta una temporada pedida que pertenece a la organización', () => {
    expect(resolveSelectedSeasonId(seasons, 'vieja')).toBe('vieja')
  })
  it('ignora una temporada de otra organización y usa la más reciente', () => {
    expect(resolveSelectedSeasonId(seasons, 'de-otra-liga')).toBe('nueva')
  })
  it('usa la más reciente si no se pidió ninguna y null si no hay temporadas', () => {
    expect(resolveSelectedSeasonId(seasons, undefined)).toBe('nueva')
    expect(resolveSelectedSeasonId([], 'x')).toBeNull()
  })
})
