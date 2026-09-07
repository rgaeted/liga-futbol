import { describe, expect, it } from 'vitest'
import { upsertMatchAttendanceSchema } from '@/lib/validations/match-attendance'

describe('upsertMatchAttendanceSchema', () => {
  it('accepts an empty body', () => {
    expect(upsertMatchAttendanceSchema.safeParse({}).success).toBe(true)
    expect(upsertMatchAttendanceSchema.safeParse(undefined).success).toBe(true)
  })

  it('rejects unknown fields', () => {
    expect(upsertMatchAttendanceSchema.safeParse({ playerId: 'p1' }).success).toBe(false)
  })
})
