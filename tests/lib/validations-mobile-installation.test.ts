import { describe, expect, it } from 'vitest'
import {
  registerInstallationSchema,
  replaceSubscriptionsSchema,
} from '@/lib/validations/mobile-installation'

function makeTeams(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    seasonTeamId: `st-${index + 1}`,
  }))
}

describe('registerInstallationSchema', () => {
  it.each(['ExpoPushToken[abc]', 'ExponentPushToken[abc]'])('accepts Expo token %s', (token) => {
    expect(
      registerInstallationSchema.safeParse({
        installationId: crypto.randomUUID(),
        expoPushToken: token,
        platform: 'IOS',
      }).success,
    ).toBe(true)
  })

  it('rejects an invalid Expo push token', () => {
    expect(
      registerInstallationSchema.safeParse({
        installationId: crypto.randomUUID(),
        expoPushToken: 'not-a-valid-token',
        platform: 'IOS',
      }).success,
    ).toBe(false)
  })

  it('rejects a non-UUID installation id', () => {
    expect(
      registerInstallationSchema.safeParse({
        installationId: 'not-a-uuid',
        expoPushToken: 'ExpoPushToken[abc]',
        platform: 'ANDROID',
      }).success,
    ).toBe(false)
  })
})

describe('replaceSubscriptionsSchema', () => {
  it('accepts up to twenty team subscriptions', () => {
    expect(replaceSubscriptionsSchema.safeParse({ teams: makeTeams(20) }).success).toBe(true)
  })

  it('rejects more than twenty team subscriptions', () => {
    expect(replaceSubscriptionsSchema.safeParse({ teams: makeTeams(21) }).success).toBe(false)
  })
})
