import { MobileApiError } from '@/lib/mobile/errors'

export function getRequestClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export function buildInstallationRateLimitKey(
  slug: string,
  ip: string,
  operation: 'register' | 'subscriptions' | 'deactivate',
): string {
  return `${slug}:${ip}:${operation}`
}

export function assertBearerInstallationId(request: Request, installationId: string): void {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw new MobileApiError(401, 'No autorizado')
  }

  const bearer = authorization.slice('Bearer '.length).trim()
  if (bearer !== installationId) {
    throw new MobileApiError(401, 'No autorizado')
  }
}
