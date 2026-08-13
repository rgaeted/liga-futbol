import type { NotificationKindCode } from './installations.js'

export type MobilePushData = {
  type: 'match'
  slug: string
  matchId: string
  kind: NotificationKindCode
  path: string
}
