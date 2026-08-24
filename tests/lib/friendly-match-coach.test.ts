import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateFriendlyCoaches,
  coachesFromRoster,
  coachPlayerIdsForUser,
  friendlyCoachMatchesForOrgWhere,
} from '@/lib/friendly-match-coach'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    player: { findMany: vi.fn() },
    organizationMembership: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    person: { update: vi.fn() },
  },
}))

describe('validateFriendlyCoaches', () => {
  it('requires exactly one coach per side', () => {
    expect(
      validateFriendlyCoaches([
        { playerId: 'a', side: 'A', isCoach: true },
        { playerId: 'b', side: 'B' },
      ])
    ).toBe('Debes elegir un DT para el equipo visitante (lado B)')
  })

  it('accepts one coach per side', () => {
    expect(
      validateFriendlyCoaches([
        { playerId: 'a', side: 'A', isCoach: true },
        { playerId: 'b', side: 'B', isCoach: true },
      ])
    ).toBeNull()
  })
})

describe('coachesFromRoster', () => {
  it('extracts coach ids by side', () => {
    expect(
      coachesFromRoster([
        { playerId: 'a', side: 'A', isCoach: true },
        { playerId: 'b', side: 'B', isCoach: true },
      ])
    ).toEqual({ sideACoachId: 'a', sideBCoachId: 'b' })
  })
})

describe('coachPlayerIdsForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns linked player ids when person is tied to the user', async () => {
    vi.mocked(db.player.findMany).mockResolvedValue([{ id: 'player-1' }] as never)

    await expect(coachPlayerIdsForUser('user-1', 'org-1')).resolves.toEqual(['player-1'])
    expect(db.organizationMembership.findUnique).not.toHaveBeenCalled()
  })

  it('returns linked player ids across orgs (cross-org desafío)', async () => {
    vi.mocked(db.player.findMany).mockResolvedValue([
      { id: 'player-loslunes' },
    ] as never)

    await expect(coachPlayerIdsForUser('user-1', 'org-kelme')).resolves.toEqual(['player-loslunes'])
    expect(db.player.findMany).toHaveBeenCalledWith({
      where: { person: { userId: 'user-1' } },
      select: { id: true },
    })
    expect(db.organizationMembership.findUnique).not.toHaveBeenCalled()
  })

  it('falls back to name-matched unlinked coach players in any org', async () => {
    vi.mocked(db.player.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'player-roger', personId: 'person-roger' }] as never)
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      role: 'FRIENDLY_COACH',
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      name: 'Roger Carpio',
      person: null,
    } as never)

    await expect(coachPlayerIdsForUser('user-1', 'org-kelme')).resolves.toEqual(['player-roger'])
    expect(db.player.findMany).toHaveBeenLastCalledWith({
      where: {
        person: {
          userId: null,
          firstName: { equals: 'Roger', mode: 'insensitive' },
          lastName: { equals: 'Carpio', mode: 'insensitive' },
        },
        friendlyParticipations: { some: { isCoach: true } },
      },
      select: { id: true, personId: true },
    })
  })

  it('auto-links a single unlinked coach person when safe', async () => {
    vi.mocked(db.player.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'player-roger', personId: 'person-roger' }] as never)
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      role: 'FRIENDLY_COACH',
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      name: 'Roger Carpio',
      person: null,
    } as never)
    vi.mocked(db.person.update).mockResolvedValue({} as never)

    await coachPlayerIdsForUser('user-1', 'org-kelme', { autoLink: true })

    expect(db.person.update).toHaveBeenCalledWith({
      where: { id: 'person-roger' },
      data: { userId: 'user-1' },
    })
  })
})

describe('friendlyCoachMatchesForOrgWhere', () => {
  it('includes host and guest org matches', () => {
    expect(friendlyCoachMatchesForOrgWhere('org-kelme')).toEqual({
      matchType: 'FRIENDLY',
      OR: [{ organizationId: 'org-kelme' }, { guestOrganizationId: 'org-kelme' }],
    })
  })
})
