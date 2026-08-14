import type { Prisma } from '@prisma/client'

export class PersonConflictError extends Error {
  readonly status = 409
  constructor(message: string) {
    super(message)
    this.name = 'PersonConflictError'
  }
}

export function assertPersonFichaAvailable(input: {
  existingPlayerOrgIds: string[]
  existingFriendlyOrgIds: string[]
  organizationId: string
  kind: 'league' | 'friendly'
}) {
  if (input.kind === 'league' && input.existingPlayerOrgIds.includes(input.organizationId)) {
    throw new PersonConflictError('Esta persona ya es jugador de liga en esta organización')
  }
  if (input.kind === 'friendly' && input.existingFriendlyOrgIds.includes(input.organizationId)) {
    throw new PersonConflictError('Esta persona ya está en el pool amistoso de esta organización')
  }
}

export async function loadPersonFichaOrgIds(
  tx: Pick<Prisma.TransactionClient, 'player' | 'friendlyPlayer'>,
  personId: string,
) {
  const [players, friendlies] = await Promise.all([
    tx.player.findMany({ where: { personId }, select: { organizationId: true } }),
    tx.friendlyPlayer.findMany({ where: { personId }, select: { organizationId: true } }),
  ])
  return {
    existingPlayerOrgIds: players.map((p) => p.organizationId),
    existingFriendlyOrgIds: friendlies.map((p) => p.organizationId),
  }
}

export function canClaimPerson(
  personUserId: string | null,
  claimantExistingPersonId: string | null,
  personId: string,
): { ok: true } | { ok: false; status: 409; error: string } {
  if (personUserId) {
    return { ok: false, status: 409, error: 'Este perfil ya fue reclamado' }
  }
  if (claimantExistingPersonId && claimantExistingPersonId !== personId) {
    return {
      ok: false,
      status: 409,
      error: 'Esa cuenta ya está ligada a otra persona; pide a un admin que fusione',
    }
  }
  return { ok: true }
}
