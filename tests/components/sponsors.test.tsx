// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KelmeCupFixture } from '@/components/marketing/KelmeCupFixture'
import { SponsorCards } from '@/components/marketing/sponsors/SponsorCards'
import { SponsorStrip } from '@/components/marketing/sponsors/SponsorStrip'
import { SponsorViewBeacon } from '@/components/marketing/sponsors/SponsorViewBeacon'
import type { LandingSponsor, LandingSponsors } from '@/lib/sponsors/landing'
import type { FixtureView, FixtureViewMatch } from '@/lib/kelme-fixture/view'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

function sponsor(overrides: Partial<LandingSponsor> & { id: string }): LandingSponsor {
  return {
    name: overrides.id,
    tier: 'OFFICIAL',
    logoUrl: null,
    tagline: null,
    ctaLabel: null,
    hasCta: false,
    hasWebsite: true,
    ...overrides,
  }
}

const SPONSORS: LandingSponsors = {
  seasonId: 's1',
  main: [sponsor({ id: 'main', name: 'Ferretería Principal', tier: 'MAIN' })],
  official: [
    sponsor({ id: 'of1', name: 'Café Oficial', tagline: '10 % para jugadores', ctaLabel: 'Escríbenos', hasCta: true }),
    sponsor({ id: 'of2', name: 'Sin Boton' }),
  ],
  byTargetBySeason: {},
}

describe('SponsorStrip', () => {
  const html = renderToStaticMarkup(<SponsorStrip sponsors={SPONSORS} tone="kelme" />)

  it('muestra al principal primero y enlaza vía la ruta de clic', () => {
    expect(html.indexOf('Ferretería Principal')).toBeLessThan(html.indexOf('Café Oficial'))
    expect(html).toContain('/api/public/sponsors/main/click?to=web')
    expect(html).toContain('target="_blank"')
    expect(html).toMatch(/rel="[^"]*sponsored[^"]*"/)
    expect(html).toMatch(/rel="[^"]*noopener[^"]*"/)
  })

  it('muestra el nombre cuando el auspiciador no tiene logo', () => {
    expect(html).toContain('Sin Boton')
  })
})

describe('SponsorCards', () => {
  const html = renderToStaticMarkup(<SponsorCards sponsors={SPONSORS} tone="kelme" />)

  it('muestra la frase y el botón solo si hay enlace de botón', () => {
    expect(html).toContain('10 % para jugadores')
    expect(html).toContain('Escríbenos')
    expect(html).toContain('/api/public/sponsors/of1/click?to=cta')
    expect(html).not.toContain('/api/public/sponsors/of2/click?to=cta')
  })

  it('muestra el nombre de cada auspiciador aunque tenga logo y destaca al principal', () => {
    const withLogos: LandingSponsors = {
      ...SPONSORS,
      main: [sponsor({ id: 'main', name: 'Ferretería Principal', tier: 'MAIN', logoUrl: '/main.png' })],
      official: [sponsor({ id: 'of1', name: 'Glaciares en Patagonia', logoUrl: '/of1.png' })],
    }
    const text = renderToStaticMarkup(<SponsorCards sponsors={withLogos} tone="kelme" />)
    expect(text).toContain('Auspiciador principal')
    expect(text).toContain('>Ferretería Principal<')
    expect(text).toContain('>Glaciares en Patagonia<')
    expect(text).toContain('/main.png')
  })

  it('muestra una valla por auspiciador con un único enlace dentro del marco', () => {
    expect(html.match(/<article/g)).toHaveLength(3)
    expect(html).toContain('Socio del torneo')
    // La valla entera es el enlace (sin botón): cada una lleva su etiqueta accesible.
    expect(html).toContain('aria-label="Conoce a Sin Boton"')
    expect(html).toContain('aria-label="Escríbenos"')
    expect(html).toContain('/api/public/sponsors/of2/click?to=web')
    expect(html.match(/<a /g)).toHaveLength(3)
    expect(html).not.toContain('>Conoce a')
    expect(html).toMatch(/rel="[^"]*noreferrer[^"]*"/)
  })
})

