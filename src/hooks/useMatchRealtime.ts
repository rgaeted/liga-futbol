'use client'

import { useEffect, useState } from 'react'
import { getSupabaseRealtimeClient } from '@/lib/supabase-realtime-client'

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
  const [status, setStatus] = useState<MatchRealtimeStatus>('connecting')

  useEffect(() => {
    if (!enabled) {
      setStatus('degraded')
      return
    }
    const client = getSupabaseRealtimeClient()
    if (!client) {
      setStatus('degraded')
      return
    }

    let active = true
    setStatus('connecting')
    const timeout = window.setTimeout(() => {
      if (active) setStatus('degraded')
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
          window.clearTimeout(timeout)
          setStatus('connected')
        } else if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'TIMED_OUT' ||
          subscriptionStatus === 'CLOSED'
        ) {
          setStatus('degraded')
        }
      })

    return () => {
      active = false
      window.clearTimeout(timeout)
      void client.removeChannel(channel)
    }
  }, [enabled, matchId, onInvalidate])

  return status
}
