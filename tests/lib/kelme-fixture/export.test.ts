import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { fixtureExportSheets, fixtureWorkbookBuffer, fixtureExportFileName } from '@/lib/kelme-fixture/export'
import type { FixtureView, FixtureViewMatch } from '@/lib/kelme-fixture/view'

function match(overrides: Partial<FixtureViewMatch> & { id: string }): FixtureViewMatch {
  return {
    code: overrides.id,
    category: '2017-2016',
    phase: 'GROUP',
    phaseLabel: 'Grupo A',
    group: 'A',
    court: 1,
    startAt: '2026-11-15T12:00:00.000Z',
    endAt: '2026-11-15T12:35:00.000Z',
    timeLabel: '09:00–09:35',
    home: { teamId: 'a', name: 'Unión Española', color: null, crestUrl: null, pending: false },
    away: { teamId: 'b', name: 'Palestino', color: null, crestUrl: null, pending: false },
    homeGoals: 2,
    awayGoals: 1,
    status: 'FINAL',
    decidedBy: null,
    penaltyHome: null,
    penaltyAway: null,
    updatedAt: '2026-11-15T13:00:00.000Z',
    ...overrides,
  }
}

const view = {
  seasonId: 's1',
  seasonName: 'KELME CUP Los Lagos 2026',
  matches: [
    match({ id: 'm1' }),
    match({
      id: 'm2',
      court: 3,
      phase: 'FINAL',
      phaseLabel: 'Final',
      group: null,
      status: 'SCHEDULED',
      homeGoals: 0,
      awayGoals: 0,
      home: { teamId: null, name: 'Por definir (1.º Grupo A)', color: null, crestUrl: null, pending: true },
      away: { teamId: null, name: 'Por definir (1.º Grupo B)', color: null, crestUrl: null, pending: true },
    }),
    match({ id: 'm3', status: 'FINAL', penaltyHome: 4, penaltyAway: 3, homeGoals: 1, awayGoals: 1 }),
  ],
  tables: [
    {
      key: 'A',
      title: 'Grupo A · 2017–2016',
      category: '2017-2016',
      rows: [
        { teamId: 'a', name: 'Unión Española', rank: 1, tied: false, pj: 2, pg: 2, pe: 0, pp: 0, gf: 5, gc: 1, dg: 4, pts: 6, color: null, crestUrl: null },
      ],
      complete: false,
      definitive: false,
      pendingTie: false,
    },
  ],
  positions: [],
} as unknown as FixtureView

describe('fixtureExportSheets', () => {
  const { matches, standings } = fixtureExportSheets(view)

  it('lista los partidos con hora, cancha, categoría, fase, equipos y resultado', () => {
    expect(matches.header).toEqual([
      'Hora', 'Cancha', 'Categoría', 'Fase', 'Local', 'Goles local', 'Goles visita', 'Visita', 'Estado', 'Penales',
    ])
    expect(matches.rows[0]).toEqual(['09:00–09:35', 1, '2017–2016', 'Grupo A', 'Unión Española', 2, 1, 'Palestino', 'Finalizado', ''])
  })

  it('deja el marcador vacío en partidos programados y muestra los penales', () => {
    expect(matches.rows[1].slice(4, 8)).toEqual(['Por definir (1.º Grupo A)', '', '', 'Por definir (1.º Grupo B)'])
    expect(matches.rows[1][8]).toBe('Programado')
    expect(matches.rows[2][9]).toBe('4–3')
  })

  it('incluye la tabla de posiciones de cada grupo', () => {
    expect(standings.header).toEqual(['Tabla', '#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS'])
    expect(standings.rows[0]).toEqual(['Grupo A · 2017–2016', 1, 'Unión Española', 2, 2, 0, 0, 5, 1, 4, 6])
  })
})

describe('fixtureWorkbookBuffer', () => {
  it('genera un archivo de Excel con las hojas Partidos y Posiciones', async () => {
    const buffer = await fixtureWorkbookBuffer(view)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Partidos', 'Posiciones'])
    const sheet = workbook.getWorksheet('Partidos')!
    expect(sheet.getRow(1).getCell(1).value).toBe('Hora')
    expect(sheet.getRow(2).getCell(5).value).toBe('Unión Española')
    expect(sheet.rowCount).toBe(4)
  })

  it('nombra el archivo con la liga y sin caracteres problemáticos', () => {
    expect(fixtureExportFileName('kelme')).toBe('fixture-kelme.xlsx')
    expect(fixtureExportFileName('Liga X/../y')).toBe('fixture-liga-x-y.xlsx')
  })
})
