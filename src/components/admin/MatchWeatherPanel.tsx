'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { APP_LOCALE } from '@/lib/locale'
import { formatMatchWeather } from '@/lib/match-weather'
import { formatChileLocation } from '@/lib/chile-locations'
import { submitJson } from './submit'

type Props = {
  matchId: string
  regionName: string | null
  communeName: string | null
  venue: string | null
  weatherTempC: number | null
  weatherHumidityPct: number | null
  weatherWindKmh: number | null
  weatherLabel: string | null
  weatherFetchedAt: string | null
  hasCoordinates: boolean
  regionCode?: string
  communeCode?: string
  scheduledAt?: string
  compact?: boolean
}

export function MatchWeatherPanel({
  matchId,
  regionName,
  communeName,
  venue,
  weatherTempC,
  weatherHumidityPct,
  weatherWindKmh,
  weatherLabel,
  weatherFetchedAt,
  hasCoordinates,
  regionCode,
  communeCode,
  scheduledAt,
  compact = false,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const locationLabel = formatChileLocation(regionName, communeName)
  const weatherSummary = formatMatchWeather({
    weatherTempC,
    weatherHumidityPct,
    weatherWindKmh,
    weatherLabel,
  })

  async function fetchWeather() {
    setLoading(true)
    setError('')
    const payload: Record<string, string> = {}
    if (regionCode && communeCode) {
      payload.regionCode = regionCode
      payload.communeCode = communeCode
    }
    if (scheduledAt) payload.scheduledAt = scheduledAt
    const result = await submitJson(
      `/api/matches/${matchId}/weather`,
      'POST',
      Object.keys(payload).length > 0 ? payload : {}
    )
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  if (!locationLabel && !venue && !hasCoordinates) return null

  return (
    <div
      className={
        compact
          ? 'text-sm text-kelme-gray-500'
          : 'rounded-xl border border-kelme-border bg-kelme-gray-50/80 p-4 md:col-span-3'
      }
    >
      {!compact && (
        <p className="font-ui text-sm font-semibold text-kelme-gray-900">Clima del partido</p>
      )}

      {(locationLabel || venue) && (
        <p className={compact ? 'text-kelme-gray-500' : 'mt-1 text-xs text-kelme-gray-500'}>
          {[venue, locationLabel].filter(Boolean).join(' · ')}
        </p>
      )}

      {weatherSummary ? (
        <p className={compact ? 'text-kelme-gray-600' : 'mt-2 text-sm text-kelme-gray-700'}>
          {weatherSummary}
          {weatherFetchedAt && (
            <span className="text-kelme-gray-400">
              {' '}
              · actualizado{' '}
              {new Date(weatherFetchedAt).toLocaleString(APP_LOCALE, {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          )}
        </p>
      ) : hasCoordinates ? (
        <p className={compact ? 'text-kelme-gray-400' : 'mt-2 text-xs text-kelme-gray-500'}>
          Aún no hay clima registrado para la fecha y hora del partido.
          {regionCode && communeCode && !locationLabel ? (
            <span> Se guardará la ubicación al consultar.</span>
          ) : null}
        </p>
      ) : null}

      {hasCoordinates && (
        <div className={compact ? 'mt-1' : 'mt-3'}>
          <button
            type="button"
            onClick={fetchWeather}
            disabled={loading}
            className={
              compact
                ? 'text-xs text-kelme-red hover:underline disabled:opacity-50'
                : 'rounded-lg border border-kelme-border bg-kelme-surface px-3 py-1.5 text-xs hover:border-kelme-red/40 disabled:opacity-50'
            }
          >
            {loading ? 'Consultando clima…' : weatherSummary ? 'Actualizar clima' : 'Consultar clima'}
          </button>
          {error && (
            <p className={`text-xs text-kelme-red ${compact ? 'mt-1' : 'mt-2'}`}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
