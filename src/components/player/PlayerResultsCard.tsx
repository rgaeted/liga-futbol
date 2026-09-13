import type { PlayerMatchResults } from '@/lib/player-match-results'
import type { PlayerOrgEventStats } from '@/lib/player-org-stats'

type Props = {
  stats: PlayerOrgEventStats
  results: PlayerMatchResults
  mvpCount: number
}

const ITEMS: Array<{
  key: keyof PlayerOrgEventStats | keyof PlayerMatchResults | 'mvpCount'
  label: string
}> = [
  { key: 'goals', label: 'Goles' },
  { key: 'assists', label: 'Asistencias' },
  { key: 'won', label: 'Ganados' },
  { key: 'drawn', label: 'Empatados' },
  { key: 'lost', label: 'Perdidos' },
  { key: 'mvpCount', label: 'MVPs' },
  { key: 'yellowCards', label: 'Amarillas' },
  { key: 'redCards', label: 'Rojas' },
]

function valueFor(
  key: (typeof ITEMS)[number]['key'],
  stats: PlayerOrgEventStats,
  results: PlayerMatchResults,
  mvpCount: number,
): number {
  if (key === 'mvpCount') return mvpCount
  if (key in results) return results[key as keyof PlayerMatchResults]
  return stats[key as keyof PlayerOrgEventStats]
}

export function PlayerResultsCard({ stats, results, mvpCount }: Props) {
  return (
    <section className="rounded-xl border border-kelme-border bg-kelme-surface p-5">
      <h2 className="mb-4 text-lg font-semibold">Tus números</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ITEMS.map(({ key, label }) => (
          <div key={key} className="rounded-lg bg-kelme-gray-100/40 px-3 py-3 text-center">
            <p className="font-display text-2xl font-bold text-kelme-red">
              {valueFor(key, stats, results, mvpCount)}
            </p>
            <p className="text-sm text-kelme-gray-400">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
