import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateFriendlyCoaches,
  coachesFromRoster,
  coachPlayerIdsForUser,
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

  it('falls back to name-matched unlinked coach players for FRIENDLY_COACH users', async () => {
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
