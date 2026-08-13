import * as Notifications from 'expo-notifications'
import type { MobilePushData } from '@liga/mobile-contracts'
import { getLeagueSlug } from '../lib/runtime-config'

export type NotificationNavigationHandler = (path: string) => void

function parsePushData(raw: unknown): MobilePushData | null {
  if (!raw || typeof raw !== 'object') return null

  const data = raw as Partial<MobilePushData>
  if (data.type !== 'match') return null
  if (typeof data.slug !== 'string' || typeof data.path !== 'string') return null
  if (typeof data.matchId !== 'string' || typeof data.kind !== 'string') return null

  return data as MobilePushData
}

export function resolveNotificationPath(data: MobilePushData | null, leagueSlug: string): string {
  if (!data || data.slug !== leagueSlug) return '/(tabs)'
  if (data.type === 'match' && data.path.startsWith('/matches/')) {
    const matchId = data.path.slice('/matches/'.length)
    if (matchId.length > 0) {
      return `/(tabs)/matches/${matchId}`
    }
  }
  return '/(tabs)'
}

export function attachNotificationResponseListener(
  onNavigate: NotificationNavigationHandler,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = parsePushData(response.notification.request.content.data)
    onNavigate(resolveNotificationPath(data, getLeagueSlug()))
  })

  return () => subscription.remove()
}
