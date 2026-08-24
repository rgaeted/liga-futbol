import { parseOrganizationSlug } from '@/lib/organization-slug'

export type MigrationDecision =
  | { kind: 'redirect'; location: string }
  | { kind: 'json'; status: 503; body: { error: string } }

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const tenantLive = /^\/[^/]+\/live(?:\/|$)/
const tenantAyuda = /^\/[^/]+\/ayuda(?:\/|$)/

function isTenantOrgLandingGet(method: string, pathname: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false
  const match = /^\/([^/]+)$/.exec(pathname)
  if (!match) return false
  return parseOrganizationSlug(match[1]).ok
}

export function isPublicRequest(method: string, pathname: string): boolean {
  const isPhotoGet =
    method === 'GET' && /^\/api\/players\/[^/]+\/photo$/.test(pathname)
  const isTeamCrestGet =
    method === 'GET' && /^\/api\/teams\/[^/]+\/crest$/.test(pathname)
  const isMatchCrestGet =
    method === 'GET' && /^\/api\/matches\/[^/]+\/crest\/[AB]$/.test(pathname)
  const isMatchMvpPhotoGet =
    method === 'GET' &&
    /^\/api\/matches\/[^/]+\/mvp\/(home|away)\/photo$/.test(pathname)
  const isFormationsGet =
    method === 'GET' && /^\/api\/matches\/[^/]+\/formations$/.test(pathname)
  const isLiveSnapshotGet =
    method === 'GET' && /^\/api\/matches\/[^/]+\/live$/.test(pathname)
  const isMobileLeagueGet =
    method === 'GET' && /^\/api\/mobile\/v1\/leagues\/[^/]+(\/.*)?$/.test(pathname)
  const isMobileInstallationPost =
    method === 'POST' && /^\/api\/mobile\/v1\/leagues\/[^/]+\/installations$/.test(pathname)
  const isMobileInstallationSubscriptionsPut =
    method === 'PUT' &&
    /^\/api\/mobile\/v1\/leagues\/[^/]+\/installations\/[^/]+\/subscriptions$/.test(pathname)
  const isMobileInstallationDelete =
    method === 'DELETE' &&
    /^\/api\/mobile\/v1\/leagues\/[^/]+\/installations\/[^/]+$/.test(pathname)
  const isPlayersClaimPost =
    method === 'POST' && pathname === '/api/players/claim'
  const isTenantPublicGet =
    (method === 'GET' || method === 'HEAD') &&
    (tenantLive.test(pathname) || tenantAyuda.test(pathname))

  return (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/ayuda') ||
    pathname.startsWith('/privacidad/app') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/mantenimiento') ||
    pathname.startsWith('/api/auth') ||
    isTenantPublicGet ||
    isPhotoGet ||
    isTeamCrestGet ||
    isMatchCrestGet ||
    isMatchMvpPhotoGet ||
    isFormationsGet ||
    isLiveSnapshotGet ||
    isMobileLeagueGet ||
    isMobileInstallationPost ||
    isMobileInstallationSubscriptionsPut ||
    isMobileInstallationDelete ||
    isPlayersClaimPost ||
    isTenantOrgLandingGet(method, pathname)
  )
}

export function decideMigrationRequest(input: {
  method: string
  pathname: string
  maintenanceMode: string | undefined
}): MigrationDecision | null {
  const isApi = input.pathname.startsWith('/api/')
  const isNavigation = input.method === 'GET' && !isApi

  if (input.maintenanceMode !== 'true') return null
  if (!SAFE_METHODS.has(input.method)) {
    return {
      kind: 'json',
      status: 503,
      body: { error: 'Sitio en mantenimiento por migración' },
    }
  }
  if (isNavigation && !isPublicRequest(input.method, input.pathname)) {
    return { kind: 'redirect', location: '/mantenimiento' }
  }
  return null
}