function fixtureMatch(overrides: Partial<FixtureViewMatch> & { id: string }): FixtureViewMatch {
  return {
    code: overrides.id,
    category: '2017-2016',
    phase: 'GROUP',
    phaseLabel: 'Grupo A',
    group: 'A',
    court: 1,
    startAt: '2026-11-15T12:00:00.000Z',
    endAt: '2026-11-15T12:35:00.000Z',
    timeLabel: '09:00–09:35',
    home: { teamId: 'a', name: 'Local', color: null, pending: false },
    away: { teamId: 'b', name: 'Visita', color: null, pending: false },
    homeGoals: 0,
    awayGoals: 0,
    status: 'SCHEDULED',
    decidedBy: null,
    penaltyHome: null,
    penaltyAway: null,
    updatedAt: '2026-11-12T00:00:00.000Z',
    ...overrides,
  }
}

function fixtureView(matches: FixtureViewMatch[]): FixtureView {
  return { seasonId: 's1', seasonName: 'Kelme', matches, tables: [], positions: [] } as unknown as FixtureView
}

describe('KelmeCupFixture con auspiciadores', () => {
  const view = fixtureView([
    fixtureMatch({ id: 'm1', court: 1 }),
    fixtureMatch({ id: 'm2', court: 2 }),
    fixtureMatch({ id: 'm3', court: 1, phase: 'FINAL', phaseLabel: 'Final', group: null }),
    fixtureMatch({ id: 'm4', court: 3, phase: 'THIRD_PLACE', phaseLabel: '3.er puesto', group: null }),
  ])
  const byTarget = {
    'court:1': sponsor({ id: 'x', name: 'Ferretería X' }),
    'phase:FINAL': sponsor({ id: 'y', name: 'Banco Y' }),
    'phase:THIRD_PLACE': sponsor({ id: 'z', name: 'Radio Z' }),
  }
  const html = renderToStaticMarkup(<KelmeCupFixture view={view} sponsorsByTarget={byTarget} />)
  const text = html.replace(/<!-- -->/g, '')

  it('nombra al auspiciador de la cancha en la píldora', () => {
    expect(text).toContain('Cancha 1 · Ferretería X')
    expect(text).not.toContain('Cancha 2 ·')
  })

  it('muestra "presentada por" en las definiciones con auspiciador', () => {
    expect(text).toContain('Final presentada por')
    expect(text).toContain('Banco Y')
    expect(text).toContain('3.er puesto presentado por')
    expect(text).toContain('Radio Z')
  })

  it('enlaza cada partido a su página en vivo, y sin base no hay enlaces', () => {
    const linked = renderToStaticMarkup(<KelmeCupFixture view={view} liveHrefBase="/kelme/live" />)
    for (const id of ['m1', 'm2', 'm3', 'm4']) expect(linked).toContain(`href="/kelme/live/${id}"`)
    expect(linked).toContain('aria-label="Ver en vivo: Local vs Visita"')
    expect(renderToStaticMarkup(<KelmeCupFixture view={view} />)).not.toContain('/live/')
  })

  it('no muestra textos de auspicio cuando no hay auspiciadores ni "undefined"', () => {
    const plain = renderToStaticMarkup(<KelmeCupFixture view={view} />).replace(/<!-- -->/g, '')
    expect(plain).not.toContain('presentad')
    expect(plain).not.toContain('undefined')
    expect(plain).toContain('Cancha 1')
  })
})

describe('SponsorViewBeacon', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let container: HTMLDivElement

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    sessionStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    container.remove()
  })

  async function mount(ids: string[]) {
    const root = createRoot(container)
    await act(async () => {
      root.render(<SponsorViewBeacon organizationSlug="kelme" sponsorIds={ids} />)
    })
    return root
  }

  it('envía las vistas una vez y no repite al volver a montar en la misma pestaña', async () => {
    const first = await mount(['b', 'a'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/public/sponsors/views')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ organizationSlug: 'kelme', sponsorIds: ['a', 'b'] })
    await act(async () => first.unmount())
    await mount(['a', 'b'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('igual envía una vez si sessionStorage no está disponible', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    await mount(['a'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })

  it('no envía nada si no hay ids', async () => {
    await mount([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
