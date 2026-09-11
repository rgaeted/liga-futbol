import {
  minutoPrimerTiempo,
  minutoTotalDePartido,
  scoresAfterEvents,
} from '@/lib/badges/context'
import { evaluateMatchPredicate } from '@/lib/badges/predicates'
import { getBadgeDefinition } from '@/lib/badges/registry'
import type { BadgeAward, BadgeCatalogRow, BadgeHistory, BadgeMatch } from '@/lib/badges/types'

function emptyHistory(): BadgeHistory {
  return {
    priorMatches: [],
    alreadyHasPredicateIds: [],
    yearHasCaballero: false,
    yearHasTarjetero: false,
    laterSameYearExists: false,
  }
}

export function evaluarBadgesDePartido(
  match: BadgeMatch,
  catalog: BadgeCatalogRow[],
  historyByPlayerId: Record<string, BadgeHistory>,
): BadgeAward[] {
  const scoresAfter = scoresAfterEvents(match.events)
  const minutoTotal = minutoTotalDePartido(match.events)
  const primerTiempoHasta = minutoPrimerTiempo(match.events)

  let finalScore = { a: 0, b: 0 }
  for (const event of match.events) {
    const score = scoresAfter.get(event.id)
    if (score) finalScore = score
  }

  const sideAName = match.sideAName ?? 'A'
  const sideBName = match.sideBName ?? 'B'

  const activeEvaluable = catalog.filter((row) => {
    if (!row.isActive) return false
    try {
      return getBadgeDefinition(row.predicateId).evaluable
    } catch {
      return false
    }
  })

  const awards: BadgeAward[] = []

  for (const rosterRow of match.roster) {
    const history = historyByPlayerId[rosterRow.playerId] ?? emptyHistory()

    for (const row of activeEvaluable) {
      const definition = getBadgeDefinition(row.predicateId)

      if (
        !definition.repeatable &&
        definition.scope !== 'year' &&
        history.alreadyHasPredicateIds.includes(row.predicateId)
      ) {
        continue
      }

      const context = evaluateMatchPredicate(row.predicateId, {
        match,
        playerId: rosterRow.playerId,
        rosterRow,
        history,
        thresholds: row.thresholds,
        minutoTotal,
        primerTiempoHasta,
        scoresAfter,
        finalScore,
        sideAName,
        sideBName,
      })

      if (context) {
        awards.push({
          predicateId: row.predicateId,
          playerId: rosterRow.playerId,
          context,
        })
      }
    }
  }

  return awards
}
