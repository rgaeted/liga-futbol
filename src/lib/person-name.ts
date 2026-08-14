export function splitPersonName(raw: string): { firstName: string; lastName: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { firstName: 'Sin nombre', lastName: '' }
  const space = trimmed.indexOf(' ')
  if (space === -1) return { firstName: trimmed, lastName: '' }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  }
}

export function joinPersonName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

export type PlayerNameSource = {
  person: { firstName: string; lastName: string; user: { name: string } | null }
}

export const PLAYER_PERSON_NAME_INCLUDE = {
  person: { include: { user: { select: { name: true } } } },
} as const

export function playerDisplayName(player: PlayerNameSource): string {
  if (player.person.user?.name) return player.person.user.name
  return joinPersonName(player.person.firstName, player.person.lastName)
}
