import Link from 'next/link'
import type { FootballFormat, MatchStatus, MatchType } from '@prisma/client'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { matchStatusBadgeClass, matchStatusLabel } from '@/lib/match-status-ui'
import { formatScheduleDateLabel, formatScheduleTimeLabel } from '@/lib/schedule-datetime'
import { footballFormatLabel } from '@/lib/football-format'
import { orgPath } from '@/lib/tenant-paths'
import { MatchLiveLink } from '@/components/player/MatchLiveLink'

export type RefereeMatchRow = {
  id: string
  matchType: MatchType
  status: MatchStatus
  scheduledAt: Date
  homeScore: number
  awayScore: number
  venue: string | null
  footballFormat: FootballFormat | null
  homeTeam: { name: string } | null
  awayTeam: { name: string } | null
  sideAName: string | null
  sideBName: string | null
}

function matchTitle(match: RefereeMatchRow): string {
  if (match.matchType === 'FRIENDLY') {
    const sides = matchSideNames({
      ...match,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    })
    return `${sides.home} vs ${sides.away}`
  }
  return matchDisplayName(match)
}

function matchMeta(match: RefereeMatchRow): string {
  const date = formatScheduleDateLabel(match.scheduledAt)
  const time = formatScheduleTimeLabel(match.scheduledAt)
  const parts = [date, time]
  if (match.matchType === 'FRIENDLY' && match.footballFormat) {
    parts.push(footballFormatLabel(match.footballFormat))
  }
  if (match.venue) parts.push(match.venue)
  return parts.join(' · ')
}

export function RefereeUpcomingMatchList({
  matches,
  organizationSlug,
  emptyText = 'No tienes partidos programados ni en curso.',
}: {
  matches: RefereeMatchRow[]
  organizationSlug: string
  emptyText?: string
}) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#2A3A32] bg-[#0B1210] p-4 text-sm text-[#8A938C]">
        {emptyText}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {matches.map((match, index) => (
        <Link
          key={match.id}
          href={orgPath(organizationSlug, `/referee/match/${match.id}`)}
          className={`block rounded-xl border bg-[#0B1210] transition hover:border-[#3DE68C]/40 ${
            index === 0 ? 'border-[#3DE68C]/35 p-4' : 'border-[#2A3A32] p-3'
          }`}
        >
          {index === 0 ? (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#3DE68C]">
              {match.status === 'LIVE' || match.status === 'HALFTIME'
                ? 'En curso'
                : 'Próximo partido'}
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`truncate font-semibold text-[#E8E4D8] ${index === 0 ? 'text-base' : 'text-sm'}`}>
                {matchTitle(match)}
              </p>
              <p className="mt-1 text-xs text-[#8A938C]">{matchMeta(match)}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${matchStatusBadgeClass(match.status)}`}
            >
              {matchStatusLabel(match.status)}
            </span>
          </div>
          {index === 0 ? (
            <p className="mt-2 text-xs font-bold text-[#3DE68C]">Gestionar partido →</p>
          ) : null}
        </Link>
      ))}
    </div>
  )
}

export function RefereeFinishedMatchList({
  matches,
  organizationSlug,
  emptyText = 'Aún no has arbitrado partidos finalizados.',
}: {
  matches: RefereeMatchRow[]
  organizationSlug: string
  emptyText?: string
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-[#8A938C]">{emptyText}</p>
  }

  return (
    <div className="space-y-2">
      {matches.map((match) => (
        <div
          key={match.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2A3A32] bg-[#0B1210] px-3 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#E8E4D8]">{matchTitle(match)}</p>
            <p className="text-xs text-[#8A938C]">{matchMeta(match)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="font-mono text-sm font-semibold text-[#E8E4D8]">
              {match.homeScore} - {match.awayScore}
            </p>
            <MatchLiveLink
              organizationSlug={organizationSlug}
              matchId={match.id}
              status={match.status}
              className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#3DE68C] hover:underline"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RefereeMatchesHistorySection({
  title,
  matches,
  organizationSlug,
}: {
  title: string
  matches: RefereeMatchRow[]
  organizationSlug: string
}) {
  if (matches.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="font-[family-name:var(--font-anton)] text-base uppercase tracking-[0.08em] text-[#E8E4D8]">
        {title}
      </h2>
      <div className="space-y-2">
        {matches.map((match) => (
          <div
            key={match.id}
            className="rounded-xl border border-[#2A3A32] bg-[#121A18] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#E8E4D8]">{matchTitle(match)}</p>
                <p className="mt-1 text-sm text-[#8A938C]">{matchMeta(match)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-semibold text-[#E8E4D8]">
                  {match.homeScore} - {match.awayScore}
                </p>
                <p className="text-xs text-[#8A938C]">{matchStatusLabel(match.status)}</p>
                <div className="mt-2 flex flex-col items-end gap-1">
                  {(match.status === 'SCHEDULED' ||
                    match.status === 'LIVE' ||
                    match.status === 'HALFTIME') && (
                    <Link
                      href={orgPath(organizationSlug, `/referee/match/${match.id}`)}
                      className="text-xs font-bold text-[#3DE68C] hover:underline"
                    >
                      Gestionar partido
                    </Link>
                  )}
                  <MatchLiveLink
                    organizationSlug={organizationSlug}
                    matchId={match.id}
                    status={match.status}
                    className="text-xs text-[#3DE68C] hover:underline"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
