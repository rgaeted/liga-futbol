import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'
import type { PublicJornada } from './jornada'

/** Datos de la cabecera del landing para una fecha todos contra todos. */
export type JornadaHeroSummary = {
  dateLabel: string
  timeLabel: string
  categories: number
  teamsPerCategory: number
  formatLabel: string
}

/** Resumen de la fecha más reciente; `null` si no es una jornada todos contra todos. */
export function jornadaHeroSummary(jornada: PublicJornada | undefined): JornadaHeroSummary | null {
  if (!jornada || jornada.kind !== 'league') return null
  const { view } = jornada
  const first = view.matches[0]
  const last = view.matches[view.matches.length - 1]
  if (!first || !last) return null

  const year = new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIMEZONE, year: 'numeric' }).format(
    new Date(jornada.startsAt),
  )
  return {
    dateLabel: `${jornada.dateLabel} de ${year}`,
    timeLabel: `${first.timeLabel.split('–')[0]} a ${last.timeLabel.split('–')[1]} horas`,
    categories: view.tables.length,
    teamsPerCategory: Math.max(0, ...view.tables.map((table) => table.rows.length)),
    formatLabel: view.formatLabel,
  }
}
