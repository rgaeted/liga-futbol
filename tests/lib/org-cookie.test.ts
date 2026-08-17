import { describe, expect, it } from 'vitest'
import { ORG_COOKIE, clearOrgCookieOptions, orgCookieOptions } from '@/lib/org-cookie'

describe('ORG_COOKIE', () => {
  it('uses the LigaLab cookie name', () => {
    expect(ORG_COOKIE).toBe('ligalab.org')
    expect(orgCookieOptions('org-1').name).toBe('ligalab.org')
    expect(clearOrgCookieOptions().name).toBe('ligalab.org')
  })
})
