import { NotificationKind } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { buildMatchNotificationPayload } from '@/lib/mobile/notifications/payload'

const context = {
  slug: 'liga-invierno-kelme-puerto-varas-2026',
  matchId: 'm1',
  homeName: 'Rojo',
  awayName: 'Negro',
  homeScore: 2,
  awayScore: 1,
  scorerName: 'Juan Pérez',
}

describe('buildMatchNotificationPayload', () => {
  it('builds start copy and deep link data', () => {
    const payload = buildMatchNotificationPayload(NotificationKind.MATCH_START, context)
    expect(payload.title).toBe('¡Arrancó el partido!')
    expect(payload.body).toBe('Rojo vs Negro')
    expect(payload.data).toEqual({
      type: 'match',
      slug: 'liga-invierno-kelme-puerto-varas-2026',
      matchId: 'm1',
      kind: 'MATCH_START',
      path: '/matches/m1',
    })
  })

  it('builds goal copy with scorer and score', () => {
    const payload = buildMatchNotificationPayload(NotificationKind.GOAL, context)
    expect(payload.title).toBe('¡Gol!')
    expect(payload.body).toBe('Juan Pérez anotó. Rojo 2-1 Negro')
    expect(payload.data).toEqual({
      type: 'match',
      slug: 'liga-invierno-kelme-puerto-varas-2026',
      matchId: 'm1',
      kind: 'GOAL',
      path: '/matches/m1',
    })
  })

  it('builds final copy with scoreline', () => {
    const payload = buildMatchNotificationPayload(NotificationKind.MATCH_FINISH, context)
    expect(payload.title).toBe('Final del partido')
    expect(payload.body).toBe('Rojo 2-1 Negro')
    expect(payload.data.kind).toBe('MATCH_FINISH')
  })
})
