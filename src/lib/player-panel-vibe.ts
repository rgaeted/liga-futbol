import type { FormResult } from '@/lib/player-form-streak'
import type { PlayerMatchResults } from '@/lib/player-match-results'

export type PlayerPanelVibe = {
  title: string
  subtitle: string
  emoji: string
}

function trailingWins(form: FormResult[]): number {
  let count = 0
  for (let i = form.length - 1; i >= 0; i--) {
    if (form[i] !== 'W') break
    count++
  }
  return count
}

export function playerPanelVibe(
  form: FormResult[],
  playedCount: number,
  results: PlayerMatchResults,
): PlayerPanelVibe {
  const played = results.won + results.drawn + results.lost
  const winStreak = trailingWins(form)

  if (playedCount === 0) {
    return {
      emoji: '👋',
      title: 'Rookie del lunes',
      subtitle: 'Tu primer partido te espera en la cancha.',
    }
  }

  if (winStreak >= 3) {
    return {
      emoji: '🔥',
      title: 'Modo bestia',
      subtitle: `${winStreak} victorias seguidas. Nadie te frena.`,
    }
  }

  if (form.at(-1) === 'L') {
    return {
      emoji: '💪',
      title: 'Revancha pendiente',
      subtitle: 'El próximo lunes se pone mejor.',
    }
  }

  if (played > 0 && results.won / played >= 0.8) {
    return {
      emoji: '⭐',
      title: 'Canchero VIP',
      subtitle: `${Math.round((results.won / played) * 100)}% de victorias. Respeto.`,
    }
  }

  if (form.at(-1) === 'D') {
    return {
      emoji: '🤝',
      title: 'Empate con sabor',
      subtitle: 'Un punto más cerca de la gloria.',
    }
  }

  if (winStreak >= 2) {
    return {
      emoji: '⚡',
      title: 'En racha',
      subtitle: 'Dos seguidas y contando.',
    }
  }

  return {
    emoji: '⚽',
    title: 'En la lucha',
    subtitle: 'Cada lunes suma a tu leyenda.',
  }
}
