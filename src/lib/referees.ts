import { editorialPublicUrl } from '@/lib/editorial/urls'
import { MembershipRole } from '@/lib/membership-role'
import { normalizeChilePhone, whatsappMeUrl } from '@/lib/phone-cl'
import type { Match, MatchStatus, RefereeProfile, User } from '@prisma/client'

export class RefereeShareError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'RefereeShareError'
  }
}

export function assertCanShareReferee(input: {
  fromOrganizationId: string
  toOrganizationId: string
  isRefereeInFrom: boolean
}) {
  if (input.fromOrganizationId === input.toOrganizationId) {
    throw new RefereeShareError('No puedes invitar a la misma organización', 400)
  }
  if (!input.isRefereeInFrom) {
    throw new RefereeShareError('El árbitro no pita en la organización de origen', 403)
  }
}

export function assertCanAcceptRefereeShare(input: {
  destRole: MembershipRole | null
  pending: boolean
}) {
  if (!input.pending) {
    throw new RefereeShareError('La invitación ya no está pendiente', 409)
  }
  if (input.destRole && input.destRole !== MembershipRole.REFEREE) {
    throw new RefereeShareError('Este correo ya tiene otro rol en tu organización', 409)
  }
  if (input.destRole === MembershipRole.REFEREE) {
    throw new RefereeShareError('Este árbitro ya pita en tu organización', 409)
  }
}

export function normalizePhoneField(value: string | null | undefined): string | null {
  if (!value) return null
  return normalizeChilePhone(value)
}

export type RefereeListRow = {
  user: Pick<User, 'id' | 'name' | 'email'> & {
    refereeProfile: RefereeProfile | null
    refereeMatches: Pick<Match, 'id' | 'scheduledAt' | 'venue'>[]
  }
}

export function serializeRefereeListItem(row: RefereeListRow) {
  const profile = row.user.refereeProfile
  const contact = profile?.whatsapp ?? profile?.phone
  const nextMatch = row.user.refereeMatches[0] ?? null

  return {
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    phone: profile?.phone ?? null,
    whatsapp: profile?.whatsapp ?? null,
    whatsappUrl: contact ? whatsappMeUrl(contact) : null,
    notes: profile?.notes ?? null,
    photoUrl: editorialPublicUrl(profile?.photoStoragePath),
    nextMatch: nextMatch
      ? {
          id: nextMatch.id,
          scheduledAt: nextMatch.scheduledAt.toISOString(),
          venue: nextMatch.venue,
        }
      : null,
  }
}

export function refereeListUserInclude(organizationId: string) {
  const upcomingStatuses: MatchStatus[] = ['SCHEDULED', 'LIVE', 'HALFTIME']
  return {
    refereeProfile: true,
    refereeMatches: {
      where: {
        organizationId,
        scheduledAt: { gte: new Date() },
        status: { in: upcomingStatuses },
      },
      orderBy: { scheduledAt: 'asc' as const },
      take: 1,
      select: { id: true, scheduledAt: true, venue: true },
    },
  }
}
