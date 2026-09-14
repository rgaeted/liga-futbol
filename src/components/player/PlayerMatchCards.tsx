import type { ReactNode } from 'react'
import Link from 'next/link'
import { MatchStatus, type FootballFormat, type FriendlySide, type MatchType } from '@prisma/client'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'
import { friendlyLineupLinkLabel } from '@/lib/match-player-links'
import { orgPath } from '@/lib/tenant-paths'
import { MatchLiveLink } from '@/components/player/MatchLiveLink'
import type { FormResult } from '@/lib/player-form-streak'

type MatchOutcome = FormResult

function matchOutcome(playerScore: number, opponentScore: number): MatchOutcome {
  if (playerScore > opponentScore) return 'W'
  if (playerScore < opponentScore) return 'L'
  return 'D'
}

const OUTCOME_LABELS: Record<MatchOutcome, string> = { W: 'V', D: 'E', L: 'D' }

const OUTCOME_STYLES: Record<MatchOutcome, string> = {
  W: 'border-[#3DE68C]/40 bg-[#3DE68C]/15 text-[#3DE68C]',
  D: 'border-[#8BA598]/40 bg-[#8BA598]/15 text-[#8BA598]',
  L: 'border-[#E06055]/40 bg-[#E06055]/15 text-[#E06055]',
}

