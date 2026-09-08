import type { ReactNode } from 'react'
import { MatchClockDisplay } from '@/components/live/MatchClockDisplay'
import { LiveTeamStaff } from '@/components/live/LiveTeamStaff'
import { LosLunesPhotoRing } from '@/components/live/loslunes-live-ui'
import { TeamCrest } from '@/components/TeamCrest'
import { matchStatusLabel } from '@/lib/match-status-ui'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'
import type { TeamMvpSideView } from '@/lib/match-mvp'
import type { LiveMatchWeather } from '@/lib/live-match-snapshot'
import { formatLiveWeatherTempC, formatLiveWeatherWindKmh } from '@/lib/match-weather'

function SideLabel({ children }: { children: string }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      <span className="h-px w-6 bg-org-primary" />
      <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-org-primary">
        {children}
      </span>
      <span className="h-px w-6 bg-org-primary" />
    </div>
  )
}

function WeatherPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-ui text-[10px] text-white/70">
      {children}
    </span>
  )
}

function MvpRow({ mvp }: { mvp: TeamMvpSideView }) {
  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <LosLunesPhotoRing name={mvp.label ?? '?'} photoUrl={mvp.photoUrl} size="lg" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-org-primary">
          👑 MVP · {mvp.teamLabel}
        </p>
        <p className="mt-0.5 truncate font-display text-lg font-bold uppercase tracking-[-0.02em] text-white sm:text-xl">
          {mvp.label}
        </p>
      </div>
    </div>
  )
}

export function LosLunesLiveScoreboard({
  match,
  isLive,
}: {
  match: LiveMatchSnapshot
  isLive: boolean
}) {
  const showMvps = match.status === 'FINISHED' && match.teamMvps.some((m) => m.label)
  const venueLabel = [match.venue, match.locationLabel].filter(Boolean).join(' · ')

  return (
    <article className="relative overflow-hidden rounded-2xl border border-org-primary bg-[#0a0a0a] text-white shadow-[0_0_40px_rgba(245,127,32,0.12)]">
      <span
        className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 font-display text-[120px] font-bold tracking-[0.12em] text-white/[0.04] max-sm:text-[72px]"
        aria-hidden
      >
        FDL
      </span>

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/[0.06] px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/75 max-sm:grid-cols-1 max-sm:text-center">
        <span className="inline-flex items-center gap-2 max-sm:justify-center">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          {match.dateLine}
        </span>
        {venueLabel ? (
          <span className="inline-flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.2" />
            </svg>
            {venueLabel}
          </span>
        ) : (
          <span aria-hidden />
        )}
        <span className="justify-self-end max-sm:justify-self-center">
          {isLive ? (
            <span className="live-pulse inline-flex items-center gap-2 rounded-md border border-org-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-org-primary">
              <span className="inline-block h-2 w-2 rounded-full bg-org-primary" />
              En vivo
            </span>
          ) : (
            <span className="rounded-md border border-org-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-org-primary">
              {matchStatusLabel(match.status)}
            </span>
          )}
        </span>
      </div>

      {match.weather ? (
        <WeatherStrip weather={match.weather} />
      ) : null}

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-6 sm:px-8 sm:py-8 max-sm:gap-2 max-sm:px-3">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-[88px] w-[88px] items-center justify-center max-sm:h-16 max-sm:w-16">
            <TeamCrest
              name={match.homeTeam.name}
              src={match.homeTeam.crestSrc ?? match.organization.logoUrl}
              color={match.homeTeam.color}
              size="lg"
              fit="contain"
              className="!h-full !w-full"
            />
          </div>
          <div className="font-display text-[24px] font-bold uppercase leading-none tracking-[-0.03em] max-sm:text-[17px]">
            {match.homeTeam.name}
          </div>
          <SideLabel>Local</SideLabel>
          <div className="mt-3">
            <LiveTeamStaff
              captainLabel={match.homeCaptainLabel}
              coachLabel={match.homeCoachLabel}
            />
          </div>
        </div>

        <div className="min-w-[132px] text-center max-sm:min-w-[96px]">
          {isLive || match.status === 'HALFTIME' ? (
            <MatchClockDisplay
              clock={{ ...match.clock, status: match.status }}
              className="mb-2 text-3xl text-org-primary sm:text-4xl"
            />
          ) : null}
          <div className="font-display text-[clamp(48px,7.5vw,86px)] font-bold leading-none tracking-[-0.05em] tabular-nums text-white">
            {match.homeScore}
            <span className="mx-[0.14em] inline-block h-[0.1em] w-[0.38em] translate-y-[-0.22em] bg-org-primary align-middle" />
            {match.awayScore}
          </div>
        </div>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-[88px] w-[88px] items-center justify-center max-sm:h-16 max-sm:w-16">
            <TeamCrest
              name={match.awayTeam.name}
              src={match.awayTeam.crestSrc ?? match.guestOrganization?.logoUrl}
              color={match.awayTeam.color}
              size="lg"
              fit="contain"
              className="!h-full !w-full"
            />
          </div>
          <div className="font-display text-[24px] font-bold uppercase leading-none tracking-[-0.03em] max-sm:text-[17px]">
            {match.awayTeam.name}
          </div>
          <SideLabel>Visita</SideLabel>
          <div className="mt-3">
            <LiveTeamStaff
              captainLabel={match.awayCaptainLabel}
              coachLabel={match.awayCoachLabel}
            />
          </div>
        </div>
      </div>

      {showMvps ? (
        <div className="relative border-t border-org-primary/25 px-5 py-5 sm:px-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-org-primary/70" />
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-org-primary">
              Juego real · Personas reales
            </h3>
            <span className="h-px flex-1 bg-org-primary/70" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {match.teamMvps
              .filter((m) => m.label)
              .map((mvp) => (
                <MvpRow key={mvp.side} mvp={mvp} />
              ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}

function WeatherStrip({ weather }: { weather: LiveMatchWeather }) {
  return (
    <div className="relative flex flex-wrap items-center justify-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
      <WeatherPill>{weather.label}</WeatherPill>
      <WeatherPill>{formatLiveWeatherTempC(weather.tempC)}</WeatherPill>
      <WeatherPill>{weather.humidityPct}% humedad</WeatherPill>
      <WeatherPill>{formatLiveWeatherWindKmh(weather.windKmh)}</WeatherPill>
    </div>
  )
}
