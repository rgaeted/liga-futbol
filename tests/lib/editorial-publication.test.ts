import { EditorialStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { applyPublishTransition } from '@/lib/editorial/publication'

describe('applyPublishTransition', () => {
  const now = new Date('2026-08-12T12:00:00.000Z')

  it('sets publishedAt when publishing a draft', () => {
    expect(applyPublishTransition(EditorialStatus.PUBLISHED, null, now)).toEqual(now)
  })

  it('preserves publishedAt on subsequent published edits', () => {
    const publishedAt = new Date('2026-08-10T12:00:00.000Z')
    expect(applyPublishTransition(EditorialStatus.PUBLISHED, publishedAt, now)).toEqual(
      publishedAt,
    )
  })

  it('clears publishedAt when reverting to draft', () => {
    expect(
      applyPublishTransition(
        EditorialStatus.DRAFT,
        new Date('2026-08-10T12:00:00.000Z'),
        now,
      ),
    ).toBeNull()
  })
})
