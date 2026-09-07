import { MatchStatus, MatchType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  attendanceClosedMessage,
  canOpenMatchAttendance,
  findNextFriendlyAttendanceWhere,
  isViewerGoing,
  serializeMatchAttendance,
} from '@/lib/match-attendance'

describe('canOpenMatchAttendance', () => {
  it('opens only scheduled friendlies', () => {
    expect(
      canOpenMatchAttendance({ matchType: MatchType.FRIENDLY, status: MatchStatus.SCHEDULED })
    ).toBe(true)
    expect(
      canOpenMatchAttendance({ matchType: MatchType.LEAGUE, status: MatchStatus.SCHEDULED })
    ).toBe(false)
    expect(
      canOpenMatchAttendance({ matchType: MatchType.FRIENDLY, status: MatchStatus.LIVE })
    ).toBe(false)
    expect(
      canOpenMatchAttendance({ matchType: MatchType.FRIENDLY, status: MatchStatus.FINISHED })
    ).toBe(false)
  })
})

describe('serializeMatchAttendance', () => {
  it('keeps createdAt order and maps display name', () => {
    const rows = [
      {
        playerId: 'p2',
        createdAt: new Date('2026-09-05T22:01:00.000Z'),
        player: {
          id: 'p2',
          person: {
            firstName: 'Ana',
            lastName: 'Soto',
            photoMimeType: null,
            photoData: null,
          },
        },
      },
      {
        playerId: 'p1',
        createdAt: new Date('2026-09-05T22:00:00.000Z'),
        player: {
          id: 'p1',
          person: {
            firstName: 'Juan',
            lastName: 'Pérez',
            photoMimeType: 'image/jpeg',
            photoData: new Uint8Array([1, 2, 3]),
          },
        },
      },
    ]
    const serialized = serializeMatchAttendance(rows)
    expect(serialized.map((row) => row.playerId)).toEqual(['p2', 'p1'])
    expect(serialized[1]).toMatchObject({
      playerId: 'p1',
      name: 'Juan Pérez',
      photoUrl: '/api/players/p1/photo',
      createdAt: '2026-09-05T22:00:00.000Z',
    })
    expect(serialized[0].photoUrl).toBeNull()
  })
})

describe('attendanceClosedMessage', () => {
  it('uses Chilean copy', () => {
    expect(attendanceClosedMessage()).toBe(
      'El listado se cierra cuando empieza el partido.'
    )
  })
})

describe('findNextFriendlyAttendanceWhere', () => {
  it('filters scheduled friendlies from now', () => {
    const now = new Date('2026-09-08T12:00:00.000Z')
    expect(findNextFriendlyAttendanceWhere('org_1', now)).toEqual({
      organizationId: 'org_1',
      matchType: MatchType.FRIENDLY,
      status: MatchStatus.SCHEDULED,
      scheduledAt: { gte: now },
    })
  })
})

describe('isViewerGoing', () => {
  it('is true only when myPlayerId is in the list', () => {
    expect(isViewerGoing('p1', [{ playerId: 'p1' }, { playerId: 'p2' }])).toBe(true)
    expect(isViewerGoing('p3', [{ playerId: 'p1' }])).toBe(false)
    expect(isViewerGoing(null, [{ playerId: 'p1' }])).toBe(false)
  })
})
