import { describe, expect, it, vi } from 'vitest'
import { LOSLUNES_HERO_PATH } from '@/lib/org-brand'

vi.mock('@/lib/editorial/urls', () => ({
  editorialPublicUrl: (path: string | null | undefined) =>
    path ? `https://cdn.test/${path}` : null,
}))

import {
  defaultOrgLandingHeroImageUrls,
  resolveOrgLandingHeroImageUrls,
} from '@/lib/org-landing-hero'

describe('resolveOrgLandingHeroImageUrls', () => {
  it('uses uploaded images when present', () => {
    expect(
      resolveOrgLandingHeroImageUrls('loslunes', [
        'orgs/org-1/hero/a.jpg',
        'orgs/org-1/hero/b.jpg',
      ]),
    ).toEqual([
      expect.stringContaining('orgs/org-1/hero/a.jpg'),
      expect.stringContaining('orgs/org-1/hero/b.jpg'),
    ])
  })

  it('falls back to loslunes default hero when empty', () => {
    expect(resolveOrgLandingHeroImageUrls('loslunes', [])).toEqual([LOSLUNES_HERO_PATH])
  })

  it('returns empty fallback for other orgs', () => {
    expect(defaultOrgLandingHeroImageUrls('kelme')).toEqual([])
    expect(resolveOrgLandingHeroImageUrls('kelme', [])).toEqual([])
  })
})
