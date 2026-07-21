import { describe, it, expect } from 'vitest'
import { validateImageUpload, hasStoredImage } from '@/lib/image-upload'
import { teamCrestUrl, teamHasCrest } from '@/lib/team-crest'
import { matchSideCrestUrl, matchSideHasCrest } from '@/lib/match-side-crest'

describe('image-upload', () => {
  it('accepts small png', () => {
    const result = validateImageUpload(Buffer.from([1, 2, 3]), 'image/png')
    expect(result.ok).toBe(true)
  })

  it('rejects unsupported mime', () => {
    const result = validateImageUpload(Buffer.from([1]), 'image/gif')
    expect(result.ok).toBe(false)
  })
})

describe('team crest helpers', () => {
  it('builds team crest url', () => {
    expect(teamCrestUrl('team-1')).toBe('/api/teams/team-1/crest')
  })

  it('detects stored crest', () => {
    expect(teamHasCrest({ crestMimeType: 'image/png', crestData: Buffer.from([1]) })).toBe(true)
    expect(teamHasCrest({ crestMimeType: null, crestData: null })).toBe(false)
  })
})

describe('match side crest helpers', () => {
  it('builds match side crest url', () => {
    expect(matchSideCrestUrl('match-1', 'A')).toBe('/api/matches/match-1/crest/A')
  })

  it('detects side crest', () => {
    const match = {
      sideACrestMimeType: 'image/png',
      sideACrestData: Buffer.from([1]),
      sideBCrestMimeType: null,
      sideBCrestData: null,
    }
    expect(matchSideHasCrest(match, 'A')).toBe(true)
    expect(matchSideHasCrest(match, 'B')).toBe(false)
  })
})

describe('hasStoredImage', () => {
  it('requires mime and bytes', () => {
    expect(hasStoredImage('image/png', Buffer.from([1]))).toBe(true)
    expect(hasStoredImage('image/png', Buffer.alloc(0))).toBe(false)
  })
})
