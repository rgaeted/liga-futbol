import { useEffect, useState } from 'react'
import { getSupabaseRealtimeClient } from '../lib/supabase-realtime-client'

export type MatchRealtimeStatus = 'connecting' | 'connected' | 'degraded'

const SUBSCRIPTION_TIMEOUT_MS = 10_000

export function useMatchRealtime({
  matchId,
  enabled,
  onInvalidate,
}: {
  matchId: string
  enabled: boolean
  onInvalidate: () => void
}): MatchRealtimeStatus {
  const client = enabled ? getSupabaseRealtimeClient() : null
  const [connectionStatus, setConnectionStatus] =
    useState<MatchRealtimeStatus>('connecting')
  const [subscriptionKey, setSubscriptionKey] = useState(
    () => `${matchId}:${enabled}:${client ? 'ready' : 'missing'}`,
  )

  const currentKey = `${matchId}:${enabled}:${client ? 'ready' : 'missing'}`
  if (subscriptionKey !== currentKey) {
    setSubscriptionKey(currentKey)
    if (enabled && client) {
      setConnectionStatus('connecting')
    }
  }

  useEffect(() => {
    if (!enabled || !client) return

    let active = true
    const timeout = setTimeout(() => {
      if (active) setConnectionStatus('degraded')
    }, SUBSCRIPTION_TIMEOUT_MS)

    const channel = client
      .channel(`match:${matchId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'invalidate' }, ({ payload }) => {
        if (active && payload?.matchId === matchId) onInvalidate()
      })
      .subscribe((subscriptionStatus) => {
        if (!active) return
        if (subscriptionStatus === 'SUBSCRIBED') {
          clearTimeout(timeout)
          setConnectionStatus('connected')
        } else if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'TIMED_OUT' ||
          subscriptionStatus === 'CLOSED'
        ) {
          setConnectionStatus('degraded')
        }
      })

    return () => {
      active = false
      clearTimeout(timeout)
      void client.removeChannel(channel)
    }
  }, [client, enabled, matchId, onInvalidate])

  if (!enabled || !client) return 'degraded'
  return connectionStatus
}