function ResultCircle({ outcome }: { outcome: MatchOutcome }) {
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${OUTCOME_STYLES[outcome]}`}
      title={outcome === 'W' ? 'Victoria' : outcome === 'D' ? 'Empate' : 'Derrota'}
    >
      {OUTCOME_LABELS[outcome]}
    </span>
  )
}

function MatchShell({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-xl border border-[#2A3A32] bg-[#0B1210] px-4 py-3 transition hover:border-[#C91F26]/30">
      {children}
    </li>
  )
}

function UpcomingEmptySlot({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#2A3A32] bg-[#0B1210]/50 px-4 py-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A938C]">{label}</p>
      <p className="mt-1 text-xs text-[#8A938C]/70">Sin partidos programados</p>
    </div>
  )
}

export function UpcomingMatchesPanel({
  hasLeague,
  hasFriendly,
}: {
  hasLeague: boolean
  hasFriendly: boolean
}) {
  if (hasLeague || hasFriendly) return null

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <UpcomingEmptySlot label="Liga" />
      <UpcomingEmptySlot label="Amistoso" />
    </div>
  )
}

export function LeagueMatchList({
  items,
  playerId,
  playerTeamId,
  organizationSlug,
  emptyText,
  variant = 'default',
}: {
  items: Array<{
    match: {
      id: string
      scheduledAt: Date
      homeTeam: { name: string; id?: string } | null
      awayTeam: { name: string; id?: string } | null
      homeTeamId?: string | null
      awayTeamId?: string | null
      matchType: 'LEAGUE' | 'FRIENDLY'
      sideAName: string | null
      sideBName: string | null
      homeScore: number
      awayScore: number
      status: MatchStatus
      teamMvps: Array<{ id: string; playerId: string | null }>
    }
  }>
  playerId: string
  playerTeamId?: string | null
  organizationSlug: string
  emptyText?: string
  variant?: 'default' | 'played'
}) {
  if (items.length === 0) {
    return emptyText ? <p className="text-sm text-[#8A938C]">{emptyText}</p> : null
  }

  return (
    <ul className="space-y-2">
      {items.map(({ match }) => {
        const isFinished = match.status === 'FINISHED'
        const homeTeamId = match.homeTeamId ?? match.homeTeam?.id ?? null
        const awayTeamId = match.awayTeamId ?? match.awayTeam?.id ?? null
        let outcome: MatchOutcome | null = null

        if (isFinished && playerTeamId) {
          if (playerTeamId === homeTeamId) {
            outcome = matchOutcome(match.homeScore, match.awayScore)
          } else if (playerTeamId === awayTeamId) {
            outcome = matchOutcome(match.awayScore, match.homeScore)
          }
        }

        const isMvp = match.teamMvps.some((mvp) => mvp.playerId === playerId)

        if (variant === 'played' && isFinished) {
          return (
            <MatchShell key={match.id}>
              <div className="flex items-start gap-3">
                {outcome ? <ResultCircle outcome={outcome} /> : <span className="h-8 w-8 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[#E8E4D8]">
                      {matchDisplayName(match)}
                      {isMvp ? (
                        <span className="ml-2 text-xs font-bold text-[#E8C878]">MVP</span>
                      ) : null}
                    </p>
                    <span className="shrink-0 font-[family-name:var(--font-ibm-plex-mono)] text-sm font-semibold text-[#E8E4D8]">
                      {match.homeScore} - {match.awayScore}
                    </span>
                  </div>
                  <Link
                    href={orgPath(organizationSlug, `/live/${match.id}`)}
                    className="mt-1.5 inline-block text-xs font-semibold text-[#C91F26] hover:underline"
                  >
                    Ver partido
                  </Link>
                </div>
              </div>
            </MatchShell>
          )
        }

        return (
          <MatchShell key={match.id}>
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-[#E8E4D8]">
                {matchDisplayName(match)}
                {isMvp && <span className="ml-2 text-xs font-bold text-[#E8C878]">MVP</span>}
              </span>
              <span className="shrink-0 font-[family-name:var(--font-ibm-plex-mono)] text-sm text-[#3DE68C]">
                {isFinished
                  ? `${match.homeScore} - ${match.awayScore}`
                  : new Date(match.scheduledAt).toLocaleDateString('es-CL')}
              </span>
            </div>
            <div className="mt-1.5">
              <MatchLiveLink organizationSlug={organizationSlug} matchId={match.id} status={match.status} />
            </div>
          </MatchShell>
        )
      })}
    </ul>
  )
}

export function FriendlyMatchList({
  items,
  organizationSlug,
  emptyText,
  variant = 'default',
}: {
  items: Array<{
    id: string
    side: FriendlySide
    isCaptain: boolean
    isCoach: boolean
    match: {
      id: string
      matchType: MatchType
      sideAName: string | null
      sideBName: string | null
      scheduledAt: Date
      status: MatchStatus
      homeScore: number
      awayScore: number
      footballFormat: FootballFormat
      venue: string | null
    }
  }>
  organizationSlug: string
  emptyText?: string
  variant?: 'default' | 'played'
}) {
  if (items.length === 0) {
    return emptyText ? <p className="mt-2 text-sm text-[#8A938C]">{emptyText}</p> : null
  }

  return (
    <ul className="mt-2 space-y-2">
      {items.map((part) => {
        const sides = matchSideNames({
          ...part.match,
          homeTeam: null,
          awayTeam: null,
        })
        const teamLabel = part.side === 'A' ? sides.home : sides.away
        const isFinished = part.match.status === 'FINISHED'
        const playerScore = part.side === 'A' ? part.match.homeScore : part.match.awayScore
        const opponentScore = part.side === 'A' ? part.match.awayScore : part.match.homeScore
        const outcome = isFinished ? matchOutcome(playerScore, opponentScore) : null

        if (variant === 'played' && isFinished) {
          return (
            <MatchShell key={part.id}>
              <div className="flex items-start gap-3">
                {outcome ? <ResultCircle outcome={outcome} /> : <span className="h-8 w-8 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#E8E4D8]">
                        {sides.home} vs {sides.away}
                      </p>
                      <p className="mt-0.5 text-sm text-[#8A938C]">
                        {teamLabel} · {footballFormatLabel(part.match.footballFormat)}
                        {part.match.venue ? ` · ${part.match.venue}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-ibm-plex-mono)] text-sm font-semibold text-[#E8E4D8]">
                      {part.match.homeScore} - {part.match.awayScore}
                    </span>
                  </div>
                  <Link
                    href={orgPath(organizationSlug, `/live/${part.match.id}`)}
                    className="mt-1.5 inline-block text-xs font-semibold text-[#C91F26] hover:underline"
                  >
                    Ver partido
                  </Link>
                </div>
              </div>
            </MatchShell>
          )
        }

        return (
          <MatchShell key={part.id}>
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-[#E8E4D8]">
                {sides.home} vs {sides.away}
                {part.isCaptain && (
                  <span className="ml-2 text-xs font-bold uppercase tracking-wide text-[#8A938C]">
                    Capitán
                  </span>
                )}
              </span>
              <span className="shrink-0 font-[family-name:var(--font-ibm-plex-mono)] text-sm text-[#3DE68C]">
                {isFinished
                  ? `${part.match.homeScore} - ${part.match.awayScore}`
                  : new Date(part.match.scheduledAt).toLocaleDateString('es-CL')}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#8A938C]">
              {teamLabel} · {footballFormatLabel(part.match.footballFormat)}
              {part.match.venue ? ` · ${part.match.venue}` : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <MatchLiveLink
                organizationSlug={organizationSlug}
                matchId={part.match.id}
                status={part.match.status}
              />
              {part.isCoach && (
                <Link
                  href={orgPath(organizationSlug, `/player/friendly-matches/${part.match.id}/lineup`)}
                  className="text-xs font-semibold text-[#C91F26] hover:underline"
                >
                  {friendlyLineupLinkLabel(part.match.status)} →
                </Link>
              )}
            </div>
          </MatchShell>
        )
      })}
    </ul>
  )
}
