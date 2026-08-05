export type FriendlySide = 'A' | 'B'

export function playerSortKey(p: { firstName: string; lastName: string }) {
  return `${p.lastName} ${p.firstName}`.toLowerCase()
}

export function initialSideSplit(
  players: Array<{ id: string; firstName: string; lastName: string }>
): Map<string, FriendlySide> {
  const sorted = [...players].sort((a, b) =>
    playerSortKey(a).localeCompare(playerSortKey(b), 'es')
  )
  const mid = Math.ceil(sorted.length / 2)
  const map = new Map<string, FriendlySide>()
  sorted.forEach((p, i) => map.set(p.id, i < mid ? 'A' : 'B'))
  return map
}

export function mapToSideSets(map: Map<string, FriendlySide>) {
  const sideAIds = new Set<string>()
  const sideBIds = new Set<string>()
  for (const [id, side] of map) {
    if (side === 'A') sideAIds.add(id)
    else sideBIds.add(id)
  }
  return { sideAIds, sideBIds }
}

export function applyInitialSplitForUnassigned(
  convoked: Array<{ id: string; firstName: string; lastName: string }>,
  sideAIds: Set<string>,
  sideBIds: Set<string>
) {
  const unassigned = convoked.filter(
    (p) => !sideAIds.has(p.id) && !sideBIds.has(p.id)
  )
  if (unassigned.length === 0) {
    return { sideAIds: new Set(sideAIds), sideBIds: new Set(sideBIds) }
  }
  const split = mapToSideSets(initialSideSplit(unassigned))
  return {
    sideAIds: new Set([...sideAIds, ...split.sideAIds]),
    sideBIds: new Set([...sideBIds, ...split.sideBIds]),
  }
}

export function setPlayerSide(input: {
  playerId: string
  side: FriendlySide
  sideAIds: Set<string>
  sideBIds: Set<string>
  sideACaptainId: string | null
  sideBCaptainId: string | null
  sideACoachId: string | null
  sideBCoachId: string | null
}) {
  const sideAIds = new Set(input.sideAIds)
  const sideBIds = new Set(input.sideBIds)
  let sideACaptainId = input.sideACaptainId
  let sideBCaptainId = input.sideBCaptainId
  let sideACoachId = input.sideACoachId
  let sideBCoachId = input.sideBCoachId

  if (input.side === 'A') {
    sideAIds.add(input.playerId)
    sideBIds.delete(input.playerId)
    if (sideBCaptainId === input.playerId) sideBCaptainId = null
    if (sideBCoachId === input.playerId) sideBCoachId = null
  } else {
    sideBIds.add(input.playerId)
    sideAIds.delete(input.playerId)
    if (sideACaptainId === input.playerId) sideACaptainId = null
    if (sideACoachId === input.playerId) sideACoachId = null
  }

  return { sideAIds, sideBIds, sideACaptainId, sideBCaptainId, sideACoachId, sideBCoachId }
}

export function toggleConvocation(input: {
  playerId: string
  checked: boolean
  convokedIds: Set<string>
  sideAIds: Set<string>
  sideBIds: Set<string>
  sideACaptainId: string | null
  sideBCaptainId: string | null
  sideACoachId: string | null
  sideBCoachId: string | null
}) {
  const convokedIds = new Set(input.convokedIds)
  const sideAIds = new Set(input.sideAIds)
  const sideBIds = new Set(input.sideBIds)
  let sideACaptainId = input.sideACaptainId
  let sideBCaptainId = input.sideBCaptainId
  let sideACoachId = input.sideACoachId
  let sideBCoachId = input.sideBCoachId

  if (input.checked) {
    convokedIds.add(input.playerId)
  } else {
    convokedIds.delete(input.playerId)
    sideAIds.delete(input.playerId)
    sideBIds.delete(input.playerId)
    if (sideACaptainId === input.playerId) sideACaptainId = null
    if (sideBCaptainId === input.playerId) sideBCaptainId = null
    if (sideACoachId === input.playerId) sideACoachId = null
    if (sideBCoachId === input.playerId) sideBCoachId = null
  }

  return {
    convokedIds,
    sideAIds,
    sideBIds,
    sideACaptainId,
    sideBCaptainId,
    sideACoachId,
    sideBCoachId,
  }
}

export function rosterEntriesFromSets(
  sideAIds: Set<string>,
  sideBIds: Set<string>,
  sideACaptainId: string | null = null,
  sideBCaptainId: string | null = null,
  sideACoachId: string | null = null,
  sideBCoachId: string | null = null
) {
  const sideBOnly = [...sideBIds].filter((id) => !sideAIds.has(id))
  const sideAOnly = [...sideAIds]
  return [
    ...sideAOnly.map((friendlyPlayerId) => ({
      friendlyPlayerId,
      side: 'A' as const,
      isCaptain: friendlyPlayerId === sideACaptainId,
      isCoach: friendlyPlayerId === sideACoachId,
    })),
    ...sideBOnly.map((friendlyPlayerId) => ({
      friendlyPlayerId,
      side: 'B' as const,
      isCaptain: friendlyPlayerId === sideBCaptainId,
      isCoach: friendlyPlayerId === sideBCoachId,
    })),
  ]
}

export function setsFromPlayerSides(
  players: Array<{
    friendlyPlayerId: string
    side: 'A' | 'B'
    isCaptain?: boolean
    isCoach?: boolean
  }>
) {
  const sideAIds = new Set<string>()
  const sideBIds = new Set<string>()
  let sideACaptainId: string | null = null
  let sideBCaptainId: string | null = null
  let sideACoachId: string | null = null
  let sideBCoachId: string | null = null
  for (const p of players) {
    if (p.side === 'A') {
      sideAIds.add(p.friendlyPlayerId)
      if (p.isCaptain) sideACaptainId = p.friendlyPlayerId
      if (p.isCoach) sideACoachId = p.friendlyPlayerId
    } else {
      sideBIds.add(p.friendlyPlayerId)
      if (p.isCaptain) sideBCaptainId = p.friendlyPlayerId
      if (p.isCoach) sideBCoachId = p.friendlyPlayerId
    }
  }
  return { sideAIds, sideBIds, sideACaptainId, sideBCaptainId, sideACoachId, sideBCoachId }
}

export function convokedIdsFromPlayerSides(
  players: Array<{ friendlyPlayerId: string }>
) {
  return new Set(players.map((p) => p.friendlyPlayerId))
}
