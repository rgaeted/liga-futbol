import { describe, expect, it } from 'vitest'
import { awardDisplayTitle, resolveAwardCover } from '@/lib/award-covers'

describe('resolveAwardCover', () => {
  it('mapea los premios de Los Lunes a fotos de camarín', () => {
    expect(resolveAwardCover('Premio Siete Pulmones', 'Siete Pulmones').src).toContain(
      'siete-pulmones',
    )
    expect(resolveAwardCover('Premio Highlander', 'Highlander').icon).toBe('star')
    expect(resolveAwardCover('Premio Mourinho de Temu', 'Mourinho').icon).toBe('cart')
  })
})

describe('awardDisplayTitle', () => {
  it('quita el prefijo Premio', () => {
    expect(awardDisplayTitle('Premio Siete Pulmones', 'Siete Pulmones')).toBe('Siete Pulmones')
  })
})
