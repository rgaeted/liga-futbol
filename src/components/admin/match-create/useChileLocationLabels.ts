'use client'

import { useEffect, useState } from 'react'

type RegionOption = { code: string; name: string }
type CommuneOption = { code: string; name: string }

export function useChileLocationLabels(regionCode: string, communeCode: string) {
  const [regionName, setRegionName] = useState('')
  const [communeName, setCommuneName] = useState('')

  useEffect(() => {
    if (!regionCode) {
      setRegionName('')
      setCommuneName('')
      return
    }

    let cancelled = false
    fetch('/api/chile-locations')
      .then((res) => res.json())
      .then((data: { regions: RegionOption[] }) => {
        if (cancelled) return
        const region = (data.regions ?? []).find((item) => item.code === regionCode)
        setRegionName(region?.name ?? '')
      })
      .catch(() => {
        if (!cancelled) setRegionName('')
      })

    return () => {
      cancelled = true
    }
  }, [regionCode])

  useEffect(() => {
    if (!regionCode || !communeCode) {
      setCommuneName('')
      return
    }

    let cancelled = false
    fetch(`/api/chile-locations?regionCode=${encodeURIComponent(regionCode)}`)
      .then((res) => res.json())
      .then((data: { communes: CommuneOption[] }) => {
        if (cancelled) return
        const commune = (data.communes ?? []).find((item) => item.code === communeCode)
        setCommuneName(commune?.name ?? '')
      })
      .catch(() => {
        if (!cancelled) setCommuneName('')
      })

    return () => {
      cancelled = true
    }
  }, [communeCode, regionCode])

  return { regionName, communeName }
}
