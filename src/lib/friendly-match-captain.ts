export type FriendlyRosterEntry = {
  playerId: string
  side: 'A' | 'B'
  isCaptain?: boolean
  isCoach?: boolean
}

export function validateFriendlyCaptains(players: FriendlyRosterEntry[]): string | null {
  for (const side of ['A', 'B'] as const) {
    const captains = players.filter((p) => p.side === side && p.isCaptain)
    if (captains.length !== 1) {
      return side === 'A'
        ? 'Debes elegir un capitán para el equipo local (lado A)'
        : 'Debes elegir un capitán para el equipo visitante (lado B)'
    }
  }
  return null
}

export function captainsFromRoster(players: FriendlyRosterEntry[]): {
  sideACaptainId: string | null
  sideBCaptainId: string | null
} {
  let sideACaptainId: string | null = null
  let sideBCaptainId: string | null = null
  for (const p of players) {
    if (!p.isCaptain) continue
    if (p.side === 'A') sideACaptainId = p.playerId
    else sideBCaptainId = p.playerId
  }
  return { sideACaptainId, sideBCaptainId }
}

export type FriendlyCaptainView = {
  side: 'A' | 'B'
  playerId: string
  label: string
}

export function resolveFriendlyCaptains(
  participations: Array<{
    friendlyPlayerId: string
    side: 'A' | 'B'
    isCaptain: boolean
    friendlyPlayer: { firstName: string; lastName: string }
  }>
): FriendlyCaptainView[] {
  return participations
    .filter((p) => p.isCaptain)
    .map((p) => ({
      side: p.side,
      playerId: p.friendlyPlayerId,
      label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`.trim(),
    }))
}

export function friendlyCaptainPlayerIds(captains: FriendlyCaptainView[]): string[] {
  return captains.map((c) => c.playerId)
}
