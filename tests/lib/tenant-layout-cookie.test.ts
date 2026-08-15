import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const layouts = [
  'src/app/(tenant)/[organizationSlug]/(dashboard)/admin/layout.tsx',
  'src/app/(tenant)/[organizationSlug]/(dashboard)/player/layout.tsx',
  'src/app/(tenant)/[organizationSlug]/(dashboard)/coach/layout.tsx',
  'src/app/(tenant)/[organizationSlug]/(dashboard)/referee/layout.tsx',
]

describe('tenant dashboard layouts', () => {
  it('do not set the org cookie during render', () => {
    for (const relativePath of layouts) {
      const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8')
      expect(source, relativePath).not.toMatch(/syncActiveOrganizationCookie\(/)
    }
  })
})
