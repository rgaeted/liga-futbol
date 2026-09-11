// tests/lib/kelme-cup-mobile-edition-files.test.ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  KELME_CUP_MOBILE_API_BASE_URL,
  KELME_CUP_MOBILE_BUNDLE_ID,
  KELME_CUP_MOBILE_SLUG,
} from '@/lib/kelme-cup-mobile-edition'
import { KELME_CUP_PRIMARY } from '@/lib/org-brand'

const repoRoot = process.cwd()

describe('kelme cup expo edition files', () => {
  it('registers the cup edition without rewriting invierno', () => {
    const editionIndex = readFileSync(
      path.join(repoRoot, 'apps/mobile/src/lib/edition.ts'),
      'utf8',
    )
    const cupConfig = readFileSync(
      path.join(repoRoot, 'apps/mobile/editions/kelme-cup-los-lagos-2026/edition.config.ts'),
      'utf8',
    )
    const inviernoConfig = readFileSync(
      path.join(
        repoRoot,
        'apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/edition.config.ts',
      ),
      'utf8',
    )

    expect(editionIndex).toContain(
      "import kelmeCupLosLagos2026 from '../../editions/kelme-cup-los-lagos-2026/edition.config'",
    )
    expect(editionIndex).toContain('[kelmeCupLosLagos2026.key]: kelmeCupLosLagos2026')
    expect(editionIndex).toContain(
      "import puertoVaras2026 from '../../editions/liga-invierno-kelme-puerto-varas-2026/edition.config'",
    )
    expect(cupConfig).toContain(`slug: '${KELME_CUP_MOBILE_SLUG}'`)
    expect(cupConfig).toContain(KELME_CUP_MOBILE_BUNDLE_ID)
    expect(cupConfig).toContain(KELME_CUP_MOBILE_API_BASE_URL)
    expect(cupConfig).toContain(KELME_CUP_PRIMARY)
    expect(cupConfig).not.toContain('#CD212A')
    expect(inviernoConfig).toContain('cl.kelme.ligainvierno.puertovaras2026')
    expect(inviernoConfig).toContain('#CD212A')
  })
})
