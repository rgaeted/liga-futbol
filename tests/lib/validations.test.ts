import { describe, it, expect } from 'vitest'
import { createMatchSchema, updateMatchSchema } from '@/lib/validations/match'
import { updatePlayerSchema } from '@/lib/validations/player'
import { createSeasonSchema, updateSeasonSchema } from '@/lib/validations/season'
import { createUserSchema, updateUserSchema } from '@/lib/validations/user'

describe('match validations', () => {
  it('accepts demo-style (non-cuid) ids', () => {
    const result = createMatchSchema.safeParse({
      seasonId: 'demo-season-2026',
      homeTeamId: 'demo-team-norte',
      awayTeamId: 'demo-team-sur',
      scheduledAt: new Date().toISOString(),
    })
    expect(result.success).toBe(true)
  })
  it('updateMatchSchema accepts partial update with status', () => {
    const result = updateMatchSchema.safeParse({ status: 'CANCELLED' })
    expect(result.success).toBe(true)
  })
  it('updateMatchSchema rejects invalid status', () => {
    const result = updateMatchSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })
  it('updateMatchSchema allows unassigning referee with null', () => {
    const result = updateMatchSchema.safeParse({ refereeId: null })
    expect(result.success).toBe(true)
  })
  it('updateMatchSchema accepts footballFormat change', () => {
    const result = updateMatchSchema.safeParse({ footballFormat: 'FUTBOL_7' })
    expect(result.success).toBe(true)
  })
})

describe('player validations', () => {
  it('updatePlayerSchema allows moving player out of a team', () => {
    const result = updatePlayerSchema.safeParse({ teamId: null })
    expect(result.success).toBe(true)
  })
  it('updatePlayerSchema rejects jersey number over 99', () => {
    const result = updatePlayerSchema.safeParse({ jerseyNumber: 100 })
    expect(result.success).toBe(false)
  })
})

describe('season validations', () => {
  it('createSeasonSchema accepts valid season', () => {
    const result = createSeasonSchema.safeParse({
      name: 'Torneos Kelme 2027',
      startDate: '2027-03-01T00:00:00.000Z',
      endDate: '2027-11-30T00:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })
  it('updateSeasonSchema accepts isActive toggle only', () => {
    const result = updateSeasonSchema.safeParse({ isActive: false })
    expect(result.success).toBe(true)
  })
})

describe('user validations', () => {
  it('createUserSchema accepts staff roles', () => {
    const result = createUserSchema.safeParse({
      email: 'nuevo-dt@liga.com',
      name: 'Nuevo DT',
      password: 'password123',
      role: 'COACH',
    })
    expect(result.success).toBe(true)
  })
  it('createUserSchema rejects PLAYER role', () => {
    const result = createUserSchema.safeParse({
      email: 'x@liga.com', name: 'X', password: 'password123', role: 'PLAYER',
    })
    expect(result.success).toBe(false)
  })
  it('updateUserSchema allows changing name without password', () => {
    const result = updateUserSchema.safeParse({ name: 'Nombre Nuevo' })
    expect(result.success).toBe(true)
  })
  it('updateUserSchema rejects short password when provided', () => {
    const result = updateUserSchema.safeParse({ password: '123' })
    expect(result.success).toBe(false)
  })
})
