import { createPlayerClaimToken } from '@/lib/player-claim-token'

export function playerRegisterPath(playerId: string, orgSlug?: string | null): string {
  const params = new URLSearchParams()
  params.set('mode', 'register')
  params.set('player', playerId)
  params.set('token', createPlayerClaimToken(playerId))
  if (orgSlug) params.set('callbackUrl', `/${orgSlug}`)
  return `/login?${params.toString()}`
}
