'use client'

import { useEffect } from 'react'

/**
 * Registra una vista por auspiciador y por pestaña. Se deduplica con sessionStorage para que el
 * refresco automático del landing no infle los números; si el storage no está disponible igual
 * se envía una vez por montaje.
 */
export function SponsorViewBeacon({
  organizationSlug,
  sponsorIds,
}: {
  organizationSlug: string
  sponsorIds: string[]
}) {
  const key = [...new Set(sponsorIds)].sort().join(',')

  useEffect(() => {
    if (!key) return
    const ids = key.split(',')
    const storageKey = `sponsor-views:${organizationSlug}:${key}`
    try {
      if (sessionStorage.getItem(storageKey)) return
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // Sin storage: se envía igual, una vez por carga.
    }
    void fetch('/api/public/sponsors/views', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationSlug, sponsorIds: ids.slice(0, 20) }),
    }).catch(() => undefined)
  }, [organizationSlug, key])

  return null
}
