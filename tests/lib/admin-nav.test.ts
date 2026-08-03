import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('admin navigation', () => {
  it('can cross the server-to-client boundary without functions', () => {
    const layoutSource = readFileSync(
      resolve(process.cwd(), 'src/app/(dashboard)/admin/layout.tsx'),
      'utf8'
    )

    expect(layoutSource).not.toMatch(/\bmatch\s*:/)
  })
})
