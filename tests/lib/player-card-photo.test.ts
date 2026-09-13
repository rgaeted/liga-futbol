import { describe, expect, it } from 'vitest'

import {
  personHasCardPhoto,
  playerCardPhotoUrl,
} from '@/lib/player-card-photo'

describe('player card photo helpers', () => {
  it('detecta un recorte persistido', () => {
    expect(
      personHasCardPhoto({
        cardPhotoMimeType: 'image/png',
        cardPhotoData: Buffer.from('png'),
      }),
    ).toBe(true)
  })

  it('rechaza campos incompletos', () => {
    expect(
      personHasCardPhoto({
        cardPhotoMimeType: 'image/png',
        cardPhotoData: null,
      }),
    ).toBe(false)
  })

  it.each([null, 'image/jpeg'])(
    'rechaza el MIME %s aunque existan datos',
    (cardPhotoMimeType) => {
      expect(
        personHasCardPhoto({
          cardPhotoMimeType,
          cardPhotoData: Buffer.from('image'),
        }),
      ).toBe(false)
    },
  )

  it('rechaza un recorte sin bytes', () => {
    expect(
      personHasCardPhoto({
        cardPhotoMimeType: 'image/png',
        cardPhotoData: Buffer.alloc(0),
      }),
    ).toBe(false)
  })

  it('construye URL sin versión cuando no hay cache key', () => {
    expect(playerCardPhotoUrl('p1')).toBe('/api/players/p1/card-photo')
  })

  it('construye URL versionada', () => {
    expect(playerCardPhotoUrl('p1', 123)).toBe(
      '/api/players/p1/card-photo?v=123',
    )
  })

  it('convierte una fecha a milisegundos para versionar la URL', () => {
    expect(playerCardPhotoUrl('p1', new Date(123))).toBe(
      '/api/players/p1/card-photo?v=123',
    )
  })
})
