import { MatchStatus, MatchType } from '@prisma/client'
import { friendlyPlayerPhotoUrl, personHasPhoto } from '@/lib/friendly-player-photo'
import { matchDisplayName } from '@/lib/match-label'
import { playerDisplayName } from '@/lib/person-name'
import { formatScheduleDateLabel, formatScheduleTimeLabel } from '@/lib/schedule-datetime'

export type MatchAttendancePerson = {
  firstName: string
  lastName: string
  photoMimeType: string | null
  photoData: Uint8Array | Buffer | null
  user: { name: string } | null
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
          user: { select: { name: true } },
        },
      },
    },
  },
} as const

export const MATCH_ATTENDANCE_BOARD_SELECT = {
  id: true,
  matchType: true,
  status: true,
  scheduledAt: true,
  sideAName: true,
  sideBName: true,
  homeTeam: { select: { name: true } },
  awayTeam: { select: { name: true } },
  attendances: {
    orderBy: { createdAt: 'asc' as const },
    include: MATCH_ATTENDANCE_INCLUDE,
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

export function findScheduledFriendlyAttendanceWhere(organizationId: string, now: Date) {
  return {
    organizationId,
    matchType: MatchType.FRIENDLY,
    status: MatchStatus.SCHEDULED,
    scheduledAt: { gte: now },
  }
}

/** @deprecated Use findScheduledFriendlyAttendanceWhere — attendance is per match. */
export function findNextFriendlyAttendanceWhere(organizationId: string, now: Date) {
  return findScheduledFriendlyAttendanceWhere(organizationId, now)
}

export type MatchAttendanceBoardData = {
  matchId: string
  open: boolean
  attendees: MatchAttendanceEntry[]
  matchLabel: string
  dateLine: string
}

export function attendanceSectionId(matchId: string, index: number): string {
  return index === 0 ? 'asistencia' : `asistencia-${matchId}`
}

export function toMatchAttendanceBoard(match: {
  id: string
  matchType: string
  status: string
  scheduledAt: Date
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string } | null
  awayTeam: { name: string } | null
  attendances: MatchAttendanceRow[]
}): MatchAttendanceBoardData {
  return {
    matchId: match.id,
    open: canOpenMatchAttendance(match),
    attendees: serializeMatchAttendance(match.attendances),
    matchLabel: matchDisplayName({
      matchType: match.matchType === MatchType.FRIENDLY ? MatchType.FRIENDLY : MatchType.LEAGUE,
      sideAName: match.sideAName,
      sideBName: match.sideBName,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    }),
    dateLine: `${formatScheduleDateLabel(match.scheduledAt)} · ${formatScheduleTimeLabel(match.scheduledAt)}`,
  }
}

export function isViewerGoing(
  myPlayerId: string | null,
  attendees: Array<{ playerId: string }>
): boolean {
  return Boolean(myPlayerId && attendees.some((row) => row.playerId === myPlayerId))
}

export function attendanceViewerFromPlayer(input: {
  signedIn: boolean
  playerId: string | null
  loginHref: string
}) {
  return {
    signedIn: input.signedIn,
    canSign: Boolean(input.signedIn && input.playerId),
    myPlayerId: input.playerId,
    loginHref: input.loginHref,
  }
}

export function attendanceCountLabel(count: number): string {
  return count === 1 ? '1 anotado' : `${count} anotados`
}
