import { MatchStatus, MatchType } from '@prisma/client'
import { friendlyPlayerPhotoUrl, personHasPhoto } from '@/lib/friendly-player-photo'
import { playerDisplayName } from '@/lib/person-name'

export type MatchAttendancePerson = {
  firstName: string
  lastName: string
  photoMimeType: string | null
  photoData: Uint8Array | Buffer | null
}

export type MatchAttendancePlayer = {
  id: string
  person: MatchAttendancePerson
}

export type MatchAttendanceRow = {
  playerId: string
  createdAt: Date
  player: MatchAttendancePlayer
}

export type MatchAttendanceEntry = {
  playerId: string
  name: string
  photoUrl: string | null
  createdAt: string
}

export const MATCH_ATTENDANCE_INCLUDE = {
  player: {
    include: {
      person: {
        select: {
          firstName: true,
          lastName: true,
          photoMimeType: true,
          photoData: true,
        },
      },
    },
  },
} as const

export function canOpenMatchAttendance(match: {
  matchType: string
  status: string
}): boolean {
  return match.matchType === MatchType.FRIENDLY && match.status === MatchStatus.SCHEDULED
}

export function attendanceClosedMessage(): string {
  return 'El listado se cierra cuando empieza el partido.'
}

export function serializeMatchAttendance(rows: MatchAttendanceRow[]): MatchAttendanceEntry[] {
  return rows.map((row) => ({
    playerId: row.playerId,
    name: playerDisplayName(row.player),
    photoUrl: personHasPhoto(row.player.person)
      ? friendlyPlayerPhotoUrl(row.player.id)
      : null,
    createdAt: row.createdAt.toISOString(),
  }))
}

export function findNextFriendlyAttendanceWhere(organizationId: string, now: Date) {
  return {
    organizationId,
    matchType: MatchType.FRIENDLY,
    status: MatchStatus.SCHEDULED,
    scheduledAt: { gte: now },
  }
}

export function isViewerGoing(
  myPlayerId: string | null,
  attendees: Array<{ playerId: string }>
): boolean {
  return Boolean(myPlayerId && attendees.some((row) => row.playerId === myPlayerId))
}
