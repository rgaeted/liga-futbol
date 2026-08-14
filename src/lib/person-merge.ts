import { PersonConflictError } from '@/lib/person'

export type PersonMergeSnapshot = {
  id: string
  userId: string | null
  playerOrgIds: string[]
  friendlyOrgIds: string[]
}

export function planOrgMerge(input: {
  organizationId: string
  source: PersonMergeSnapshot
  dest: PersonMergeSnapshot
}) {
  const orgId = input.organizationId
  if (
    !input.source.playerOrgIds.includes(orgId) &&
    !input.source.friendlyOrgIds.includes(orgId)
  ) {
    throw new PersonConflictError('El origen no tiene ficha en esta organización')
  }
  if (
    !input.dest.playerOrgIds.includes(orgId) &&
    !input.dest.friendlyOrgIds.includes(orgId)
  ) {
    throw new PersonConflictError('El destino no tiene ficha en esta organización')
  }
  if (input.source.playerOrgIds.includes(orgId) && input.dest.playerOrgIds.includes(orgId)) {
    throw new PersonConflictError('Ambas personas ya son jugadores de liga aquí')
  }
  if (input.source.friendlyOrgIds.includes(orgId) && input.dest.friendlyOrgIds.includes(orgId)) {
    throw new PersonConflictError('Ambas personas ya están en el pool amistoso aquí')
  }

  const remainingPlayer = input.source.playerOrgIds.filter((id) => id !== orgId)
  const remainingFriendly = input.source.friendlyOrgIds.filter((id) => id !== orgId)
  return {
    movePlayerOrgIds: input.source.playerOrgIds.filter((id) => id === orgId),
    moveFriendlyOrgIds: input.source.friendlyOrgIds.filter((id) => id === orgId),
    deleteSourcePerson:
      remainingPlayer.length === 0 && remainingFriendly.length === 0 && !input.source.userId,
  }
}

export function planPlatformMerge(input: {
  source: PersonMergeSnapshot
  dest: PersonMergeSnapshot
}) {
  if (input.source.userId && input.dest.userId && input.source.userId !== input.dest.userId) {
    throw new PersonConflictError(
      'No se pueden unir dos cuentas distintas; pide a plataforma que revise',
    )
  }
  const conflictOrgs = [
    ...input.source.playerOrgIds.filter((id) => input.dest.playerOrgIds.includes(id)),
    ...input.source.friendlyOrgIds.filter((id) => input.dest.friendlyOrgIds.includes(id)),
  ]
  if (conflictOrgs.length > 0) {
    throw new PersonConflictError(`Conflicto de fichas en organizaciones: ${conflictOrgs.join(', ')}`)
  }
  return {
    movePlayerOrgIds: input.source.playerOrgIds,
    moveFriendlyOrgIds: input.source.friendlyOrgIds,
    moveUserId: input.source.userId && !input.dest.userId ? input.source.userId : null,
    deleteSourcePerson: true,
  }
}
