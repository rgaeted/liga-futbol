// tests/lib/copa-kelme-los-lagos.test.ts
import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  buildFourTeamFinals,
  buildGroupFixture,
  buildSixTeamCierre,
  buildSixTeamSemis,
  detectCupVariantFromCategoryKeys,
  nextFinalesAction,
  parseCupSeedArgs,
  scheduleCupMatches,
  scheduleKnockoutMatches,
  tableFromResults,
} from '@/lib/copa-kelme-los-lagos'

describe('buildGroupFixture', () => {
  it('builds a 4-team round-robin of 6 matches across 3 rounds', () => {
    const fixture = buildGroupFixture('4')
    expect(fixture.categoryKeys).toEqual(['infantil', 'finales'])
    expect(fixture.teamKeys).toEqual(['colo-colo', 'catolica', 'union', 'fv'])
    expect(fixture.matches).toHaveLength(6)
    expect(fixture.matches.map((m) => [m.round, m.slot, m.homeKey, m.awayKey, m.categoryKey])).toEqual([
      [1, 0, 'colo-colo', 'catolica', 'infantil'],
      [1, 1, 'union', 'fv', 'infantil'],
      [2, 0, 'colo-colo', 'union', 'infantil'],
      [2, 1, 'catolica', 'fv', 'infantil'],
      [3, 0, 'colo-colo', 'fv', 'infantil'],
      [3, 1, 'catolica', 'union', 'infantil'],
    ])
  })

  it('builds 6-team groups of 3 with 3 rounds and a bye per group', () => {
    const fixture = buildGroupFixture('6')
    expect(fixture.categoryKeys).toEqual(['grupo-a', 'grupo-b', 'finales'])
    expect(fixture.teamKeys).toEqual([
      'colo-colo',
      'catolica',
      'union',
      'fv',
      'austral',
      'club-6',
    ])
    expect(fixture.matches).toHaveLength(6)
    expect(fixture.matches.map((m) => [m.round, m.slot, m.homeKey, m.awayKey, m.categoryKey])).toEqual([
      [1, 0, 'colo-colo', 'catolica', 'grupo-a'],
      [1, 1, 'fv', 'austral', 'grupo-b'],
      [2, 0, 'colo-colo', 'union', 'grupo-a'],
      [2, 1, 'fv', 'club-6', 'grupo-b'],
      [3, 0, 'catolica', 'union', 'grupo-a'],
      [3, 1, 'austral', 'club-6', 'grupo-b'],
    ])
  })
})

describe('parseCupSeedArgs', () => {
  it('requires variant', () => {
    expect(parseCupSeedArgs(['--phase=grupos', '--start=2026-09-05'])).toEqual({
      ok: false,
      error: 'Usa --variant=4 o --variant=6',
    })
  })

  it('parses variant 4 grupos with start date', () => {
    expect(parseCupSeedArgs(['--variant=4', '--start=2026-09-05'])).toEqual({
      ok: true,
      value: {
        variant: '4',
        phase: 'grupos',
        startDate: '2026-09-05',
        venue: 'Por confirmar',
        dryRun: false,
        resetMatches: false,
      },
    })
  })

  it('parses dry-run, venue and finales', () => {
    expect(
      parseCupSeedArgs([
        '--variant=6',
        '--phase=finales',
        '--start=2026-09-26',
        '--venue=Cancha Municipal',
        '--dry-run',
        '--reset-matches',
      ]),
    ).toEqual({
      ok: true,
      value: {
        variant: '6',
        phase: 'finales',
        startDate: '2026-09-26',
        venue: 'Cancha Municipal',
        dryRun: true,
        resetMatches: true,
      },
    })
  })
})

