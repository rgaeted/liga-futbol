'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseRealtimeClient } from '@/lib/supabase-realtime-client'

const REFRESH_DEBOUNCE_MS = 250
const LIVE_POLL_INTERVAL_MS = 15_000

export function useOrgLandingRefresh({
  matchIds,
  hasLiveMatch,
}: {
  matchIds: string[]
  hasLiveMatch: boolean
}) {
  const router = useRouter()
  const debounceRef = useRef<number | null>(null)
  const matchIdsKey = matchIds.join('\0')

  const refresh = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      router.refresh()
    }, REFRESH_DEBOUNCE_MS)
  }, [router])

  useEffect(() => {
    const client = getSupabaseRealtimeClient()
    if (!client || matchIds.length === 0) return

    const channels = matchIds.map((matchId) =>
      client
        .channel(`match:${matchId}`, {
          config: { broadcast: { self: false } },
        })
        .on('broadcast', { event: 'invalidate' }, ({ payload }) => {
          if (payload?.matchId === matchId) refresh()
        })
        .subscribe(),
    )

    return () => {
      for (const channel of channels) {
        void client.removeChannel(channel)
      }
    }
  }, [matchIdsKey, refresh])

  useEffect(() => {
    if (!hasLiveMatch) return
    const poll = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const interval = window.setInterval(poll, LIVE_POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [hasLiveMatch, refresh])

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    },
    [],
  )
}
