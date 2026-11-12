import type { FixtureStatus } from './types'
import type { FixtureView } from './view'

type Cell = string | number
export type ExportSheet = { header: string[]; rows: Cell[][] }

const STATUS_LABELS: Record<FixtureStatus, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En juego',
  FINAL: 'Finalizado',
  CANCELLED: 'Anulado',
}

const MATCH_HEADER = [
  'Hora', 'Cancha', 'Categoría', 'Fase', 'Local', 'Goles local', 'Goles visita', 'Visita', 'Estado', 'Penales',
]
const STANDINGS_HEADER = ['Tabla', '#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS']

/** Datos del fixture listos para volcar a una planilla: partidos y tablas de posiciones. */
export function fixtureExportSheets(view: FixtureView): { matches: ExportSheet; standings: ExportSheet } {
  const matches: Cell[][] = view.matches.map((match) => {
    const showScore = match.status === 'FINAL' || match.status === 'IN_PROGRESS'
    const penalties =
      match.penaltyHome != null && match.penaltyAway != null ? `${match.penaltyHome}–${match.penaltyAway}` : ''
    return [
      match.timeLabel,
      match.court,
      match.category.replace('-', '–'),
      match.phaseLabel,
      match.home.name,
      showScore ? match.homeGoals : '',
      showScore ? match.awayGoals : '',
      match.away.name,
      STATUS_LABELS[match.status],
      penalties,
    ]
  })

  const standings: Cell[][] = view.tables.flatMap((table) =>
    table.rows.map((row) => [
      table.title, row.rank, row.name, row.pj, row.pg, row.pe, row.pp, row.gf, row.gc, row.dg, row.pts,
    ]),
  )

  return {
    matches: { header: MATCH_HEADER, rows: matches },
    standings: { header: STANDINGS_HEADER, rows: standings },
  }
}

export function fixtureExportFileName(organizationSlug: string): string {
  const safe = organizationSlug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `fixture-${safe || 'liga'}.xlsx`
}

/** Archivo .xlsx con las hojas "Partidos" y "Posiciones". */
export async function fixtureWorkbookBuffer(view: FixtureView): Promise<Buffer> {
  const { default: ExcelJS } = await import('exceljs')
  const { matches, standings } = fixtureExportSheets(view)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LigaLab'
  workbook.title = view.seasonName

  const addSheet = (name: string, sheet: ExportSheet, widths: number[]) => {
    const worksheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] })
    worksheet.addRow(sheet.header)
    for (const row of sheet.rows) worksheet.addRow(row)
    worksheet.getRow(1).font = { bold: true }
    widths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width
    })
  }

  addSheet('Partidos', matches, [14, 8, 12, 14, 28, 12, 12, 28, 12, 10])
  addSheet('Posiciones', standings, [24, 5, 28, 6, 6, 6, 6, 6, 6, 6, 6])

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
