import { describe, expect, it } from 'vitest'
import { decideMigrationRequest, isPublicRequest } from '@/lib/proxy-policy'

const baseRequest = {
  method: 'GET',
  pathname: '/admin',
  search: '',
  maintenanceMode: undefined,
  redirectUrl: undefined,
  requestOrigin: 'https://torneos-kelme.onrender.com',
}

describe('proxy policy', () => {
  it('preserves the existing public routes', () => {
    expect(isPublicRequest('GET', '/')).toBe(true)
    expect(isPublicRequest('GET', '/login')).toBe(true)
    expect(isPublicRequest('GET', '/register')).toBe(true)
    expect(isPublicRequest('GET', '/ayuda')).toBe(true)
    expect(isPublicRequest('GET', '/live/match-1')).toBe(true)
    expect(isPublicRequest('GET', '/api/auth/session')).toBe(true)
    expect(isPublicRequest('GET', '/api/friendly-players/player-1/photo')).toBe(true)
    expect(isPublicRequest('GET', '/api/teams/team-1/crest')).toBe(true)
    expect(isPublicRequest('GET', '/api/matches/match-1/crest/A')).toBe(true)
    expect(isPublicRequest('GET', '/api/matches/match-1/mvp/home/photo')).toBe(true)
    expect(isPublicRequest('GET', '/api/matches/match-1/formations')).toBe(true)
    expect(isPublicRequest('GET', '/api/mobile/v1/leagues/demo-liga')).toBe(true)
    expect(isPublicRequest('GET', '/api/mobile/v1/leagues/demo-liga/home')).toBe(true)
    expect(isPublicRequest('GET', '/api/mobile/v1/leagues/demo-liga/matches')).toBe(true)
    expect(isPublicRequest('POST', '/api/friendly-players/claim')).toBe(true)
  })

  it('keeps admin routes private', () => {
    expect(isPublicRequest('GET', '/api/admin/seasons/season-1/mobile')).toBe(false)
    expect(isPublicRequest('PUT', '/api/admin/seasons/season-1/mobile')).toBe(false)
  })

  it('makes only GET live snapshots public', () => {
    expect(isPublicRequest('GET', '/api/matches/match-1/live')).toBe(true)
    expect(isPublicRequest('POST', '/api/matches/match-1/live')).toBe(false)
  })

  it('makes the maintenance page public', () => {
    expect(isPublicRequest('GET', '/mantenimiento')).toBe(true)
  })

  it('blocks mutations during maintenance', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        method: 'POST',
        pathname: '/api/matches/match-1/events',
        maintenanceMode: 'true',
      })
    ).toEqual({
      kind: 'json',
      status: 503,
      body: { error: 'Sitio en mantenimiento por migración' },
    })
  })

  it('allows safe non-navigation requests during maintenance', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        method: 'GET',
        pathname: '/api/matches/match-1/live',
        maintenanceMode: 'true',
      })
    ).toBeNull()
  })

  it('redirects private page GETs during maintenance', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        maintenanceMode: 'true',
      })
    ).toEqual({ kind: 'redirect', location: '/mantenimiento' })
  })

  it('redirects an extensionless non-API GET during maintenance without RSC headers', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        pathname: '/admin/settings',
        maintenanceMode: 'true',
      })
    ).toEqual({ kind: 'redirect', location: '/mantenimiento' })
  })

  it('does not redirect public pages during maintenance', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        pathname: '/mantenimiento',
        maintenanceMode: 'true',
      })
    ).toBeNull()
  })

  it('preserves path and query in the Render redirect', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        pathname: '/live/match-1',
        search: '?view=compact',
        redirectUrl: 'https://torneos-kelme.vercel.app',
      })
    ).toEqual({
      kind: 'redirect',
      location: 'https://torneos-kelme.vercel.app/live/match-1?view=compact',
    })
  })

  it('legacy-redirects an extensionless non-API GET without RSC headers', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        pathname: '/admin/settings',
        redirectUrl: 'https://torneos-kelme.vercel.app',
      })
    ).toEqual({
      kind: 'redirect',
      location: 'https://torneos-kelme.vercel.app/admin/settings',
    })
  })

  it('never sends APIs or mutations to the legacy redirect', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        pathname: '/api/matches/match-1/live',
        redirectUrl: 'https://torneos-kelme.vercel.app',
      })
    ).toBeNull()
    expect(
      decideMigrationRequest({
        ...baseRequest,
        method: 'POST',
        redirectUrl: 'https://torneos-kelme.vercel.app',
      })
    ).toBeNull()
  })

  it('does not legacy-redirect the maintenance page', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        pathname: '/mantenimiento',
        redirectUrl: 'https://torneos-kelme.vercel.app',
      })
    ).toBeNull()
  })

  it('ignores a same-origin legacy redirect target', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        redirectUrl: 'https://torneos-kelme.onrender.com',
      })
    ).toBeNull()
  })

  it('ignores invalid redirect URLs', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        redirectUrl: 'not a URL',
      })
    ).toBeNull()
    expect(
      decideMigrationRequest({
        ...baseRequest,
        redirectUrl: 'javascript:alert(1)',
      })
    ).toBeNull()
  })

  it('continues applying maintenance when the redirect URL is invalid', () => {
    expect(
      decideMigrationRequest({
        ...baseRequest,
        maintenanceMode: 'true',
        redirectUrl: 'not a URL',
      })
    ).toEqual({ kind: 'redirect', location: '/mantenimiento' })
  })
})
