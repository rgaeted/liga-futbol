import { describe, expect, it } from 'vitest'
import {
  decodeMatchCursor,
  encodeMatchCursor,
  mobileMatchesQuerySchema,
} from '@/lib/validations/mobile-query'

describe('mobileMatchesQuerySchema', () => {
  it('defaults limit to 20 and caps at 50', () => {
    expect(mobileMatchesQuerySchema.parse({}).limit).toBe(20)
    expect(mobileMatchesQuerySchema.safeParse({ limit: 100 }).success).toBe(false)
  })
})

describe('match cursor', () => {
  it('encodes and decodes scheduledAt + id', () => {
    const date = new Date('2026-08-20T23:30:00.000Z')
    const cursor = encodeMatchCursor(date, 'match-1')
    expect(decodeMatchCursor(cursor)).toEqual({ scheduledAt: date, id: 'match-1' })
  })
})
