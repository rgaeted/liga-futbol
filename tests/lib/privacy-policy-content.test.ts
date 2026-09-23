import { describe, expect, it } from 'vitest'
import { PLATFORM_PRIVACY_SECTIONS } from '@/lib/legal/privacy-policy-content'

describe('PLATFORM_PRIVACY_SECTIONS', () => {
  it('references Chilean privacy and cybersecurity laws', () => {
    const copy = PLATFORM_PRIVACY_SECTIONS.flatMap((section) => [
      ...section.paragraphs,
      ...(section.bullets ?? []),
    ]).join(' ')

    expect(copy).toMatch(/Ley N° 19\.628/)
    expect(copy).toMatch(/Ley N° 21\.663/)
    expect(copy).toMatch(/privacidad@ligalab\.cl/)
  })

  it('covers ARCO rights and security measures', () => {
    const titles = PLATFORM_PRIVACY_SECTIONS.map((section) => section.title).join(' ')
    expect(titles).toMatch(/Derechos del titular/)
    expect(titles).toMatch(/ciberseguridad/)
    expect(titles).toMatch(/Cookies/)
  })
})
