import { describe, it, expect } from 'vitest'
import { parseMatchMvpSideParam, matchMvpPhotoUrl } from '@/lib/match-mvp-photo'

describe('parseMatchMvpSideParam', () => {
  it('parses home and away', () => {
    expect(parseMatchMvpSideParam('home')).toBe('HOME')
    expect(parseMatchMvpSideParam('AWAY')).toBe('AWAY')
    expect(parseMatchMvpSideParam('invalid')).toBeNull()
  })
})

describe('matchMvpPhotoUrl', () => {
  it('builds public photo url', () => {
    expect(matchMvpPhotoUrl('match-1', 'HOME')).toBe('/api/matches/match-1/mvp/home/photo')
  })
})