describe('scheduleCupMatches', () => {
  it('places round 2 seven days later at 11:15 Chile', () => {
    const fixture = buildGroupFixture('4')
    const scheduled = scheduleCupMatches(fixture.matches, '2026-09-05')
    const round2Slot1 = scheduled.find((m) => m.round === 2 && m.slot === 1)
    expect(round2Slot1?.scheduledAt).toBe('2026-09-12T14:15:00.000Z')
  })
})

describe('addDaysIso', () => {
  it('adds 7 days without shifting the calendar day', () => {
    expect(addDaysIso('2026-09-05', 7)).toBe('2026-09-12')
  })
})

describe('tableFromResults', () => {
  it('ranks by points, then goal difference, then goals for', () => {
    const table = tableFromResults(['colo-colo', 'catolica', 'union', 'fv'], [
      { homeKey: 'colo-colo', awayKey: 'catolica', homeGoals: 2, awayGoals: 0 },
      { homeKey: 'union', awayKey: 'fv', homeGoals: 1, awayGoals: 1 },
      { homeKey: 'colo-colo', awayKey: 'union', homeGoals: 0, awayGoals: 0 },
      { homeKey: 'catolica', awayKey: 'fv', homeGoals: 3, awayGoals: 0 },
    ])
    expect(table.map((row) => row.teamKey)).toEqual([
      'colo-colo',
      'catolica',
      'union',
      'fv',
    ])
    expect(table[0]).toMatchObject({ pts: 4, gf: 2, ga: 0 })
    expect(table[1]).toMatchObject({ pts: 3, gf: 3, ga: 2 })
  })
})

describe('buildFourTeamFinals', () => {
  it('pairs 1st vs 2nd in the final and 3rd vs 4th for third place', () => {
    const table = [
      { teamKey: 'colo-colo' as const, pts: 9, gf: 6, ga: 1 },
      { teamKey: 'catolica' as const, pts: 6, gf: 4, ga: 3 },
      { teamKey: 'union' as const, pts: 3, gf: 2, ga: 4 },
      { teamKey: 'fv' as const, pts: 0, gf: 1, ga: 5 },
    ]
    expect(buildFourTeamFinals(table)).toEqual({
      ok: true,
      matches: [
        {
          round: 1,
          slot: 0,
          homeKey: 'union',
          awayKey: 'fv',
          kind: 'tercer-puesto',
          categoryKey: 'finales',
        },
        {
          round: 1,
          slot: 1,
          homeKey: 'colo-colo',
          awayKey: 'catolica',
          kind: 'final',
          categoryKey: 'finales',
        },
      ],
    })
  })

  it('rejects a short table', () => {
    expect(buildFourTeamFinals([{ teamKey: 'colo-colo', pts: 3, gf: 1, ga: 0 }])).toEqual({
      ok: false,
      error: 'La tabla Infantil necesita 4 equipos para armar las finales.',
    })
  })
})

describe('buildSixTeamSemis', () => {
  it('pairs 1st A vs 2nd B and 1st B vs 2nd A', () => {
    const tableA = [
      { teamKey: 'colo-colo' as const, pts: 6, gf: 4, ga: 1 },
      { teamKey: 'catolica' as const, pts: 3, gf: 2, ga: 2 },
      { teamKey: 'union' as const, pts: 0, gf: 0, ga: 3 },
    ]
    const tableB = [
      { teamKey: 'fv' as const, pts: 6, gf: 5, ga: 1 },
      { teamKey: 'austral' as const, pts: 3, gf: 2, ga: 3 },
      { teamKey: 'club-6' as const, pts: 0, gf: 1, ga: 4 },
    ]
    expect(buildSixTeamSemis(tableA, tableB)).toEqual({
      ok: true,
      matches: [
        {
          round: 1,
          slot: 0,
          homeKey: 'colo-colo',
          awayKey: 'austral',
          kind: 'semifinal',
          categoryKey: 'finales',
        },
        {
          round: 1,
          slot: 1,
          homeKey: 'fv',
          awayKey: 'catolica',
          kind: 'semifinal',
          categoryKey: 'finales',
        },
      ],
    })
  })
})

