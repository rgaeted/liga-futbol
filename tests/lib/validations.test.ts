import { describe, it, expect } from 'vitest'
import { createMatchSchema, updateMatchSchema } from '@/lib/validations/match'
import { updatePlayerSchema } from '@/lib/validations/player'
import { createSeasonSchema, updateSeasonSchema } from '@/lib/validations/season'
import { createUserSchema, updateUserSchema } from '@/lib/validations/user'

describe('match validations', () => {
  it('accepts demo-style (non-cuid) ids', () => {
    const result = createMatchSchema.safeParse({
      seasonId: 'demo-season-2026',
      seasonCategoryId: 'demo-sc-35',
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
  it('createMatchSchema rejects region without commune', () => {
    const result = createMatchSchema.safeParse({
      seasonId: 'demo-season-2026',
      homeTeamId: 'demo-team-norte',
      awayTeamId: 'demo-team-sur',
      scheduledAt: new Date().toISOString(),
      regionCode: '13',
    })
    expect(result.success).toBe(false)
  })
  it('updateMatchSchema accepts clearing location with nulls', () => {
    const result = updateMatchSchema.safeParse({
      regionCode: null,
      communeCode: null,
    })
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
      categoryIds: ['cat-35'],
    })
    expect(result.success).toBe(true)
  })
  it('updateSeasonSchema accepts isActive toggle only', () => {
    const result = updateSeasonSchema.safeParse({ isActive: false })
    expect(result.success).toBe(true)
  })
})

describe('user validations', () => {
  it('createUserSchema accepts ORG_ADMIN role', () => {
    const result = createUserSchema.safeParse({
      email: 'admin@liga.com',
      name: 'Admin Org',
      password: 'password123',
      roles: ['ORG_ADMIN'],
    })
    expect(result.success).toBe(true)
  })
  it('createUserSchema accepts staff roles', () => {
    const result = createUserSchema.safeParse({
      email: 'nuevo-dt@liga.com',
      name: 'Nuevo DT',
      password: 'password123',
      roles: ['COACH'],
    })
    expect(result.success).toBe(true)
  })
  it('createUserSchema accepts PLAYER role', () => {
    const result = createUserSchema.safeParse({
      email: 'x@liga.com',
      name: 'Jugador X',
      password: 'password123',
      roles: ['PLAYER'],
    })
    expect(result.success).toBe(true)
  })
  it('updateUserSchema allows changing name without password', () => {
    const result = updateUserSchema.safeParse({ name: 'Nombre Nuevo' })
    expect(result.success).toBe(true)
  })
  it('updateUserSchema allows changing access roles to ORG_ADMIN', () => {
    const result = updateUserSchema.safeParse({ roles: ['ORG_ADMIN'] })
    expect(result.success).toBe(true)
  })
  it('updateUserSchema allows changing access roles to PLAYER', () => {
    const result = updateUserSchema.safeParse({ roles: ['PLAYER'] })
    expect(result.success).toBe(true)
  })
  it('updateUserSchema rejects FRIENDLY_COACH in manual assignment', () => {
    const result = updateUserSchema.safeParse({ roles: ['FRIENDLY_COACH'] as never })
    expect(result.success).toBe(false)
  })
  it('updateUserSchema rejects short password when provided', () => {
    const result = updateUserSchema.safeParse({ password: '123' })
    expect(result.success).toBe(false)
  })
})
