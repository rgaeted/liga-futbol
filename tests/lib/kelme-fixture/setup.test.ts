import { describe, expect, it } from 'vitest'
import { pickExistingTeam, type ExistingTeam } from '@/lib/kelme-fixture/setup'

const team = (id: string, name: string, categoryId: string | null, day = 1): ExistingTeam => ({
  id,
  name,
  categoryId,
  createdAt: new Date(2026, 0, day),
})

const def = { name: 'Unión Española', aliases: ['Union Española PV'] }

describe('pickExistingTeam', () => {
  it('reutiliza un equipo de la misma categoría por nombre o alias, sin tildes ni mayúsculas', () => {
    const result = pickExistingTeam([team('t1', 'union española pv', 'c19')], def, 'c19')
    expect(result.team?.id).toBe('t1')
  })

  it('nunca reutiliza el equipo homónimo de otra categoría', () => {
    const result = pickExistingTeam([team('t17', 'Union Española PV', 'c17')], def, 'c19')
    expect(result.team).toBeNull()
  })

  it('ignora equipos sin categoría', () => {
    expect(pickExistingTeam([team('t0', 'Unión Española', null)], def, 'c19').team).toBeNull()
  })

  it('elige el más antiguo y reporta los duplicados', () => {
    const result = pickExistingTeam(
      [team('nuevo', 'Unión Española', 'c19', 9), team('viejo', 'Union Española PV', 'c19', 2)],
      def,
      'c19',
    )
    expect(result.team?.id).toBe('viejo')
    expect(result.duplicates.map((t) => t.id)).toEqual(['nuevo'])
  })
})
