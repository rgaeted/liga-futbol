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
  organizationId: string
}) {
  if (input.existingPlayerOrgIds.includes(input.organizationId)) {
    throw new PersonConflictError('Esta persona ya es jugador en esta organización')
  }
}

export async function loadPersonFichaOrgIds(
  tx: Pick<Prisma.TransactionClient, 'player'>,
  personId: string,
) {
  const players = await tx.player.findMany({
    where: { personId },
    select: { organizationId: true },
  })
  return {
    existingPlayerOrgIds: players.map((p) => p.organizationId),
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
