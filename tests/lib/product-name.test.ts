import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

describe('LigaLab product name', () => {
  it('uses LigaLab in root metadata and landing, not AdminTorneo as product title', () => {
    const layout = read('src/app/layout.tsx')
    expect(layout).toContain("default: 'LigaLab'")
    expect(layout).toContain("template: '%s · LigaLab'")
    expect(layout).not.toContain("'AdminTorneo'")

    const landing = read('src/components/marketing/ProductLanding.tsx')
    expect(landing).toContain('productName="LigaLab"')
    expect(landing).toContain('LigaLab')
    expect(landing).not.toContain('AdminTorneo')

    const manifest = read('public/manifest.json')
    expect(manifest).toContain('"name": "LigaLab"')
    expect(manifest).not.toContain('AdminTorneo')
  })

  it('keeps the native bundle id prefix cl.admintorneo', () => {
    const source = read('src/lib/mobile-edition-slug.ts')
    expect(source).toContain('cl.admintorneo.')
  })
})
