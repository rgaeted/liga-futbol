import { describe, expect, it } from 'vitest'
import {
  KELME_CUP_PRIMARY,
  KELME_CUP_SECONDARY,
  KELME_CUP_SHIELD_PATH,
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

  it('falls back to the Kelme Cup shield', () => {
    expect(resolveOrgLandingLogo('kelme', null)).toBe(KELME_CUP_SHIELD_PATH)
  })

  it('returns null for other orgs without a stored logo', () => {
    expect(resolveOrgLandingLogo('liga-demo', null)).toBeNull()
  })
})

describe('resolveOrgBrandColors', () => {
  it('locks Los Lunes to the crest orange and black', () => {
    expect(resolveOrgBrandColors('loslunes', '#CD212A', '#FFFFFF')).toEqual({
      primaryColor: LOSLUNES_PRIMARY,
      secondaryColor: '#111111',
    })
  })

  it('locks Kelme to the Cup flyer blue', () => {
    expect(resolveOrgBrandColors('kelme', '#CD212A', '#111111')).toEqual({
      primaryColor: KELME_CUP_PRIMARY,
      secondaryColor: KELME_CUP_SECONDARY,
    })
  })
})
