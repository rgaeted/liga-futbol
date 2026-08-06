'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { APP_LOCALE } from '@/lib/locale'

export const MATCH_CREATE_DRAFT_VERSION = 1

export type MatchCreateDraftEnvelope<T> = {
  version: number
  savedAt: string
  data: T
}

type Options = {
  debounceMs?: number
}

export function useMatchCreateDraft<T>(
  storageKey: string,
  initialData: T,
  options: Options = {}
) {
  const debounceMs = options.debounceMs ?? 500
  const [data, setData] = useState<T>(initialData)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const skipNextSave = useRef(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as MatchCreateDraftEnvelope<T>
        if (parsed.version === MATCH_CREATE_DRAFT_VERSION && parsed.data) {
          setData(parsed.data)
          setSavedAt(parsed.savedAt)
        }
      }
    } catch {
      // ignore invalid draft
    }
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    const timer = window.setTimeout(() => {
      const savedAtIso = new Date().toISOString()
      const envelope: MatchCreateDraftEnvelope<T> = {
        version: MATCH_CREATE_DRAFT_VERSION,
        savedAt: savedAtIso,
        data,
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(envelope))
        setSavedAt(savedAtIso)
      } catch {
        // quota or private mode
      }
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [data, debounceMs, hydrated, storageKey])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    skipNextSave.current = true
    setData(initialData)
    setSavedAt(null)
  }, [initialData, storageKey])

  const savedAtLabel = savedAt
    ? new Intl.DateTimeFormat(APP_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(savedAt))
    : null

  return {
    data,
    setData,
    savedAt,
    savedAtLabel,
    hasDraft: Boolean(savedAt),
    hydrated,
    clearDraft,
  }
}
