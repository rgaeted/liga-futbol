'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useMatchRealtime,
  type MatchRealtimeStatus,
} from '@/hooks/useMatchRealtime'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'

const INVALIDATION_DEBOUNCE_MS = 250
const POLL_INTERVAL_MS = 15_000

export async function fetchLiveMatchSnapshot(
  matchId: string,
  signal?: AbortSignal
): Promise<LiveMatchSnapshot> {
  const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/live`, {
    cache: 'no-store',
    signal,
  })
  if (!response.ok) throw new Error(`live_snapshot_http_${response.status}`)
  const snapshot = (await response.json()) as LiveMatchSnapshot
  if (snapshot.id !== matchId) throw new Error('live_snapshot_match_id_mismatch')
  return snapshot
}

export function useLiveMatchSnapshot({
  initialSnapshot,
}: {
  initialSnapshot: LiveMatchSnapshot
}) {
  const [snapshotState, setSnapshotState] = useState(() => ({
    initialSnapshot,
    snapshot: initialSnapshot,
  }))
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestRef = useRef(0)
  const previousStatusRef = useRef<MatchRealtimeStatus>('connecting')
  const lifecycleMatchIdRef = useRef(initialSnapshot.id)
  const initialSnapshotRef = useRef(initialSnapshot)
  const snapshot =
    snapshotState.initialSnapshot === initialSnapshot
      ? snapshotState.snapshot
      : initialSnapshot

  const resync = useCallback(async () => {
    const requestId = ++requestRef.current
    const requestSnapshot = initialSnapshotRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const next = await fetchLiveMatchSnapshot(requestSnapshot.id, controller.signal)
      if (requestId === requestRef.current) {
        setSnapshotState({ initialSnapshot: requestSnapshot, snapshot: next })
      }
    } catch {
      // The last valid snapshot remains visible.
    }
  }, [])

  const scheduleResync = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      void resync()
    }, INVALIDATION_DEBOUNCE_MS)
  }, [resync])

  useEffect(() => {
    const matchIdChanged = lifecycleMatchIdRef.current !== initialSnapshot.id
    lifecycleMatchIdRef.current = initialSnapshot.id
    initialSnapshotRef.current = initialSnapshot
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    ++requestRef.current
    abortRef.current?.abort()
    abortRef.current = null
    if (matchIdChanged) previousStatusRef.current = 'connecting'
  }, [initialSnapshot])

  const realtimeStatus = useMatchRealtime({
    matchId: initialSnapshot.id,
    enabled: true,
    onInvalidate: scheduleResync,
  })

  useEffect(() => {
    if (realtimeStatus === 'connected' && previousStatusRef.current !== 'connected') {
      void resync()
    }
    previousStatusRef.current = realtimeStatus
  }, [realtimeStatus, resync])

  useEffect(() => {
    if (snapshot.status !== 'LIVE' && snapshot.status !== 'HALFTIME') return
    const poll = () => {
      if (document.visibilityState === 'visible') void resync()
    }
    const interval = window.setInterval(poll, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [resync, snapshot.status])

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    },
    []
  )

  return { snapshot, realtimeStatus, resync }
}