describe('detectCupVariantFromCategoryKeys', () => {
  it('detects 4 and 6 from category keys', () => {
    expect(detectCupVariantFromCategoryKeys(['infantil', 'finales'])).toBe('4')
    expect(detectCupVariantFromCategoryKeys(['grupo-a', 'grupo-b', 'finales'])).toBe('6')
    expect(detectCupVariantFromCategoryKeys(['infantil', 'grupo-a', 'finales'])).toBeNull()
  })
})

describe('nextFinalesAction', () => {
  it('asks for 4-team finals when all group matches are finished and none in finales', () => {
    expect(
      nextFinalesAction({
        variant: '4',
        groupFinished: true,
        finalesFinishedCount: 0,
        finalesTotalCount: 0,
      }),
    ).toBe('four-finals')
  })

  it('asks for 6-team semis when groups are done and finales empty', () => {
    expect(
      nextFinalesAction({
        variant: '6',
        groupFinished: true,
        finalesFinishedCount: 0,
        finalesTotalCount: 0,
      }),
    ).toBe('six-semis')
  })

  it('asks for 6-team cierre when two semis are finished', () => {
    expect(
      nextFinalesAction({
        variant: '6',
        groupFinished: true,
        finalesFinishedCount: 2,
        finalesTotalCount: 2,
      }),
    ).toBe('six-cierre')
  })

  it('waits if groups are not finished', () => {
    expect(
      nextFinalesAction({
        variant: '4',
        groupFinished: false,
        finalesFinishedCount: 0,
        finalesTotalCount: 0,
      }),
    ).toBe('wait-groups')
  })
})

describe('scheduleKnockoutMatches', () => {
  it('schedules knockout matches on the start date at kickoff slots', () => {
    const table = [
      { teamKey: 'colo-colo' as const, pts: 9, gf: 6, ga: 1 },
      { teamKey: 'catolica' as const, pts: 6, gf: 4, ga: 3 },
      { teamKey: 'union' as const, pts: 3, gf: 2, ga: 4 },
      { teamKey: 'fv' as const, pts: 0, gf: 1, ga: 5 },
    ]
    const built = buildFourTeamFinals(table)
    if (!built.ok) throw new Error('expected finals')
    const scheduled = scheduleKnockoutMatches(built.matches, '2026-09-26')
    expect(scheduled[0]?.scheduledAt).toBe('2026-09-26T13:00:00.000Z')
    expect(scheduled[1]?.scheduledAt).toBe('2026-09-26T14:15:00.000Z')
  })
})

describe('buildSixTeamCierre', () => {
  it('sends losers to third place and winners to the final', () => {
    expect(
      buildSixTeamCierre(
        { homeKey: 'colo-colo', awayKey: 'austral', homeGoals: 2, awayGoals: 1 },
        { homeKey: 'fv', awayKey: 'catolica', homeGoals: 0, awayGoals: 3 },
      ),
    ).toEqual({
      ok: true,
      matches: [
        {
          round: 1,
          slot: 0,
          homeKey: 'austral',
          awayKey: 'fv',
          kind: 'tercer-puesto',
          categoryKey: 'finales',
        },
        {
          round: 1,
          slot: 1,
          homeKey: 'colo-colo',
          awayKey: 'catolica',
          kind: 'final',
          categoryKey: 'finales',
        },
      ],
    })
  })

  it('rejects a drawn semi', () => {
    expect(
      buildSixTeamCierre(
        { homeKey: 'colo-colo', awayKey: 'austral', homeGoals: 1, awayGoals: 1 },
        { homeKey: 'fv', awayKey: 'catolica', homeGoals: 2, awayGoals: 0 },
      ),
    ).toEqual({
      ok: false,
      error: 'Las semifinales no pueden ir a finales empatadas. Define un ganador en el marcador.',
    })
  })
})
