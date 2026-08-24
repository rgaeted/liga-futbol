import { describe, it, expect } from 'vitest'
import { upsertMatchFormationSchema } from '@/lib/validations/formation'

describe('upsertMatchFormationSchema', () => {
  it('accepts league payload', () => {
    const result = upsertMatchFormationSchema.safeParse({
      teamId: 'team-1',
      scheme: '4-3-3',
      slots: [{ slotKey: 'GK', playerId: 'p1' }],
      benchPlayerIds: ['p2'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts friendly payload', () => {
    const result = upsertMatchFormationSchema.safeParse({
      side: 'A',
      scheme: '4-4-2',
      slots: [{ slotKey: 'GK', playerId: 'fp1' }],
      benchplayerIds: ['fp2'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects payload with neither teamId nor side', () => {
    const result = upsertMatchFormationSchema.safeParse({
      scheme: '4-3-3',
      slots: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional slotLayout with valid coordinates', () => {
    const result = upsertMatchFormationSchema.safeParse({
      teamId: 'team-1',
      scheme: '4-4-2',
      slots: [],
      slotLayout: { CM_L: { topPct: 50, leftPct: 50 } },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.slotLayout).toEqual({ CM_L: { topPct: 50, leftPct: 50 } })
    }
  })

  it('rejects slotLayout with out-of-range coordinates', () => {
    const result = upsertMatchFormationSchema.safeParse({
      teamId: 'team-1',
      scheme: '4-4-2',
      slots: [],
      slotLayout: { CM_L: { topPct: 4, leftPct: 50 } },
    })
    expect(result.success).toBe(false)
  })
})
