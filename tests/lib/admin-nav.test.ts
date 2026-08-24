import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('admin navigation', () => {
  it('can cross the server-to-client boundary without functions', () => {
    const navSource = readFileSync(
      resolve(process.cwd(), 'src/lib/tenant-nav.ts'),
      'utf8',
    )

    expect(navSource).not.toMatch(/\bmatch\s*:/)
  })

  it('links Contenido with serializable activePrefixes', () => {
    const navSource = readFileSync(
      resolve(process.cwd(), 'src/lib/tenant-nav.ts'),
      'utf8',
    )

    expect(navSource).toContain("base('/admin/content')")
    expect(navSource).toContain("label: 'Contenido'")
    expect(navSource).toContain('activePrefixes: [')
    expect(navSource).toContain("base('/admin/content/articles')")
  })
})
