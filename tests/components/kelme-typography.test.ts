import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const KELME_SECTIONS = [
  'src/components/marketing/KelmeCupHomeHero.tsx',
  'src/components/marketing/KelmeCupFixture.tsx',
  'src/components/marketing/KelmeCupInvite.tsx',
  'src/components/marketing/KelmeCupResults.tsx',
  'src/components/marketing/KelmeCupMatchBoard.tsx',
]

describe('tipografía del landing de Kelme', () => {
  it.each(KELME_SECTIONS)('%s no usa la letra manuscrita que desentona con el estilo deportivo', (file) => {
    expect(read(file)).not.toContain('font-script')
  })
})
