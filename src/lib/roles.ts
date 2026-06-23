export const Role = {
  PLAYER: 'PLAYER',
  ADMIN: 'ADMIN',
  COACH: 'COACH',
  REFEREE: 'REFEREE',
} as const

export type Role = (typeof Role)[keyof typeof Role]

type RouteArea = 'admin' | 'player' | 'coach' | 'referee' | 'live'

const ROLE_ACCESS: Record<Role, RouteArea[]> = {
  [Role.ADMIN]: ['admin', 'player', 'coach', 'referee', 'live'],
  [Role.PLAYER]: ['player', 'live'],
  [Role.COACH]: ['coach', 'live'],
  [Role.REFEREE]: ['referee', 'live'],
}

export function canAccess(role: Role, area: RouteArea): boolean {
  return ROLE_ACCESS[role].includes(area)
}

export function getDashboardPath(role: Role): string {
  const paths: Record<Role, string> = {
    [Role.ADMIN]: '/admin',
    [Role.PLAYER]: '/player',
    [Role.COACH]: '/coach',
    [Role.REFEREE]: '/referee',
  }
  return paths[role]
}
