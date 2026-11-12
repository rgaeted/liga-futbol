import { describe, expect, it, vi } from 'vitest'

vi.stubEnv('NEXT_PUBLIC_MEDIA_BASE_URL', 'https://media.test')

import {
  buildLandingSponsors,
  courtTarget,
  phaseTarget,
  pickLandingSeasonId,
  sponsorClickHref,
  type SponsorRowForLanding,
} from '@/lib/sponsors/landing'

const NOW = new Date('2026-11-12T12:00:00Z')

function row(overrides: Partial<SponsorRowForLanding> & { id: string }): SponsorRowForLanding {
  return {
    name: overrides.id,
    tier: 'OFFICIAL',
    logoStoragePath: null,
    tagline: null,
    ctaLabel: null,
    ctaUrl: null,
    websiteUrl: 'https://x.cl',
    isActive: true,
    startsAt: null,
    endsAt: null,
    showOnLanding: true,
    sortOrder: 0,
    seasonId: 's1',
    ...overrides,
  }
}

describe('pickLandingSeasonId', () => {
  it('elige la temporada más reciente con un auspiciador visible en el landing', () => {
    const rows = [
      row({ id: 'a', seasonId: 'nueva', showOnLanding: false }),
      row({ id: 'b', seasonId: 'media', endsAt: new Date('2026-01-01') }),
      row({ id: 'c', seasonId: 'vieja' }),
    ]
    expect(pickLandingSeasonId(rows, ['nueva', 'media', 'vieja'], NOW)).toBe('vieja')
  })

  it('devuelve null si ninguno es visible', () => {
    expect(pickLandingSeasonId([row({ id: 'a', isActive: false })], ['s1'], NOW)).toBeNull()
  })
})

describe('buildLandingSponsors', () => {
  it('separa principales y oficiales, ordena y excluye no visibles', () => {
    const result = buildLandingSponsors({
      seasonId: 's1',
      now: NOW,
      assignments: [],
      sponsors: [
        row({ id: 'of2', name: 'Zeta', sortOrder: 1 }),
        row({ id: 'of1', name: 'Alfa', sortOrder: 1 }),
        row({ id: 'main', name: 'Principal', tier: 'MAIN', logoStoragePath: 'seasons/s1/sponsors/main/logo.png' }),
        row({ id: 'off', isActive: false }),
        row({ id: 'vencido', endsAt: new Date('2026-01-01') }),
        row({ id: 'oculto', showOnLanding: false }),
      ],
    })!
    expect(result.main.map((s) => s.id)).toEqual(['main'])
    expect(result.official.map((s) => s.id)).toEqual(['of1', 'of2'])
    expect(result.main[0].logoUrl).toContain('seasons/s1/sponsors/main/logo.png')
  })

  it('devuelve null si no queda nada visible ni asignado', () => {
    expect(buildLandingSponsors({ seasonId: 's1', now: NOW, assignments: [], sponsors: [row({ id: 'a', showOnLanding: false })] })).toBeNull()
  })

  it('byTarget excluye auspiciadores vencidos pero admite los que no están en la franja', () => {
    const result = buildLandingSponsors({
      seasonId: 's1',
      now: NOW,
      sponsors: [
        row({ id: 'vigente', showOnLanding: false }),
        row({ id: 'vencido', endsAt: new Date('2026-01-01') }),
        row({ id: 'franja' }),
      ],
      assignments: [
        { target: 'court:1', sponsorId: 'vigente' },
        { target: 'court:2', sponsorId: 'vencido' },
        { target: 'phase:FINAL', sponsorId: 'vigente' },
      ],
    })!
    expect(Object.keys(result.byTarget).sort()).toEqual(['court:1', 'phase:FINAL'])
    expect(result.main.concat(result.official).map((s) => s.id)).toEqual(['franja'])
  })

  it('marca hasCta y hasWebsite según los enlaces guardados', () => {
    const result = buildLandingSponsors({
      seasonId: 's1',
      now: NOW,
      assignments: [],
      sponsors: [row({ id: 'a', ctaUrl: 'https://wa.me/1', ctaLabel: 'Escríbenos', websiteUrl: null })],
    })!
    expect(result.official[0]).toMatchObject({ hasCta: true, hasWebsite: false, ctaLabel: 'Escríbenos' })
  })
})

describe('helpers de enlace', () => {
  it('arma targets y href de clic', () => {
    expect(courtTarget(3)).toBe('court:3')
    expect(phaseTarget('FINAL')).toBe('phase:FINAL')
    expect(sponsorClickHref('s1', 'cta')).toBe('/api/public/sponsors/s1/click?to=cta')
  })
})
