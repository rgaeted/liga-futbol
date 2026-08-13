import { describe, expect, it } from 'vitest'
import {
  createArticleSchema,
  createSponsorSchema,
  updateArticleSchema,
} from '@/lib/validations/editorial'

describe('createSponsorSchema', () => {
  it('rejects a sponsor whose end precedes its start', () => {
    expect(
      createSponsorSchema.safeParse({
        name: 'Kelme',
        placement: 'HOME',
        startsAt: '2026-08-20T00:00:00.000Z',
        endsAt: '2026-08-19T00:00:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('accepts an open-ended active sponsor', () => {
    expect(
      createSponsorSchema.safeParse({
        name: 'Kelme',
        placement: 'HOME',
        isActive: true,
      }).success,
    ).toBe(true)
  })
})

describe('createArticleSchema', () => {
  it('requires body text for a new article', () => {
    expect(createArticleSchema.safeParse({ title: 'Fecha 1', body: '' }).success).toBe(false)
  })

  it('accepts a draft article with body', () => {
    expect(
      createArticleSchema.safeParse({
        title: 'Fecha 1',
        body: 'Resumen del partido inaugural.',
        status: 'DRAFT',
      }).success,
    ).toBe(true)
  })
})

describe('updateArticleSchema', () => {
  it('allows partial updates', () => {
    expect(updateArticleSchema.safeParse({ title: 'Nuevo título' }).success).toBe(true)
  })
})
