export function playerRegisterPath(playerId: string, orgSlug?: string | null): string {
  const params = new URLSearchParams()
  params.set('mode', 'register')
  params.set('player', playerId)
  if (orgSlug) params.set('callbackUrl', `/${orgSlug}`)
  return `/login?${params.toString()}`
}
