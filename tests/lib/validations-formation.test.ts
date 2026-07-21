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
      slots: [{ slotKey: 'GK', friendlyPlayerId: 'fp1' }],
      benchFriendlyPlayerIds: ['fp2'],
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
})
