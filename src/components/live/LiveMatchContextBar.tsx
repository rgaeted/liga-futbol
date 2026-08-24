import type { ReactNode } from 'react'
import type { LiveMatchWeather } from '@/lib/live-match-snapshot'
import { formatLiveWeatherTempC, formatLiveWeatherWindKmh } from '@/lib/match-weather'

export type { LiveMatchWeather } from '@/lib/live-match-snapshot'

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 text-[#8A938C]">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
      />
      <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#8A938C]">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 18h11a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.7 1.8A3.5 3.5 0 0 0 7 18Z"
      />
    </svg>
  )
}

function ThermometerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#8A938C]">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z"
      />
    </svg>
  )
}

function DropletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#8A938C]">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c2.5 3.8 5 7.1 5 10a5 5 0 1 1-10 0c0-2.9 2.5-6.2 5-10Z"
      />
    </svg>
  )
}

function WindIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#8A938C]">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8h11a3 3 0 1 0-3-3M4 12h13a3 3 0 1 1-3 3M4 16h9a2.5 2.5 0 1 1-2.5 2.5"
      />
    </svg>
  )
}

function ContextPill({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#121A18] px-3 py-1.5 font-ui text-xs text-[#E8E4D8] ring-1 ring-[#2A3A32]">
      {icon}
      <span>{children}</span>
    </span>
  )
}

type Props = {
  venue: string | null
  locationLabel: string | null
  weather: LiveMatchWeather | null
}

export function LiveMatchContextBar({ venue, locationLabel, weather }: Props) {
  const hasLocation = Boolean(venue || locationLabel)
  const hasWeather = weather !== null

  if (!hasLocation && !hasWeather) return null

  return (
    <div className="relative mb-6 flex flex-col items-center gap-3 px-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 sm:gap-y-2">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] bg-org-primary"
      />
      {hasLocation && (
        <div className="flex max-w-full items-center gap-2 pt-3 text-center sm:text-left">
          <MapPinIcon />
          <p className="font-ui text-sm leading-snug text-[#8A938C]">
            {venue ? <span className="font-display font-semibold text-[#E8E4D8]">{venue}</span> : null}
            {venue && locationLabel ? <span className="text-[#8A938C]/60"> · </span> : null}
            {locationLabel ? <span>{locationLabel}</span> : null}
          </p>
        </div>
      )}

      {hasLocation && hasWeather ? (
        <span aria-hidden className="hidden h-4 w-px bg-[#2A3A32] sm:block" />
      ) : null}

      {hasWeather && weather ? (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-3 sm:pt-0">
          <ContextPill icon={<CloudIcon />}>{weather.label}</ContextPill>
          <ContextPill icon={<ThermometerIcon />}>
            {formatLiveWeatherTempC(weather.tempC)}
          </ContextPill>
          <ContextPill icon={<DropletIcon />}>{weather.humidityPct}% humedad</ContextPill>
          <ContextPill icon={<WindIcon />}>{formatLiveWeatherWindKmh(weather.windKmh)}</ContextPill>
        </div>
      ) : null}
    </div>
  )
}
