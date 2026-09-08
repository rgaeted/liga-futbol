import { beforeEach, describe, expect, it } from 'vitest'
import { verifyPlayerClaimToken } from '@/lib/player-claim-token'
import { playerRegisterInviteText } from '@/lib/player-register-invite-text'
import { playerRegisterPath } from '@/lib/player-register-link'

describe('playerRegisterPath', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret'
  })

  it('builds a signed register link for one player', () => {
    const path = playerRegisterPath('p1')
    const url = new URL(path, 'http://localhost')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('mode')).toBe('register')
    expect(url.searchParams.get('player')).toBe('p1')
    const token = url.searchParams.get('token')
    expect(token).toBeTruthy()
    expect(verifyPlayerClaimToken('p1', token!)).toBe(true)
  })

  it('adds the org landing as callback when a slug is given', () => {
    const path = playerRegisterPath('p1', 'loslunes')
    const url = new URL(path, 'http://localhost')
    expect(url.searchParams.get('callbackUrl')).toBe('/loslunes')
  })
})

describe('playerRegisterInviteText', () => {
  it('builds a WhatsApp invite with org name', () => {
    expect(
      playerRegisterInviteText('Claudio', 'https://ligalab.cl/login?mode=register', 'Partidos Los Lunes'),
    ).toBe(
      'Hola Claudio, crea tu cuenta de Partidos Los Lunes con este link personal: https://ligalab.cl/login?mode=register',
    )
  })

  it('omits the org clause when no name is given', () => {
    expect(playerRegisterInviteText('Claudio', 'https://ligalab.cl/login')).toBe(
      'Hola Claudio, crea tu cuenta con este link personal: https://ligalab.cl/login',
    )
  })
})
