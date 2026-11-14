import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KelmeCupTeams } from '@/components/marketing/KelmeCupTeams'
import { playerDisplayName, type TeamRoster } from '@/lib/kelme-fixture/rosters'

function team(overrides: Partial<TeamRoster> & { teamId: string }): TeamRoster {
  return {
    name: overrides.teamId,
    category: '2017-2016',
    color: null,
    crestUrl: null,
    players: [],
    ...overrides,
  }
}

describe('KelmeCupTeams', () => {
  it('lista los jugadores de cada equipo agrupados por categoría', () => {
    const html = renderToStaticMarkup(
      <KelmeCupTeams
        teams={[
          team({ teamId: 'a', name: '21 de Mayo', players: ['Fabian N.', 'Lucas M.'] }),
          team({ teamId: 'b', name: 'Palestino', players: [] }),
          team({ teamId: 'c', name: 'Dinamo', category: '2019-2018', players: ['Ana P.'] }),
        ]}
      />,
    ).replace(/<!-- -->/g, '')
    expect(html).toContain('Equipos y jugadores')
    expect(html).toContain('Categoría 2017–2016')
    expect(html).toContain('Categoría 2019–2018')
    expect(html).toContain('Fabian N.')
    expect(html).toContain('2 jugadores')
    expect(html).toContain('Nómina por confirmar')
  })

  it('no muestra la sección si ningún equipo tiene jugadores', () => {
    expect(renderToStaticMarkup(<KelmeCupTeams teams={[team({ teamId: 'a' })]} />)).toBe('')
    expect(renderToStaticMarkup(<KelmeCupTeams teams={[]} />)).toBe('')
  })
})

describe('playerDisplayName', () => {
  it('une nombre y apellido guardados', () => {
    expect(playerDisplayName({ firstName: 'Fabian', lastName: 'N.' })).toBe('Fabian N.')
    expect(playerDisplayName({ firstName: 'Lucas', lastName: '' })).toBe('Lucas')
  })
})
