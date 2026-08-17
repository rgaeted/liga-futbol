export const MembershipRole = {
  ORG_ADMIN: 'ORG_ADMIN',
  COACH: 'COACH',
  REFEREE: 'REFEREE',
  PLAYER: 'PLAYER',
  FRIENDLY_COACH: 'FRIENDLY_COACH',
} as const

export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole]

export type RouteArea = 'admin' | 'player' | 'coach' | 'referee' | 'live'

const ROLE_ACCESS: Record<MembershipRole, RouteArea[]> = {
  [MembershipRole.ORG_ADMIN]: ['admin', 'player', 'coach', 'referee', 'live'],
  [MembershipRole.PLAYER]: ['player', 'live'],
  [MembershipRole.COACH]: ['coach', 'live'],
  [MembershipRole.REFEREE]: ['referee', 'live'],
  [MembershipRole.FRIENDLY_COACH]: ['player', 'live'],
}

export function canAccess(role: MembershipRole, area: RouteArea): boolean {
  return ROLE_ACCESS[role].includes(area)
}

export function getDashboardPath(slug: string, role: MembershipRole): string {
  const paths: Record<MembershipRole, string> = {
    [MembershipRole.ORG_ADMIN]: `/${slug}/admin`,
    [MembershipRole.PLAYER]: `/${slug}/player`,
    [MembershipRole.COACH]: `/${slug}/coach`,
    [MembershipRole.REFEREE]: `/${slug}/referee`,
    [MembershipRole.FRIENDLY_COACH]: `/${slug}/player/friendly-matches`,
  }
  return paths[role]
}

export function isPlayerAreaRole(role: MembershipRole): boolean {
  return role === MembershipRole.PLAYER || role === MembershipRole.FRIENDLY_COACH
}

const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  [MembershipRole.ORG_ADMIN]: 'Administrador',
  [MembershipRole.COACH]: 'Director técnico',
  [MembershipRole.REFEREE]: 'Árbitro',
  [MembershipRole.PLAYER]: 'Jugador',
  [MembershipRole.FRIENDLY_COACH]: 'DT amistoso',
}

export function membershipRoleLabel(role: MembershipRole): string {
  return MEMBERSHIP_ROLE_LABELS[role]
}

export function membershipRoleFromLegacyUserRole(
  role: 'PLAYER' | 'ADMIN' | 'COACH' | 'REFEREE' | 'FRIENDLY_COACH',
): MembershipRole {
  if (role === 'ADMIN') return MembershipRole.ORG_ADMIN
  return role
}
