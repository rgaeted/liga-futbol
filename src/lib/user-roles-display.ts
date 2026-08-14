import type { MembershipRole } from '@/lib/membership-role'

export type UserRoleTagId =
  | 'admin'
  | 'coach_league'
  | 'referee'
  | 'coach_friendly'
  | 'player_league'
  | 'player_friendly'
  | 'player'

const TAG_META: Record<UserRoleTagId, { label: string; priority: number }> = {
  admin: { label: 'Admin', priority: 0 },
  coach_league: { label: 'DT liga', priority: 10 },
  referee: { label: 'Árbitro', priority: 20 },
  coach_friendly: { label: 'DT amistoso', priority: 30 },
  player_league: { label: 'Jugador liga', priority: 40 },
  player: { label: 'Jugador', priority: 45 },
  player_friendly: { label: 'Jugador amistoso', priority: 50 },
}

export type UserRoleTag = { id: UserRoleTagId; label: string }

export type UserRoleContext = {
  role: MembershipRole
  hasCoachedTeam: boolean
  hasLeagueTeam: boolean
  hasFriendlyProfile: boolean
  isFriendlyCoach: boolean
}

/** Menor priority = menos restrictivo; ese rol se muestra primero. */
export function resolveUserRoleTags(input: UserRoleContext): UserRoleTag[] {
  const ids = new Set<UserRoleTagId>()

  if (input.role === 'ORG_ADMIN') ids.add('admin')
  if (input.role === 'COACH' || input.hasCoachedTeam) ids.add('coach_league')
  if (input.role === 'REFEREE') ids.add('referee')
  if (input.role === 'FRIENDLY_COACH' || input.isFriendlyCoach) ids.add('coach_friendly')
  if (input.hasLeagueTeam) ids.add('player_league')
  if (input.hasFriendlyProfile) ids.add('player_friendly')

  if (
    input.role === 'PLAYER' &&
    !ids.has('player_league') &&
    !ids.has('player_friendly') &&
    !ids.has('coach_friendly')
  ) {
    ids.add('player')
  }

  return [...ids]
    .map((id) => ({ id, label: TAG_META[id].label }))
    .sort((a, b) => TAG_META[a.id].priority - TAG_META[b.id].priority)
}

export function primaryUserRoleLabel(tags: UserRoleTag[]): string {
  return tags[0]?.label ?? '—'
}
