import { describe, expect, it } from 'vitest'
import {
  LOSLUNES_LOGO_PATH,
  LOSLUNES_PRIMARY,
  resolveOrgBrandColors,
  resolveOrgLandingLogo,
} from '@/lib/org-brand'

describe('resolveOrgLandingLogo', () => {
  it('prefers the stored logo when present', () => {
    expect(resolveOrgLandingLogo('loslunes', 'https://cdn.example/logo.png')).toBe(
      'https://cdn.example/logo.png',
    )
  })

  it('falls back to the FDL crest for Los Lunes', () => {
    expect(resolveOrgLandingLogo('loslunes', null)).toBe(LOSLUNES_LOGO_PATH)
  })

  it('returns null for other orgs without a stored logo', () => {
    expect(resolveOrgLandingLogo('kelme', null)).toBeNull()
  })
})

describe('resolveOrgBrandColors', () => {
  it('locks Los Lunes to the crest orange and black', () => {
    expect(resolveOrgBrandColors('loslunes', '#CD212A', '#FFFFFF')).toEqual({
      primaryColor: LOSLUNES_PRIMARY,
      secondaryColor: '#111111',
    })
  })

  it('keeps other orgs as stored', () => {
    expect(resolveOrgBrandColors('kelme', '#CD212A', '#111111')).toEqual({
      primaryColor: '#CD212A',
      secondaryColor: '#111111',
    })
  })
})
