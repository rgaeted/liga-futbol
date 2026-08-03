export type MigrationDecision =
  | { kind: 'redirect'; location: string }
  | { kind: 'json'; status: 503; body: { error: string } }

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isPublicRequest(method: string, pathname: string): boolean {
  const isPhotoGet =
    method === 'GET' && /^\/api\/friendly-players\/[^/]+\/photo$/.test(pathname)
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
  const isClaimPost =
    method === 'POST' && pathname === '/api/friendly-players/claim'

  return (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/ayuda') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/mantenimiento') ||
    pathname.startsWith('/api/auth') ||
    isPhotoGet ||
    isTeamCrestGet ||
    isMatchCrestGet ||
    isMatchMvpPhotoGet ||
    isFormationsGet ||
    isLiveSnapshotGet ||
    isClaimPost
  )
}

export function decideMigrationRequest(input: {
  method: string
  pathname: string
  search: string
  maintenanceMode: string | undefined
  redirectUrl: string | undefined
  requestOrigin: string
}): MigrationDecision | null {
  const isApi = input.pathname.startsWith('/api/')
  const isNavigation = input.method === 'GET' && !isApi
  const isMaintenancePage = input.pathname.startsWith('/mantenimiento')

  if (input.redirectUrl && isNavigation && !isMaintenancePage) {
    try {
      const target = new URL(input.redirectUrl)
      if (
        (target.protocol === 'http:' || target.protocol === 'https:') &&
        target.origin !== input.requestOrigin
      ) {
        target.pathname = input.pathname
        target.search = input.search
        target.hash = ''
        return { kind: 'redirect', location: target.toString() }
      }
    } catch {
      // Ignore invalid redirect configuration and continue with maintenance.
    }
  }

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
