import type { MobileStatsResponse, MobileStatRow } from '@liga/mobile-contracts'
import { EventType } from '@prisma/client'

type MatchEventRow = {
  type: EventType
  playerId: string | null
  assistPlayerId: string | null
  match: { seasonId: string | null }
}

type MvpRow = {
  playerId: string | null
  match: { seasonId: string | null }
}

type RosterRow = {
  rosterEntryId: string
  playerId: string
  playerName: string
  teamName: string
  jerseyNumber: number | null
  position: string | null
}

type PlayerCounters = {
  playerId: string
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

export function aggregateSeasonPlayerStats(
  events: MatchEventRow[],
  mvps: MvpRow[],
  roster: RosterRow[],
  seasonId: string,
  globalCounters: PlayerCounters[] = [],
): MobileStatsResponse {
  const rosterByPlayerId = new Map(roster.map((r) => [r.playerId, r]))
  const stats = new Map<
    string,
    { goals: number; assists: number; yellowCards: number; redCards: number; mvpCount: number }
  >()

  for (const row of roster) {
    stats.set(row.playerId, {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      mvpCount: 0,
    })
  }

  for (const event of events) {
    if (event.match.seasonId !== seasonId || !event.playerId) continue
    if (!stats.has(event.playerId)) continue
    const row = stats.get(event.playerId)!
    if (event.type === EventType.GOAL) row.goals += 1
    if (event.type === EventType.YELLOW_CARD) row.yellowCards += 1
    if (event.type === EventType.RED_CARD) row.redCards += 1
    if (event.assistPlayerId && stats.has(event.assistPlayerId)) {
      stats.get(event.assistPlayerId)!.assists += 1
    }
  }

  for (const mvp of mvps) {
    if (mvp.match.seasonId !== seasonId || !mvp.playerId) continue
    if (!stats.has(mvp.playerId)) continue
    stats.get(mvp.playerId)!.mvpCount += 1
  }

  // Global counters must not affect results
  for (const counter of globalCounters) {
    void counter
  }

  function toStatRows(
    pickValue: (s: { goals: number; assists: number; yellowCards: number; redCards: number; mvpCount: number }) => number,
  ): MobileStatRow[] {
    return roster
      .map((r) => {
        const s = stats.get(r.playerId)!
        const value = pickValue(s)
        return {
          rosterEntryId: r.rosterEntryId,
          playerId: r.playerId,
          playerName: r.playerName,
          teamName: r.teamName,
          jerseyNumber: r.jerseyNumber,
          position: r.position,
          value,
          stats: s,
        }
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName, 'es-CL'))
  }

  return {
    scorers: toStatRows((s) => s.goals),
    assists: toStatRows((s) => s.assists),
    yellowCards: toStatRows((s) => s.yellowCards),
    redCards: toStatRows((s) => s.redCards),
    mvps: toStatRows((s) => s.mvpCount),
  }
}

export type { RosterRow }
