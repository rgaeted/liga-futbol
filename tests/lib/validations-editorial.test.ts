import { describe, expect, it } from 'vitest'
import {
  createArticleSchema,
  createSponsorSchema,
  sponsorAssignmentSchema,
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

describe('auspiciadores en el landing', () => {
  it('acepta los campos de landing del auspiciador', () => {
    const r = createSponsorSchema.safeParse({
      name: 'Ferretería X',
      tier: 'MAIN',
      tagline: '10 % para jugadores',
      ctaLabel: 'Escríbenos',
      ctaUrl: 'https://wa.me/56911112222',
      showOnLanding: true,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza enlaces que no sean http(s)', () => {
    expect(createSponsorSchema.safeParse({ name: 'X', ctaUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(createSponsorSchema.safeParse({ name: 'X', websiteUrl: 'ftp://x.cl' }).success).toBe(false)
  })

  it('limita frase y texto del botón', () => {
    expect(createSponsorSchema.safeParse({ name: 'X', tagline: 'a'.repeat(141) }).success).toBe(false)
    expect(createSponsorSchema.safeParse({ name: 'X', ctaLabel: 'a'.repeat(41) }).success).toBe(false)
  })

  it('valida targets de asignación', () => {
    for (const target of ['court:1', 'court:12', 'phase:FINAL', 'phase:THIRD_PLACE', 'phase:FIFTH_PLACE']) {
      expect(sponsorAssignmentSchema.safeParse({ target, sponsorId: 's1' }).success).toBe(true)
    }
    for (const target of ['court:0', 'court:100', 'phase:GROUP', 'cancha:1']) {
      expect(sponsorAssignmentSchema.safeParse({ target, sponsorId: 's1' }).success).toBe(false)
    }
    expect(sponsorAssignmentSchema.safeParse({ target: 'court:2', sponsorId: null }).success).toBe(true)
  })
})
